'use client'

import { useState, useEffect } from 'react'
import AnnonceInput from '@/components/analyse/AnnonceInput'
import ScoreBlock from '@/components/analyse/ScoreBlock'
import ReputationBlock from '@/components/analyse/ReputationBlock'
import DepensesBlock from '@/components/analyse/DepensesBlock'
import HistoryBlock from '@/components/analyse/HistoryBlock'
import Spinner from '@/components/ui/Spinner'
import StepNav from '@/components/ui/StepNav'
import DownloadPDFButton from '@/components/ui/DownloadPDFButton'
import BoutonTelechargement from '@/components/pdf/BoutonTelechargement'
import { supabase } from '@/lib/supabase'
import type { AnalyseResult, HistoryData, ContactVerdict, VisiteData, DecisionFinale } from '@/types'
import { getOrCreateSessionId, saveAnalysis, clearRowId, restoreRowId } from '@/lib/saveAnalysis'

interface CachedRow {
  id: string
  created_at: string
  step_reached: number
  analysis_data: AnalyseResult | null
  contact_data: ContactVerdict | null
  visit_data: VisiteData | null
  decision_data: DecisionFinale | null
  url_annonce: string | null
}

type Step = 'input' | 'loading' | 'results'

const LOADING_MESSAGES = [
  "Lecture de l'annonce en cours...",
  'Détection de la langue et du pays...',
  "Calcul du score d'évaluation...",
  'Analyse de la réputation du modèle...',
  'Estimation des dépenses à prévoir...',
]

