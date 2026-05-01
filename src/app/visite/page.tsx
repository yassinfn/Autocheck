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
import { getOrCreateSessionId, saveAnalysis } from '@/lib/saveAnalysis'

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

  // Indices of niveau 1 and niveau 2 steps in the flat stepStates array
  const niveau1Indices = stepStates
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (s.niveau ?? 1) === 1)
    .map(({ i }) => i)
  const lastNiveau1Idx = niveau1Indices[niveau1Indices.length - 1] ?? -1

  const niveau1Steps = stepStates.filter(s => (s.niveau ?? 1) === 1)
  const niveau2Steps = stepStates.filter(s => s.niveau === 2)

  useEffect(() => {
    const stored = localStorage.getItem('autocheck_analyse')
    if (!stored) { router.replace('/analyse'); return }

    const data = JSON.parse(stored) as AnalyseResult
    setAnalyse(data)

    const storedContact = localStorage.getItem('autocheck_contact')
    if (storedContact) setContactVerdict(JSON.parse(storedContact) as ContactVerdict)

    const fromHistory = localStorage.getItem('autocheck_from_history') === 'true'
    setIsFromHistory(fromHistory)
    setLoadedAt(localStorage.getItem('autocheck_loaded_at'))

    if (fromHistory) {
      const savedVisite = localStorage.getItem('autocheck_visite')
      if (savedVisite) {
        const visitData = JSON.parse(savedVisite) as VisiteData
        if (visitData.steps && visitData.steps.length > 0) {
          setStepStates(visitData.steps)
          if (visitData.videoAnalyse) setVideoAnalyse(visitData.videoAnalyse)
          setPhase('recap')
          return
        }
      }
    }

    generateScenario(data)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setCurrentIdx(0)
      setPhase('intro')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du scénario')
      setPhase('error')
    }
  }

  function updateStep(idx: number, changes: Partial<VisiteStepState>) {
    setStepStates(prev => prev.map((s, i) => i === idx ? { ...s, ...changes } : s))
  }

  function handleVerdict(statut: 'ok' | 'nok' | 'passe') {
    updateStep(currentIdx, { statut })
  }

  function handleNext() {
    // After last niveau 1 step → show transition screen
    if (currentIdx === lastNiveau1Idx && niveau2Steps.length > 0) {
      setPhase('transition')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // After last step overall → recap
    if (currentIdx >= stepStates.length - 1) {
      setPhase('recap')
      return
    }
    setCurrentIdx(prev => prev + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleTransitionContinue() {
    // Advance to first niveau 2 step
    const firstNiveau2Idx = stepStates.findIndex(s => s.niveau === 2)
    if (firstNiveau2Idx !== -1) {
      setCurrentIdx(firstNiveau2Idx)
    }
    setPhase('step')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleTransitionEnd() {
    // Save only completed steps, skip to decision
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
    setCurrentIdx(0)
    setPhase('step')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveAndGoToDecision() {
    if (!analyse) return
    const visiteData: VisiteData = { steps: stepStates, videoAnalyse }
    localStorage.setItem('autocheck_visite', JSON.stringify(visiteData))
    localStorage.removeItem('autocheck_decision')
    // Await so Supabase write completes before /decision loads and calls the API
    await saveAnalysis({ sessionId: getOrCreateSessionId(), visite: visiteData, stepReached: 3 })
    router.push('/decision')
  }

  if (!analyse) return null

  const vehiculeKey = `${analyse.vehicule.marque} ${analyse.vehicule.modele} ${analyse.vehicule.motorisation}`

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
          <ScenarioStep
            key={currentIdx}
            step={stepStates[currentIdx]}
            stepNumber={currentIdx + 1}
            totalSteps={stepStates.length}
            isLast={currentIdx === stepStates.length - 1}
            isLastNiveau1={currentIdx === lastNiveau1Idx && niveau2Steps.length > 0}
            vehiculeKey={vehiculeKey}
            onOK={() => handleVerdict('ok')}
            onNOK={() => handleVerdict('nok')}
            onPasse={() => handleVerdict('passe')}
            onPhoto={base64 => updateStep(currentIdx, { photo: base64 })}
            onCommentaire={text => updateStep(currentIdx, { commentaire: text })}
            onNext={handleNext}
          />
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
        )}
      </main>
    </div>
  )
}
