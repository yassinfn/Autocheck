'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Check, Lock, Scale, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { saveAnalysis, getOrCreateSessionId, clearRowId, restoreRowId } from '@/lib/saveAnalysis'
import type { AnalyseResult } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleStatus = 'done' | 'active' | 'upcoming' | 'locked'

interface ModuleProps {
  id: number
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  status: ModuleStatus
  expanded: boolean
  onToggle: (id: number) => void
  children?: React.ReactNode
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ModuleStatus, { label: string; badgeBg: string; badgeText: string }> = {
  done:     { label: 'Terminé',     badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
  active:   { label: 'En cours',    badgeBg: 'bg-blue-100',  badgeText: 'text-blue-700'  },
  upcoming: { label: 'À venir',     badgeBg: 'bg-slate-100', badgeText: 'text-slate-600' },
  locked:   { label: 'Verrouillé',  badgeBg: 'bg-slate-100', badgeText: 'text-slate-500' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>
    if (typeof o.titre === 'string') return o.detail ? `${o.titre} — ${o.detail}` : o.titre
    if (typeof o.title === 'string') return o.title
  }
  return String(item ?? '')
}

function scoreColor(score: number): string {
  if (score >= 75) return 'rgb(22 163 74)'
  if (score >= 60) return 'rgb(202 138 4)'
  if (score >= 45) return 'rgb(234 88 12)'
  return 'rgb(220 38 38)'
}

function scoreTextClass(score: number): string {
  if (score >= 75) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 45) return 'text-orange-600'
  return 'text-red-600'
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

// ─── Module component ─────────────────────────────────────────────────────────

function Module({ id, icon, iconBg, title, subtitle, status, expanded, onToggle, children }: ModuleProps) {
  const cfg = STATUS_CFG[status]
  const isLocked = status === 'locked'

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden${isLocked ? ' opacity-50' : ''}`}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => { if (!isLocked) onToggle(id) }}
        disabled={isLocked}
        className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-colors${isLocked ? ' cursor-not-allowed' : ' hover:bg-slate-50'}`}
      >
        {/* Circle icon */}
        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>

        {/* Title + badge + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-slate-900">{title}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Right icon */}
        {isLocked
          ? <Lock size={16} className="shrink-0 text-slate-400" />
          : <ChevronRight
              size={18}
              className={`shrink-0 text-slate-400 transition-transform duration-200${expanded ? ' rotate-90' : ''}`}
            />
        }
      </button>

      {/* Accordion content */}
      <div className={`transition-all duration-200 overflow-hidden${expanded ? ' max-h-[1200px]' : ' max-h-0'}`}>
        {children && (
          <div className="border-t border-slate-200 px-5 py-5">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className ?? ''}`} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [inputValue, setInputValue] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

  // ── Load existing analysis on mount ─────────────────────────────────────────
  useEffect(() => {
    const idFromUrl = searchParams.get('id')
    const idFromStorage = typeof window !== 'undefined' ? localStorage.getItem('autocheck_row_id') : null
    const rowId = idFromUrl ?? idFromStorage

    if (!rowId) {
      setExpandedModule(2)
      return
    }

    ;(async () => {
      try {
        const { data, error: err } = await supabase
          .from('analyses')
          .select('analysis_data, url_annonce')
          .eq('id', rowId)
          .single()

        if (err || !data?.analysis_data) {
          setExpandedModule(2)
          return
        }

        const loaded = data.analysis_data as AnalyseResult
        setAnalyse(loaded)
        setInputValue((data.url_annonce as string | null) ?? '')
        restoreRowId(rowId)
        if (!idFromUrl) router.replace(`/dashboard?id=${rowId}`)
        setExpandedModule(1)
      } catch {
        setExpandedModule(2)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleToggle(id: number) {
    if (expandedModule !== id) setExpandedModule(id)
  }

  async function handleAnalyser() {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    setIsAnalyzing(true)
    setError(null)
    setAnalyse(null)
    setExpandedModule(null)

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annonce: trimmed }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? `Erreur ${res.status}`)
      }

      const result: AnalyseResult = await res.json()
      setAnalyse(result)

      const sessionId = getOrCreateSessionId()
      await saveAnalysis({
        sessionId,
        analyse: result,
        urlAnnonce: isUrl(trimmed) ? trimmed : undefined,
        stepReached: 1,
      })

      const newRowId = typeof window !== 'undefined' ? localStorage.getItem('autocheck_row_id') : null
      if (newRowId) router.replace(`/dashboard?id=${newRowId}`)

      setExpandedModule(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setExpandedModule(2)
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleRecommencer() {
    if (!window.confirm('Recommencer une nouvelle analyse ? Les données actuelles seront effacées.')) return
    clearRowId()
    setAnalyse(null)
    setInputValue('')
    setError(null)
    setExpandedModule(2)
    router.replace('/dashboard')
  }

  // ── Derived display values ────────────────────────────────────────────────────

  const score = analyse?.score.total ?? null
  const vehicule = analyse?.vehicule ?? null
  const detection = analyse?.detection ?? null

  const module1Status: ModuleStatus = analyse ? 'done' : isAnalyzing ? 'active' : 'upcoming'
  const module2Status: ModuleStatus = analyse ? 'active' : 'locked'

  const module1Subtitle = analyse
    ? `Score ${score}/100 · ${analyse.score.pointsAttention.length} risques détectés`
    : isAnalyzing
    ? 'Analyse en cours…'
    : "En attente d'une annonce"

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/analyse" className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">AC</span>
          </a>
          <span className="font-bold text-slate-900">AutoCheck</span>

          <div className="ml-auto flex items-center gap-4">
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              Historique
            </a>
            <button type="button" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              PDF
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── INPUT ZONE ────────────────────────────────────────────────────── */}
        <div>
          <p className="text-slate-500 text-sm mb-3">Vérifie une annonce auto en 5 secondes.</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Colle une URL d&apos;annonce ou le texte de l&apos;annonce
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !isAnalyzing) handleAnalyser() }}
                placeholder="https://www.leboncoin.fr/... ou texte de l'annonce"
                disabled={isAnalyzing}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleAnalyser}
                disabled={isAnalyzing || !inputValue.trim()}
                className="w-full sm:w-auto sm:shrink-0 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing && <Loader2 size={14} className="animate-spin" />}
                {isAnalyzing ? 'Analyse…' : 'Analyser'}
              </button>
            </div>
            {inputValue && isUrl(inputValue) && (
              <p className="text-xs text-blue-600 flex items-center gap-1.5">
                <span className="text-blue-500 font-bold">ℹ</span>
                URL détectée — LeBonCoin sera scrapé automatiquement
              </p>
            )}
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                {error}
              </p>
            )}
          </div>

          <div className="text-center mt-3">
            <button
              type="button"
              className="text-sm text-slate-500 border border-slate-300 rounded-lg px-4 py-2 hover:bg-white transition-colors"
            >
              Pas d&apos;annonce ? Saisir manuellement →
            </button>
          </div>
        </div>

        {/* ── 3 KEY CARDS ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Véhicule */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Véhicule</p>
            {isAnalyzing ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : vehicule ? (
              <>
                <p className="text-base font-bold text-slate-900">{vehicule.marque} {vehicule.modele}</p>
                <p className="text-sm text-slate-500 mt-0.5">{vehicule.annee} · {vehicule.kilometrage.toLocaleString('fr-FR')} km</p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-slate-400">—</p>
                <p className="text-sm text-slate-400 mt-0.5">Aucune analyse</p>
              </>
            )}
          </div>

          {/* Score */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Score</p>
            {isAnalyzing ? (
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <Skeleton className="w-14 h-14 rounded-full" />
                <Skeleton className="h-4 w-8" />
              </div>
            ) : score !== null ? (
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <div className="relative shrink-0 w-14 h-14">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(241 245 249)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={scoreColor(score)} strokeWidth="10"
                      strokeDasharray={`${score * 2.64} 264`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-base font-bold leading-none ${scoreTextClass(score)}`}>{score}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-400">/100</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <div className="relative shrink-0 w-14 h-14">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(241 245 249)" strokeWidth="10" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-bold text-slate-300 leading-none">—</span>
                  </div>
                </div>
                <span className="text-sm text-slate-400">/100</span>
              </div>
            )}
          </div>

          {/* Prix */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Prix</p>
            {isAnalyzing ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : vehicule && detection ? (
              <>
                <p className="text-base font-bold text-slate-900">
                  {vehicule.prix.toLocaleString('fr-FR')} {detection.symbole}
                </p>
                {analyse?.depenses && (
                  <p className="text-sm text-orange-600 font-medium mt-0.5">
                    Dépenses : {analyse.depenses.totalObligatoiresMin.toLocaleString('fr-FR')} – {analyse.depenses.totalObligatoiresMax.toLocaleString('fr-FR')} {detection.symbole}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-base font-bold text-slate-400">—</p>
                <p className="text-sm text-slate-400 mt-0.5">En attente</p>
              </>
            )}
          </div>

        </div>

        {/* ── ACCORDION MODULES ─────────────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Module 1 — Analyse de l'annonce */}
          <Module
            id={1}
            icon={
              isAnalyzing
                ? <Loader2 size={16} className="text-blue-600 animate-spin" />
                : analyse
                ? <Check size={16} className="text-green-600" />
                : <span className="text-sm font-bold text-slate-400">1</span>
            }
            iconBg={isAnalyzing ? 'bg-blue-100' : analyse ? 'bg-green-100' : 'bg-slate-100'}
            title="Analyse de l'annonce"
            subtitle={module1Subtitle}
            status={module1Status}
            expanded={expandedModule === 1}
            onToggle={handleToggle}
          >
            {analyse && (
              <div className="space-y-3">
                {analyse.score.ressentGlobal && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {analyse.score.ressentGlobal}
                  </p>
                )}
                {analyse.score.pointsAttention.length > 0 ? (
                  <div className="space-y-2">
                    {analyse.score.pointsAttention.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-100">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-500" />
                        <span>{normalize(risk)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2.5 border border-green-100">
                    Aucun point d&apos;attention détecté.
                  </p>
                )}
              </div>
            )}
          </Module>

          {/* Module 2 — Questions au vendeur */}
          <Module
            id={2}
            icon={<span className={`text-sm font-bold ${analyse ? 'text-blue-600' : 'text-slate-400'}`}>2</span>}
            iconBg={analyse ? 'bg-blue-100' : 'bg-slate-200'}
            title="Questions au vendeur"
            subtitle="+15 pts de précision · ~ 2 min"
            status={module2Status}
            expanded={expandedModule === 2}
            onToggle={handleToggle}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                5 questions à poser. Colle ensuite les réponses ci-dessous.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                {[
                  "Avez-vous le carnet d'entretien complet avec factures ?",
                  "Le FAP a-t-il déjà été remplacé ou nettoyé ?",
                  "Quand a été fait le dernier contrôle technique ?",
                ].map((q, i) => (
                  <p key={i} className="text-sm font-medium text-slate-800">
                    {i + 1}. {q}
                  </p>
                ))}
              </div>

              <textarea
                placeholder="Colle ici les réponses du vendeur..."
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              />

              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  className="w-full sm:w-auto py-2.5 px-4 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Passer cette étape
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Analyser les réponses
                </button>
              </div>
            </div>
          </Module>

          {/* Module 3 — Inspection sur place */}
          <Module
            id={3}
            icon={<span className="text-sm font-bold text-slate-500">3</span>}
            iconBg="bg-slate-200"
            title="Inspection sur place"
            subtitle="+20 pts de précision · ~ 15 min"
            status="locked"
            expanded={expandedModule === 3}
            onToggle={handleToggle}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Scénario d&apos;inspection sur-mesure : 12 étapes niveau 1, 8 étapes niveau 2.
              </p>
              <button
                type="button"
                className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Commencer l&apos;inspection
              </button>
            </div>
          </Module>

          {/* Module 4 — Décision finale (locked) */}
          <Module
            id={4}
            icon={<Scale size={16} className="text-slate-400" />}
            iconBg="bg-slate-100"
            title="Décision finale"
            subtitle="Disponible dès qu'une étape est complétée"
            status="locked"
            expanded={false}
            onToggle={handleToggle}
          />
        </div>

        {/* ── BOTTOM BUTTONS ────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2 pb-8">
          <button
            type="button"
            onClick={handleRecommencer}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Recommencer
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            Télécharger PDF
          </button>
        </div>

      </main>
    </div>
  )
}