type AnalysePartial = Omit<AnalyseResult, 'reputation'>

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AnalysePage() {
  const [step, setStep] = useState<Step>('input')
  const [result, setResult] = useState<AnalyseResult | null>(null)
  const [streamPartial, setStreamPartial] = useState<AnalysePartial | null>(null)
  const [reputationLoading, setReputationLoading] = useState(false)
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingIdx, setLoadingIdx] = useState(0)
  const [isFromHistory, setIsFromHistory] = useState(false)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) loadAnalysisById(id)
    // No auto-restore from localStorage — always start fresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAnalysisById(id: string) {
    setStep('loading')
    try {
      const { data, error: err } = await supabase
        .from('analyses')
        .select('id, created_at, step_reached, analysis_data, contact_data, visit_data, decision_data, url_annonce')
        .eq('id', id)
        .single()
      if (err || !data) { setStep('input'); return }
      handleCacheHit(data as CachedRow)
    } catch {
      setStep('input')
    }
  }

  async function handleSubmit(
    annonce: string,
    type?: 'image',
    imageData?: string,
    mimeType?: string,
    history?: HistoryData
  ) {
    setStep('loading')
    setError(null)
    setResult(null)
    setStreamPartial(null)
    setReputationLoading(false)
    setLoadingIdx(0)

    const interval = setInterval(() => {
      setLoadingIdx((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1))
    }, 2200)

    let partial: AnalysePartial | null = null

    try {
      const body =
        type === 'image'
          ? { type: 'image', imageData, mimeType }
          : { annonce, historyData: history }

      const res = await fetch('/api/analyse/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || "Erreur lors de l'analyse")
      }

      clearInterval(interval)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const event = JSON.parse(part.slice(6)) as { type: string; payload: unknown }

          if (event.type === 'score') {
            partial = event.payload as AnalysePartial
            setStreamPartial(partial)
            setReputationLoading(true)
            setStep('results')
            if (type !== 'image') localStorage.setItem('autocheck_annonce', annonce)
            localStorage.removeItem('autocheck_from_history')
            localStorage.removeItem('autocheck_loaded_at')
            setIsFromHistory(false)
            setLoadedAt(null)
            setHistoryData(history ?? null)
          } else if (event.type === 'reputation') {
            if (!partial) continue
            const reputation = event.payload as AnalyseResult['reputation']
            let updated: AnalysePartial = partial
            const gen = reputation?.analyse_generation
            if (gen && !gen.est_meilleure_version) {
              const warning = `Version non optimale (${gen.generation}) — ${gen.conseil_version || gen.explication}`
              if (!partial.score.pointsAttention.includes(warning)) {
                updated = {
                  ...partial,
                  score: {
                    ...partial.score,
                    pointsAttention: [warning, ...partial.score.pointsAttention],
                  },
                }
                partial = updated
              }
            }
            const fullResult: AnalyseResult = { ...updated, reputation }
            setResult(fullResult)
            setStreamPartial(null)
            setReputationLoading(false)
            localStorage.setItem('autocheck_analyse', JSON.stringify(fullResult))
            const sourceUrl = localStorage.getItem('autocheck_source_url') ?? undefined
            saveAnalysis({
              sessionId: getOrCreateSessionId(),
              analyse: fullResult,
              stepReached: 1,
              urlAnnonce: sourceUrl,
            })
          } else if (event.type === 'error') {
            throw new Error((event.payload as { message: string }).message)
          }
        }
      }
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      if (!partial) {
        setStep('input')
        setStreamPartial(null)
      }
      setReputationLoading(false)
    }
  }

  function resetAnalyse() {
    clearRowId()
    localStorage.removeItem('autocheck_from_history')
    localStorage.removeItem('autocheck_loaded_at')
    localStorage.removeItem('autocheck_analyse')
    localStorage.removeItem('autocheck_annonce')
    localStorage.removeItem('autocheck_contact')
    localStorage.removeItem('autocheck_visite')
    localStorage.removeItem('autocheck_questions')
    localStorage.removeItem('autocheck_contact_responses')
    localStorage.removeItem('autocheck_decision')
    setStep('input')
    setResult(null)
    setStreamPartial(null)
    setReputationLoading(false)
    setHistoryData(null)
    setError(null)
    setIsFromHistory(false)
    setLoadedAt(null)
  }

  function handleModify() {
    setStep('input')
    setError(null)
  }

  function handleCacheHit(row: CachedRow) {
    if (!row.analysis_data) return

    restoreRowId(row.id)
    localStorage.setItem('autocheck_analyse', JSON.stringify(row.analysis_data))
    localStorage.setItem('autocheck_from_history', 'true')
    localStorage.setItem('autocheck_loaded_at', row.created_at)
    if (row.url_annonce) localStorage.setItem('autocheck_source_url', row.url_annonce)

    if (row.contact_data) {
      localStorage.setItem('autocheck_contact', JSON.stringify(row.contact_data))
    } else {
      localStorage.removeItem('autocheck_contact')
    }
    if (row.visit_data) {
      localStorage.setItem('autocheck_visite', JSON.stringify(row.visit_data))
    } else {
      localStorage.removeItem('autocheck_visite')
    }
    localStorage.removeItem('autocheck_questions')
    localStorage.removeItem('autocheck_contact_responses')
    if (row.decision_data) {
      localStorage.setItem('autocheck_decision', JSON.stringify(row.decision_data))
    } else {
      localStorage.removeItem('autocheck_decision')
    }

    if (row.step_reached >= 4) {
      window.location.href = '/decision'
    } else if (row.step_reached >= 3) {
      window.location.href = '/visite'
    } else if (row.step_reached >= 2) {
      window.location.href = '/contact'
    } else {
      setIsFromHistory(true)
      setLoadedAt(row.created_at)
      setResult(row.analysis_data)
      setStep('results')
    }
  }

  const displayData = (result ?? streamPartial) as AnalyseResult | null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">AC</span>
          </div>
          <span className="font-bold text-slate-900">AutoCheck</span>
          <div className="ml-auto flex items-center gap-3">
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700 shrink-0">Historique</a>
            <DownloadPDFButton />
            <StepNav current={1} navigate={(href) => { window.location.href = href }} />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* INPUT STEP */}
        {step === 'input' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Analyser une annonce</h1>
              <p className="text-slate-500 mt-1 text-sm">
                Obtenez un score et une analyse complète avant de vous déplacer.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-5 text-sm">
                {error}
              </div>
            )}

            <AnnonceInput onSubmit={handleSubmit} onCacheHit={handleCacheHit} onStart={resetAnalyse} />

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { n: '1', label: 'Analyse annonce', active: true },
                { n: '2', label: 'Contact vendeur', active: false },
                { n: '3', label: 'Visite', active: false },
                { n: '4', label: 'Décision finale', active: false },
              ].map((s) => (
                <div
                  key={s.n}
                  className={`rounded-lg p-3 text-center text-xs ${
                    s.active ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1 ${
                      s.active ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {s.n}
                  </div>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOADING STEP */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            <Spinner size="lg" />
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">Analyse en cours</p>
              <p className="text-slate-500 mt-1 text-sm">{LOADING_MESSAGES[loadingIdx]}</p>
            </div>
            <div className="flex gap-1.5">
              {LOADING_MESSAGES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    i <= loadingIdx ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* RESULTS STEP */}
        {step === 'results' && displayData && (
          <div className="space-y-5">
            {/* History banner */}
            {isFromHistory && loadedAt && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-indigo-700">
                  Analyse du {fmtDate(loadedAt)}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <a href="/historique" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    ← Historique
                  </a>
                  <button onClick={resetAnalyse} className="text-xs text-slate-500 hover:text-slate-700">
                    Nouvelle analyse
                  </button>
                </div>
              </div>
            )}

            {/* Véhicule header */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">
                      {displayData.vehicule.marque} {displayData.vehicule.modele} {displayData.vehicule.annee}
                    </h2>
                    {historyData && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        ✓ Autoviza vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {displayData.vehicule.version || displayData.vehicule.motorisation}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                    <span>{displayData.vehicule.kilometrage.toLocaleString('fr-FR')} km</span>
                    <span>•</span>
                    <span>{displayData.vehicule.prix.toLocaleString('fr-FR')} {displayData.detection.symbole}</span>
                    <span>•</span>
                    <span>
                      {displayData.vehicule.nombreProprietaires === 1
                        ? '1 propriétaire'
                        : `${displayData.vehicule.nombreProprietaires} propriétaires`}
                    </span>
                    <span>•</span>
                    <span>{displayData.detection.pays}</span>
                  </div>
                </div>
                {isFromHistory && (
                  <button
                    onClick={handleModify}
                    className="shrink-0 text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Modifier / Relancer
                  </button>
                )}
              </div>
            </div>

            <ScoreBlock score={displayData.score} />
            {historyData && <HistoryBlock history={historyData} detection={displayData.detection} />}

            {/* Réputation : skeleton pendant le chargement, données réelles quand prêtes */}
            {reputationLoading && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-48 mb-5" />
                <div className="space-y-2 mb-5">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-5/6" />
                  <div className="h-4 bg-slate-100 rounded w-4/6" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-40 mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                </div>
              </div>
            )}
            {result && <ReputationBlock reputation={result.reputation} detection={result.detection} />}

            <DepensesBlock depenses={displayData.depenses} symbole={displayData.detection.symbole} />

            {/* CTA */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Êtes-vous toujours intéressé par cette annonce ?
              </h3>
              <p className="text-slate-500 text-sm mt-1 mb-5">
                Score {displayData.score.total}/100 — {displayData.score.verdict}
              </p>
              <div className="flex flex-col gap-3">
                {result && <BoutonTelechargement analyse={result} />}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={resetAnalyse}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                  >
                    ↺ Nouvelle analyse
                  </button>
                  {reputationLoading ? (
                    <div className="px-6 py-3 bg-indigo-400 text-white rounded-lg font-medium text-center flex items-center justify-center gap-2 cursor-wait">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyse en cours...
                    </div>
                  ) : (
                    <a
                      href="/contact"
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-center"
                    >
                      Continuer → Vendeur
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
