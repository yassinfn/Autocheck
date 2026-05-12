'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Check, Lock, Scale, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { saveAnalysis, getOrCreateSessionId, clearRowId, restoreRowId } from '@/lib/saveAnalysis'
import type { AnalyseResult, ContactQuestionsResult, ContactVerdict, VisiteData, DecisionFinale } from '@/types'
import VerdictBlock from '@/components/contact/VerdictBlock'
import InspectionOverlay from '@/components/dashboard/InspectionOverlay'
import DecisionBlock from '@/components/dashboard/DecisionBlock'
import AnalyseDetails from '@/components/dashboard/AnalyseDetails'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleStatus = 'done' | 'active' | 'upcoming' | 'locked' | 'preparing' | 'skipped' | 'analysing'

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
  done:      { label: 'Terminé',      badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
  active:    { label: 'En cours',     badgeBg: 'bg-blue-100',  badgeText: 'text-blue-700'  },
  upcoming:  { label: 'À venir',      badgeBg: 'bg-slate-100', badgeText: 'text-slate-600' },
  locked:    { label: 'Verrouillé',   badgeBg: 'bg-slate-100', badgeText: 'text-slate-500' },
  preparing: { label: 'Préparation…', badgeBg: 'bg-blue-100',  badgeText: 'text-blue-700'  },
  skipped:   { label: 'Sauté',        badgeBg: 'bg-slate-100', badgeText: 'text-slate-400' },
  analysing: { label: 'Analyse…',     badgeBg: 'bg-blue-100',  badgeText: 'text-blue-700'  },
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
      <button
        type="button"
        onClick={() => { if (!isLocked) onToggle(id) }}
        disabled={isLocked}
        className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-colors${isLocked ? ' cursor-not-allowed' : ' hover:bg-slate-50'}`}
      >
        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-slate-900">{title}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {isLocked
          ? <Lock size={16} className="shrink-0 text-slate-400" />
          : <ChevronRight size={18} className={`shrink-0 text-slate-400 transition-transform duration-200${expanded ? ' rotate-90' : ''}`} />
        }
      </button>
      <div className={`transition-all duration-200 overflow-hidden${expanded ? ' max-h-[6000px]' : ' max-h-0'}`}>
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

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Module 1 — Analyse
  const [inputValue, setInputValue] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

  // Module 2 — Questions au vendeur
  const [questions, setQuestions] = useState<ContactQuestionsResult | null>(null)
  // Module 3 — Inspection
  const [inspectionOpen, setInspectionOpen] = useState(false)
  const [visite, setVisite] = useState<VisiteData | null>(null)
  const [reponsesVendeur, setReponsesVendeur] = useState('')
  const [contactVerdict, setContactVerdict] = useState<ContactVerdict | null>(null)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [isAnalyzingReponses, setIsAnalyzingReponses] = useState(false)
  const [contactSkipped, setContactSkipped] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [showDecisionHint, setShowDecisionHint] = useState(false)

  // Module 4 — Décision finale
  const [decision, setDecision] = useState<DecisionFinale | null>(null)
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  // ── Load existing data on mount ──────────────────────────────────────────────
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
          .select('analysis_data, url_annonce, contact_data, questions_data, contact_responses, visit_data')
          .eq('id', rowId)
          .single()

        if (err || !data?.analysis_data) {
          setExpandedModule(2)
          return
        }

        const loaded = data.analysis_data as AnalyseResult
        restoreRowId(rowId)
        if (!idFromUrl) router.replace(`/dashboard?id=${rowId}`)
        setInputValue((data.url_annonce as string | null) ?? '')

        const hasVerdict = !!data.contact_data
        const hasQuestions = !!data.questions_data
        const skipped = typeof window !== 'undefined'
          && localStorage.getItem('autocheck_contact_skipped') === 'true'

        if (hasVerdict) {
          setContactVerdict(data.contact_data as ContactVerdict)
          localStorage.setItem('autocheck_contact', JSON.stringify(data.contact_data))
        }
        if (hasQuestions) {
          setQuestions(data.questions_data as ContactQuestionsResult)
          localStorage.setItem('autocheck_questions', JSON.stringify(data.questions_data))
        }
        if (data.contact_responses) {
          setReponsesVendeur(data.contact_responses as string)
        }
        if (skipped && !hasVerdict) {
          setContactSkipped(true)
        }

        const visitFromSupabase = data.visit_data as VisiteData | null
        if (visitFromSupabase?.steps?.length) {
          setVisite(visitFromSupabase)
          localStorage.setItem('autocheck_visite', JSON.stringify(visitFromSupabase))
        } else {
          const savedVisite = typeof window !== 'undefined' ? localStorage.getItem('autocheck_visite') : null
          if (savedVisite) {
            try { setVisite(JSON.parse(savedVisite) as VisiteData) } catch {}
          }
        }

        // Set analyse last so auto-generate useEffect fires after all contact state is batched
        setAnalyse(loaded)

        const hasVisite = !!(visitFromSupabase?.steps?.length || localStorage.getItem('autocheck_visite'))
        if (hasVisite)         setExpandedModule(3)
        else if (hasVerdict)   setExpandedModule(1)
        else if (skipped)      setExpandedModule(3)
        else if (hasQuestions) setExpandedModule(2)
        else                   setExpandedModule(1)
      } catch {
        setExpandedModule(2)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Hydrate decision from localStorage on mount ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('autocheck_decision')
    if (saved) try { setDecision(JSON.parse(saved) as DecisionFinale) } catch {}
  }, [])

  // ── Auto-generate questions whenever a fresh analysis lands ──────────────────
  useEffect(() => {
    if (!analyse) return
    if (isAnalyzing) return  // partial result during stream — wait for full
    if (questions !== null || contactVerdict !== null || contactSkipped || isGeneratingQuestions) return
    handleGenerateQuestions(analyse)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyse, isAnalyzing])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleToggle(id: number) {
    if (expandedModule !== id) setExpandedModule(id)
  }

  async function handleGenerateQuestions(a: AnalyseResult) {
    if (isGeneratingQuestions) return
    setIsGeneratingQuestions(true)
    setContactError(null)
    setExpandedModule(2)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'questions', analyse: a }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error((result as { error?: string }).error ?? 'Erreur lors de la génération')
      setQuestions(result as ContactQuestionsResult)
      localStorage.setItem('autocheck_questions', JSON.stringify(result))
      await saveAnalysis({ sessionId: getOrCreateSessionId(), questions: result as ContactQuestionsResult })
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Impossible de générer les questions')
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  async function handleAnalyserReponses() {
    if (!analyse || reponsesVendeur.trim().length < 10) return
    setIsAnalyzingReponses(true)
    setContactError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyse', analyse, reponses: reponsesVendeur, images: [] }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error((result as { error?: string }).error ?? "Erreur lors de l'analyse")
      const verdict = result as ContactVerdict
      setContactVerdict(verdict)
      localStorage.setItem('autocheck_contact', JSON.stringify(verdict))
      localStorage.setItem('autocheck_contact_responses', reponsesVendeur)
      await saveAnalysis({
        sessionId: getOrCreateSessionId(),
        contactVerdict: verdict,
        contactResponses: reponsesVendeur,
        stepReached: 2,
      })
      setExpandedModule(3)
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Erreur lors de l'analyse des réponses")
    } finally {
      setIsAnalyzingReponses(false)
    }
  }

  async function handleSkipContact() {
    if (!analyse) return
    setContactSkipped(true)
    localStorage.setItem('autocheck_contact_skipped', 'true')
    setExpandedModule(3)
    await saveAnalysis({ sessionId: getOrCreateSessionId(), stepReached: 2 })
  }

  function handleModifyResponses() {
    setContactVerdict(null)
    setShowDecisionHint(false)
    localStorage.removeItem('autocheck_contact')
    setExpandedModule(2)
  }

  function handleRegenerateQuestions() {
    if (!analyse) return
    localStorage.removeItem('autocheck_questions')
    setQuestions(null)
    setReponsesVendeur('')
    setContactVerdict(null)
    setShowDecisionHint(false)
    handleGenerateQuestions(analyse)
  }

  async function handleAnalyser() {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    setIsAnalyzing(true)
    setError(null)
    setAnalyse(null)
    setExpandedModule(null)
    setQuestions(null)
    setReponsesVendeur('')
    setContactVerdict(null)
    setContactSkipped(false)
    setContactError(null)
    setShowDecisionHint(false)
    setVisite(null)
    setDecision(null)
    localStorage.removeItem('autocheck_questions')
    localStorage.removeItem('autocheck_contact')
    localStorage.removeItem('autocheck_contact_responses')
    localStorage.removeItem('autocheck_contact_skipped')
    localStorage.removeItem('autocheck_visite')
    localStorage.removeItem('autocheck_decision')

    try {
      let annonceText = trimmed
      const sourceUrl = isUrl(trimmed) ? trimmed : undefined

      if (isUrl(trimmed)) {
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        })

        const scrapeData = await scrapeRes.json().catch(() => ({}))

        if (!scrapeRes.ok) {
          throw new Error(
            (scrapeData as { message?: string; error?: string }).message ??
            (scrapeData as { message?: string; error?: string }).error ??
            "Impossible de récupérer le contenu de cette URL. Colle directement le texte de l'annonce dans le champ."
          )
        }

        if (!(scrapeData as { text?: string }).text) {
          throw new Error("Impossible de récupérer le contenu de cette URL. Colle directement le texte de l'annonce dans le champ.")
        }

        annonceText = (scrapeData as { text: string }).text
      }

      const res = await fetch('/api/analyse/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annonce: annonceText, sourceUrl }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let partial: Omit<AnalyseResult, 'reputation'> | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          let event: { type: string; payload: unknown }
          try { event = JSON.parse(part.slice(6)) } catch { continue }

          if (event.type === 'score') {
            // Progressive UX: fill the 3 cards immediately — isAnalyzing stays true
            partial = event.payload as Omit<AnalyseResult, 'reputation'>
            setAnalyse({ ...partial } as unknown as AnalyseResult)
          } else if (event.type === 'reputation') {
            if (!partial) continue
            const fullResult: AnalyseResult = {
              ...partial,
              reputation: event.payload as AnalyseResult['reputation'],
            }
            setAnalyse(fullResult)
            const sessionId = getOrCreateSessionId()
            await saveAnalysis({ sessionId, analyse: fullResult, urlAnnonce: sourceUrl, stepReached: 1 })
            const newRowId = typeof window !== 'undefined' ? localStorage.getItem('autocheck_row_id') : null
            if (newRowId) router.replace(`/dashboard?id=${newRowId}`)
            setExpandedModule(1)
          } else if (event.type === 'error') {
            throw new Error((event.payload as { message: string }).message)
          }
        }
      }

      // Safety: stream closed without reputation (edge-runtime cold start, etc.)
      if (!partial) throw new Error("L'analyse n'a pas pu être complétée. Réessayez.")
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
    setQuestions(null)
    setReponsesVendeur('')
    setContactVerdict(null)
    setIsGeneratingQuestions(false)
    setIsAnalyzingReponses(false)
    setContactSkipped(false)
    setContactError(null)
    setShowDecisionHint(false)
    setVisite(null)
    setDecision(null)
    setInspectionOpen(false)
    localStorage.removeItem('autocheck_questions')
    localStorage.removeItem('autocheck_contact')
    localStorage.removeItem('autocheck_contact_responses')
    localStorage.removeItem('autocheck_contact_skipped')
    localStorage.removeItem('autocheck_visite')
    localStorage.removeItem('autocheck_decision')
    router.replace('/dashboard')
  }

  async function handleLancerDecision(forceRefresh = false) {
    if (!analyse) return
    if (!forceRefresh && decision) {
      setExpandedModule(4)
      return
    }
    setDecisionLoading(true)
    setDecisionError(null)
    setExpandedModule(4)
    try {
      const res = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analyse,
          visite: visite ?? undefined,
          contactVerdict: contactVerdict ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Erreur')
      const result = data as DecisionFinale
      setDecision(result)
      localStorage.setItem('autocheck_decision', JSON.stringify(result))
      await saveAnalysis({ sessionId: getOrCreateSessionId(), decision: result, stepReached: 4 })
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'Erreur lors de la génération')
    } finally {
      setDecisionLoading(false)
    }
  }

  function handleRecalculer() {
    setDecision(null)
    localStorage.removeItem('autocheck_decision')
    handleLancerDecision(true)
  }

  // ── Derived display values ────────────────────────────────────────────────────

  const score = contactVerdict?.scoreTotal ?? analyse?.score.total ?? null
  const vehicule = analyse?.vehicule ?? null
  const detection = analyse?.detection ?? null

  const module1Status: ModuleStatus = analyse ? 'done' : isAnalyzing ? 'active' : 'upcoming'

  const module2Status: ModuleStatus = !analyse
    ? 'locked'
    : isGeneratingQuestions
    ? 'preparing'
    : contactVerdict
    ? 'done'
    : contactSkipped
    ? 'skipped'
    : isAnalyzingReponses
    ? 'analysing'
    : 'active'

  const visitSteps = visite?.steps ?? []
  const visitDone = visitSteps.length > 0 && visitSteps.every(s => s.statut !== 'pending')
  const visitInProgress = visitSteps.length > 0 && !visitDone
  const visitOk = visitSteps.filter(s => s.statut === 'ok').length
  const visitNok = visitSteps.filter(s => s.statut === 'nok').length
  const visitPasse = visitSteps.filter(s => s.statut === 'passe').length
  const visitCompleted = visitSteps.filter(s => s.statut !== 'pending').length

  const module3Unlocked = contactVerdict !== null || contactSkipped
  const module3Status: ModuleStatus = !module3Unlocked
    ? 'locked'
    : visitDone
    ? 'done'
    : 'active'

  const labelMap: Record<string, string> = { acheter: 'Achat recommandé', negocier: 'Négociation', refuser: 'Déconseillé' }
  const module4Status: ModuleStatus = !analyse ? 'locked' : decision ? 'done' : 'active'
  const module4Subtitle = !analyse
    ? "Disponible après l'analyse"
    : decision
    ? `Score ${decision.scoreGlobal}/100 · ${labelMap[decision.decision] ?? decision.decision}`
    : "Recommandation IA basée sur toutes les étapes"

  const module3Subtitle = visitDone
    ? `${visitSteps.length} étapes · ${visitNok} problème${visitNok > 1 ? 's' : ''} détecté${visitNok > 1 ? 's' : ''}`
    : visitInProgress
    ? `${visitCompleted}/${visitSteps.length} étapes complétées`
    : '+20 pts de précision · ~ 15 min'

  const module1Subtitle = analyse
    ? `Score ${analyse.score.total}/100 · ${analyse.score.pointsAttention.length} risques détectés`
    : isAnalyzing
    ? 'Analyse en cours…'
    : "En attente d'une annonce"

  const module2Subtitle = !analyse
    ? '+15 pts de précision · ~ 2 min'
    : isGeneratingQuestions
    ? 'Génération des questions personnalisées…'
    : contactVerdict
    ? `Score ${contactVerdict.scoreTotal}/100 · ${contactVerdict.alertes.length} ${contactVerdict.alertes.length > 1 ? 'signaux' : 'signal'} d'alerte`
    : contactSkipped
    ? 'Étape ignorée'
    : isAnalyzingReponses
    ? 'Analyse des réponses en cours…'
    : questions
    ? `${questions.questions.length} questions prêtes`
    : '+15 pts de précision · ~ 2 min'

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/dashboard" className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">AC</span>
          </a>
          <span className="font-bold text-slate-900">AutoCheck</span>
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
              <div className="space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
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

          {/* Score — updated by contactVerdict when present */}
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
              <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-3/4" /></div>
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
            {analyse && <AnalyseDetails analyse={analyse} />}
          </Module>

          {/* Module 2 — Questions au vendeur */}
          <Module
            id={2}
            icon={
              isGeneratingQuestions || isAnalyzingReponses
                ? <Loader2 size={16} className="text-blue-600 animate-spin" />
                : contactVerdict
                ? <Check size={16} className="text-green-600" />
                : <span className={`text-sm font-bold ${analyse && !contactSkipped ? 'text-blue-600' : 'text-slate-400'}`}>2</span>
            }
            iconBg={
              contactVerdict ? 'bg-green-100'
              : (isGeneratingQuestions || isAnalyzingReponses || (analyse && !contactSkipped)) ? 'bg-blue-100'
              : 'bg-slate-200'
            }
            title="Questions au vendeur"
            subtitle={module2Subtitle}
            status={module2Status}
            expanded={expandedModule === 2}
            onToggle={handleToggle}
          >
            {/* ── État B : Génération des questions en cours ── */}
            {isGeneratingQuestions && (
              <div className="flex items-center gap-3 py-2">
                <Loader2 size={16} className="shrink-0 animate-spin text-blue-600" />
                <span className="text-sm text-slate-600">Génération des questions personnalisées…</span>
              </div>
            )}

            {/* ── Erreur génération sans questions ── */}
            {!isGeneratingQuestions && !questions && !contactVerdict && !contactSkipped && contactError && (
              <div className="space-y-3">
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  {contactError}
                </p>
                <button
                  type="button"
                  onClick={() => analyse && handleGenerateQuestions(analyse)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  ↺ Réessayer
                </button>
              </div>
            )}

            {/* ── État C+D : Questions prêtes, en attente des réponses (ou analyse en cours) ── */}
            {!isGeneratingQuestions && questions && !contactVerdict && !contactSkipped && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                  {questions.questions.map((q, i) => (
                    <p key={i} className="text-sm font-medium text-slate-800">{i + 1}. {normalize(q)}</p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateQuestions}
                  disabled={isAnalyzingReponses}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                >
                  ↺ Régénérer les questions
                </button>
                <textarea
                  value={reponsesVendeur}
                  onChange={e => setReponsesVendeur(e.target.value)}
                  placeholder="Colle ici les réponses du vendeur..."
                  rows={4}
                  disabled={isAnalyzingReponses}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:opacity-60"
                />
                {contactError && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    {contactError}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleSkipContact}
                    disabled={isAnalyzingReponses}
                    className="w-full sm:w-auto py-2.5 px-4 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Passer cette étape
                  </button>
                  <button
                    type="button"
                    onClick={handleAnalyserReponses}
                    disabled={isAnalyzingReponses || reponsesVendeur.trim().length < 10}
                    className="w-full sm:w-auto py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalyzingReponses && <Loader2 size={14} className="animate-spin" />}
                    {isAnalyzingReponses ? 'Analyse…' : 'Analyser les réponses'}
                  </button>
                </div>
              </div>
            )}

            {/* ── État E : Verdict reçu ── */}
            {!isGeneratingQuestions && contactVerdict && analyse && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleModifyResponses}
                    className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Modifier les réponses
                  </button>
                </div>
                <VerdictBlock
                  verdict={contactVerdict}
                  detection={analyse.detection}
                  onVisiter={() => setExpandedModule(3)}
                  onDecisionNow={() => {
                    setShowDecisionHint(true)
                    setTimeout(() => setShowDecisionHint(false), 4000)
                  }}
                />
                {showDecisionHint && (
                  <p className="text-xs text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                    Complétez d&apos;abord l&apos;inspection (Module 3) pour débloquer la décision finale.
                  </p>
                )}
              </div>
            )}

            {/* ── État F : Étape sautée ── */}
            {contactSkipped && !contactVerdict && !isGeneratingQuestions && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Étape ignorée. Vous pouvez reprendre si vous avez obtenu des réponses du vendeur.
                </p>
                {questions && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                      {questions.questions.map((q, i) => (
                        <p key={i} className="text-sm font-medium text-slate-800">{i + 1}. {normalize(q)}</p>
                      ))}
                    </div>
                    <textarea
                      value={reponsesVendeur}
                      onChange={e => setReponsesVendeur(e.target.value)}
                      placeholder="Colle ici les réponses du vendeur..."
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setContactSkipped(false)
                    localStorage.removeItem('autocheck_contact_skipped')
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  ↺ Reprendre l&apos;étape
                </button>
              </div>
            )}
          </Module>

          {/* Module 3 — Inspection sur place */}
          <Module
            id={3}
            icon={
              visitDone
                ? <Check size={16} className="text-green-600" />
                : <span className={`text-sm font-bold ${module3Unlocked ? 'text-blue-600' : 'text-slate-500'}`}>3</span>
            }
            iconBg={visitDone ? 'bg-green-100' : module3Unlocked ? 'bg-blue-100' : 'bg-slate-200'}
            title="Inspection sur place"
            subtitle={module3Subtitle}
            status={module3Status}
            expanded={expandedModule === 3}
            onToggle={handleToggle}
          >
            {/* State B — not started */}
            {!visitDone && !visitInProgress && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Scénario d&apos;inspection sur-mesure généré par l&apos;IA, adapté à ce véhicule. Deux niveaux : contrôle rapide puis inspection complète.
                </p>
                <button
                  type="button"
                  onClick={() => setInspectionOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Commencer l&apos;inspection
                </button>
              </div>
            )}

            {/* State C — in progress */}
            {visitInProgress && !visitDone && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">✓ {visitOk} OK</span>
                  <span className="text-red-600 font-medium">✗ {visitNok} NOK</span>
                  <span className="text-slate-400">{visitPasse} passé{visitPasse > 1 ? 's' : ''}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.round((visitCompleted / visitSteps.length) * 100)}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setInspectionOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Reprendre l&apos;inspection
                </button>
              </div>
            )}

            {/* State D — done */}
            {visitDone && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">✓ {visitOk} OK</span>
                  <span className="text-red-600 font-medium">✗ {visitNok} NOK</span>
                  <span className="text-slate-400">{visitPasse} passé{visitPasse > 1 ? 's' : ''}</span>
                </div>
                {visitNok > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-red-700 mb-2">Points NOK détectés</p>
                    {visitSteps.filter(s => s.statut === 'nok').map((s, i) => (
                      <p key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">✗</span>
                        <span>{s.titre}</span>
                      </p>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setInspectionOpen(true)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Voir le récapitulatif
                </button>
              </div>
            )}
          </Module>

          {/* Module 4 — Décision finale */}
          <Module
            id={4}
            icon={<Scale size={16} className={module4Status !== 'locked' ? 'text-blue-600' : 'text-slate-400'} />}
            iconBg={module4Status !== 'locked' ? 'bg-blue-100' : 'bg-slate-100'}
            title="Décision finale"
            subtitle={module4Subtitle}
            status={module4Status}
            expanded={expandedModule === 4}
            onToggle={handleToggle}
          >
            {analyse && (
              <DecisionBlock
                analyse={analyse}
                contactVerdict={contactVerdict}
                visite={visite}
                decision={decision}
                loading={decisionLoading}
                error={decisionError}
                onLancer={() => handleLancerDecision()}
                onRecalculer={handleRecalculer}
              />
            )}
          </Module>
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

      {/* ── INSPECTION OVERLAY ────────────────────────────────────────────── */}
      {analyse && (
        <InspectionOverlay
          isOpen={inspectionOpen}
          analyse={analyse}
          initialVisite={visite}
          contactVerdict={contactVerdict}
          onClose={() => setInspectionOpen(false)}
          onComplete={(v) => {
            setVisite(v)
            setInspectionOpen(false)
            setExpandedModule(3)
          }}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Chargement...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
