'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import StepNav from '@/components/ui/StepNav'
import ScenarioIntro from '@/components/visite/ScenarioIntro'
import ScenarioStep from '@/components/visite/ScenarioStep'
import ScenarioRecap from '@/components/visite/ScenarioRecap'
import LevelTransition from '@/components/visite/LevelTransition'
import DownloadPDFButton from '@/components/ui/DownloadPDFButton'
import type {
  AnalyseResult,
  ScenarioResult,
  VisiteStepState,
  VisiteData,
  VideoAnalyseResult,
  ContactVerdict,
} from '@/types'
import { supabase } from '@/lib/supabase'
import { getOrCreateSessionId, saveAnalysis, restoreRowId } from '@/lib/saveAnalysis'
import { MAX_MODIFS, dbg } from '@/lib/decisionCache'

type Phase = 'loading' | 'error' | 'intro' | 'step' | 'transition' | 'recap'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function VisitePage() {
  const router = useRouter()
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null)
  const [contactVerdict, setContactVerdict] = useState<ContactVerdict | undefined>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [stepStates, setStepStates] = useState<VisiteStepState[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [videoAnalyse, setVideoAnalyse] = useState<VideoAnalyseResult | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [isFromHistory, setIsFromHistory] = useState(false)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const [modifCount3, setModifCount3] = useState(0)

  const niveau1Indices = stepStates
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (s.niveau ?? 1) === 1)
    .map(({ i }) => i)
  const lastNiveau1Idx = niveau1Indices[niveau1Indices.length - 1] ?? -1

  const niveau1Steps = stepStates.filter(s => (s.niveau ?? 1) === 1)
  const niveau2Steps = stepStates.filter(s => s.niveau === 2)

  // Persist videoAnalyse changes (set from ScenarioRecap) to localStorage
  useEffect(() => {
    if (stepStates.length === 0) return
    localStorage.setItem('autocheck_visite', JSON.stringify({ steps: stepStates, videoAnalyse }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoAnalyse])

  function resumeFromSteps(steps: VisiteStepState[], vAnalyse?: VideoAnalyseResult) {
    setStepStates(steps)
    if (vAnalyse) setVideoAnalyse(vAnalyse)
    const treatedCount = steps.filter(s => s.statut !== 'pending').length
    if (treatedCount === steps.length) {
      setPhase('recap')
    } else if (treatedCount > 0) {
      const firstPendingIdx = steps.findIndex(s => s.statut === 'pending')
      setCurrentIdx(firstPendingIdx)
      setPhase('step')
    } else {
      setPhase('intro')
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlId = params.get('id')
    const stored = localStorage.getItem('autocheck_analyse')
    if (!stored) {
      if (urlId) { loadFromSupabase(urlId); return }
      router.replace('/analyse')
      return
    }

    const data = JSON.parse(stored) as AnalyseResult
    if (!data.reputation) {
      router.replace('/analyse?incomplete=1')
      return
    }
    setAnalyse(data)

    const storedContact = localStorage.getItem('autocheck_contact')
    if (storedContact) setContactVerdict(JSON.parse(storedContact) as ContactVerdict)

    const fromHistory = localStorage.getItem('autocheck_from_history') === 'true'
    setIsFromHistory(fromHistory)
    setLoadedAt(localStorage.getItem('autocheck_loaded_at'))

    const count3 = parseInt(localStorage.getItem('autocheck_modif_count3') ?? '0', 10)
    setModifCount3(count3)
    dbg('[MODIF COUNT] etape3 =', count3)

    // Priority 1: visit data in localStorage
    const savedVisite = localStorage.getItem('autocheck_visite')
    if (savedVisite) {
      const visitData = JSON.parse(savedVisite) as VisiteData
      if (visitData.steps && visitData.steps.length > 0) {
        dbg('[CACHE HIT] visit_data from localStorage')
        resumeFromSteps(visitData.steps, visitData.videoAnalyse)
        return
      }
    }

    // Priority 2: Supabase fallback
    const rowId = localStorage.getItem('autocheck_row_id')
    if (rowId) {
      dbg('[CACHE MISS] checking Supabase for rowId', rowId)
      loadVisiteFromSupabase(rowId, data)
      return
    }

    // Priority 3: generate from Claude
    dbg('[CACHE MISS] generating scenario from Claude')
    generateScenario(data)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadVisiteFromSupabase(rowId: string, data: AnalyseResult) {
    setPhase('loading')
    try {
      const { data: row, error } = await supabase
        .from('analyses')
        .select('visit_data, modifications_count_etape3')
        .eq('id', rowId)
        .single()
      if (error || !row) { generateScenario(data); return }

      const count3 = row.modifications_count_etape3 ?? 0
      localStorage.setItem('autocheck_modif_count3', String(count3))
      setModifCount3(count3)
      dbg('[MODIF COUNT] etape3 from Supabase =', count3)

      const visitData = row.visit_data as VisiteData | null
      if (visitData?.steps?.length) {
        dbg('[CACHE HIT] visit_data from Supabase')
        localStorage.setItem('autocheck_visite', JSON.stringify(visitData))
        resumeFromSteps(visitData.steps, visitData.videoAnalyse)
        return
      }

      dbg('[CACHE MISS] generating scenario from Claude')
      generateScenario(data)
    } catch {
      generateScenario(data)
    }
  }

  async function loadFromSupabase(id: string) {
    setPhase('loading')
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('id, created_at, analysis_data, contact_data, visit_data, modifications_count_etape3, url_annonce')
        .eq('id', id)
        .single()
      if (error || !data?.analysis_data) { router.replace('/analyse'); return }
      restoreRowId(data.id)
      localStorage.setItem('autocheck_analyse', JSON.stringify(data.analysis_data))
      localStorage.setItem('autocheck_from_history', 'true')
      localStorage.setItem('autocheck_loaded_at', data.created_at)
      if (data.url_annonce) localStorage.setItem('autocheck_source_url', data.url_annonce)
      if (data.contact_data) localStorage.setItem('autocheck_contact', JSON.stringify(data.contact_data))
      if (data.visit_data) localStorage.setItem('autocheck_visite', JSON.stringify(data.visit_data))
      const analyseData = data.analysis_data as AnalyseResult
      setAnalyse(analyseData)
      setIsFromHistory(true)
      setLoadedAt(data.created_at)
      if (data.contact_data) setContactVerdict(data.contact_data as ContactVerdict)

      const count3 = data.modifications_count_etape3 ?? 0
      localStorage.setItem('autocheck_modif_count3', String(count3))
      setModifCount3(count3)

      const visitData = data.visit_data as VisiteData | null
      if (visitData?.steps?.length) {
        resumeFromSteps(visitData.steps, visitData.videoAnalyse)
      } else {
        generateScenario(analyseData)
      }
    } catch {
      router.replace('/analyse')
    }
  }

  async function generateScenario(data: AnalyseResult) {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/api/visite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scenario', analyse: data }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      const scenario = result as ScenarioResult
      const states: VisiteStepState[] = scenario.steps.map(step => ({
        ...step,
        statut: 'pending',
        commentaire: '',
      }))
      setStepStates(states)
      localStorage.setItem('autocheck_visite', JSON.stringify({ steps: states }))
      setCurrentIdx(0)
      setPhase('intro')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du scénario')
      setPhase('error')
    }
  }

  function updateStep(idx: number, patch: Partial<VisiteStepState>) {
    const updated = stepStates.map((s, i) => i === idx ? { ...s, ...patch } : s)
    setStepStates(updated)
    localStorage.setItem('autocheck_visite', JSON.stringify({ steps: updated, videoAnalyse }))
  }

  function handleVerdict(statut: 'ok' | 'nok' | 'passe') {
    updateStep(currentIdx, { statut })
  }

  function handleNext() {
    if (currentIdx === lastNiveau1Idx && niveau2Steps.length > 0) {
      setPhase('transition')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (currentIdx >= stepStates.length - 1) {
      setPhase('recap')
      return
    }
    setCurrentIdx(prev => prev + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleTransitionContinue() {
    const firstNiveau2Idx = stepStates.findIndex(s => s.niveau === 2)
    if (firstNiveau2Idx !== -1) {
      setCurrentIdx(firstNiveau2Idx)
    }
    setPhase('step')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleTransitionEnd() {
    saveAndGoToDecision()
  }

  function handleRestart() {
    const fresh = stepStates.map(s => ({
      ...s,
      statut: 'pending' as const,
      commentaire: '',
      photo: undefined,
    }))
    setStepStates(fresh)
    localStorage.setItem('autocheck_visite', JSON.stringify({ steps: fresh }))
    setCurrentIdx(0)
    setPhase('step')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveAndGoToDecision() {
    if (!analyse) return
    const visiteData: VisiteData = { steps: stepStates, videoAnalyse }
    localStorage.setItem('autocheck_visite', JSON.stringify(visiteData))
    localStorage.removeItem('autocheck_decision')
    await saveAnalysis({ sessionId: getOrCreateSessionId(), visite: visiteData, stepReached: 3 })
    const rowId = localStorage.getItem('autocheck_row_id')
    router.push(rowId ? `/decision?id=${rowId}` : '/decision')
  }

  if (!analyse) return null

  const vehiculeKey = `${analyse.vehicule.marque} ${analyse.vehicule.modele} ${analyse.vehicule.motorisation}`
  const atLimit3 = modifCount3 >= MAX_MODIFS
  const remaining3 = MAX_MODIFS - modifCount3

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a
            href="/analyse"
            className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0"
          >
            <span className="text-white font-bold text-sm">AC</span>
          </a>
          <span className="font-bold text-slate-900">AutoCheck</span>
          <div className="ml-auto flex items-center gap-3">
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700 shrink-0">
              Historique
            </a>
            <DownloadPDFButton />
            <StepNav current={3} navigate={href => { window.location.href = href }} />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* History banner */}
        {isFromHistory && loadedAt && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-indigo-700">
              Analyse du {fmtDate(loadedAt)}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <a href="/historique" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                ← Historique
              </a>
              <a href="/analyse" className="text-xs text-slate-500 hover:text-slate-700">
                Nouvelle analyse
              </a>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[420px] gap-5">
            <Spinner size="lg" />
            <div className="text-center">
              <p className="text-slate-800 font-semibold text-lg">Génération du scénario</p>
              <p className="text-slate-500 text-sm mt-1 max-w-xs">
                L&apos;IA analyse le véhicule et ses points d&apos;attention pour créer un scénario sur-mesure
              </p>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 text-center space-y-4">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => analyse && generateScenario(analyse)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Réessayer
            </button>
          </div>
        )}

        {phase === 'intro' && analyse && (
          <ScenarioIntro
            marque={analyse.vehicule.marque}
            modele={analyse.vehicule.modele}
            annee={analyse.vehicule.annee}
            motorisation={analyse.vehicule.motorisation}
            km={analyse.vehicule.kilometrage}
            niveau1Count={niveau1Steps.length}
            niveau2Count={niveau2Steps.length}
            onStart={() => { setCurrentIdx(0); setPhase('step') }}
          />
        )}

        {phase === 'step' && stepStates[currentIdx] && (
          <>
            {atLimit3 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Vous avez atteint la limite de {MAX_MODIFS} modifications affectant le verdict final.
                Vous pouvez continuer la visite, mais le verdict final ne sera plus recalculé.
              </div>
            )}
            {!atLimit3 && modifCount3 > 0 && (
              <p className="mb-4 text-xs text-slate-400 text-center">
                {remaining3} modification{remaining3 > 1 ? 's' : ''} restante{remaining3 > 1 ? 's' : ''}
              </p>
            )}
            <ScenarioStep
              key={currentIdx}
              step={stepStates[currentIdx]}
              stepNumber={currentIdx + 1}
              totalSteps={stepStates.length}
              treatedCount={stepStates.filter(s => s.statut !== 'pending').length}
              isLast={currentIdx === stepStates.length - 1}
              isLastNiveau1={currentIdx === lastNiveau1Idx && niveau2Steps.length > 0}
              vehiculeKey={vehiculeKey}
              onOK={() => handleVerdict('ok')}
              onNOK={() => handleVerdict('nok')}
              onPasse={() => handleVerdict('passe')}
              onModifier={() => updateStep(currentIdx, { statut: 'pending' })}
              onPhoto={base64 => updateStep(currentIdx, { photo: base64 })}
              onCommentaire={text => updateStep(currentIdx, { commentaire: text })}
              onNext={handleNext}
            />
          </>
        )}

        {phase === 'transition' && (
          <LevelTransition
            niveau1Total={niveau1Steps.length}
            ok={niveau1Steps.filter(s => s.statut === 'ok').length}
            nok={niveau1Steps.filter(s => s.statut === 'nok').length}
            passe={niveau1Steps.filter(s => s.statut === 'passe').length}
            niveau2Count={niveau2Steps.length}
            onContinue={handleTransitionContinue}
            onEnd={handleTransitionEnd}
          />
        )}

        {phase === 'recap' && (
          <>
            {atLimit3 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Vous avez atteint la limite de {MAX_MODIFS} modifications affectant le verdict final.
                Vous pouvez modifier la visite, mais le verdict final ne sera plus recalculé.
              </div>
            )}
            {!atLimit3 && modifCount3 > 0 && (
              <p className="mb-4 text-xs text-slate-400 text-center">
                {remaining3} modification{remaining3 > 1 ? 's' : ''} restante{remaining3 > 1 ? 's' : ''}
              </p>
            )}
            <ScenarioRecap
              steps={stepStates}
              marque={analyse.vehicule.marque}
              modele={analyse.vehicule.modele}
              langue={analyse.detection.langue}
              videoAnalyse={videoAnalyse}
              onVideoAnalyse={setVideoAnalyse}
              onValidate={saveAndGoToDecision}
              onRestart={handleRestart}
              analyse={analyse}
              contact={contactVerdict}
            />
          </>
        )}
      </main>
    </div>
  )
}
