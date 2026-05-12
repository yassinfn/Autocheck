'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Pause, ChevronLeft } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import ScenarioIntro from '@/components/visite/ScenarioIntro'
import ScenarioStep from '@/components/visite/ScenarioStep'
import ScenarioRecap from '@/components/visite/ScenarioRecap'
import LevelTransition from '@/components/visite/LevelTransition'
import { getOrCreateSessionId, saveAnalysis } from '@/lib/saveAnalysis'
import type {
  AnalyseResult,
  ScenarioResult,
  VisiteStepState,
  VisiteData,
  ContactVerdict,
} from '@/types'

type Phase = 'loading' | 'error' | 'intro' | 'step' | 'transition' | 'recap'

interface InspectionOverlayProps {
  isOpen: boolean
  analyse: AnalyseResult
  initialVisite?: VisiteData | null
  contactVerdict?: ContactVerdict | null
  onClose: () => void
  onComplete: (visite: VisiteData) => void
}

export default function InspectionOverlay({
  isOpen,
  analyse,
  initialVisite,
  contactVerdict,
  onClose,
  onComplete,
}: InspectionOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<Phase>('loading')
  const [stepStates, setStepStates] = useState<VisiteStepState[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const niveau1Steps = stepStates.filter(s => (s.niveau ?? 1) === 1)
  const niveau2Steps = stepStates.filter(s => s.niveau === 2)
  const niveau1Indices = stepStates
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (s.niveau ?? 1) === 1)
    .map(({ i }) => i)
  const lastNiveau1Idx = niveau1Indices[niveau1Indices.length - 1] ?? -1

  // Mount/unmount with animation
  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Initialize scenario when overlay opens
  useEffect(() => {
    if (!isOpen) return

    const saved = localStorage.getItem('autocheck_visite')
    if (saved) {
      try {
        const visitData = JSON.parse(saved) as VisiteData
        if (visitData.steps?.length) {
          resumeFromSteps(visitData.steps)
          return
        }
      } catch {}
    }

    if (initialVisite?.steps?.length) {
      resumeFromSteps(initialVisite.steps)
      return
    }

    generateScenario(analyse)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Scroll overlay to top on step/phase change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentIdx, phase])

  function resumeFromSteps(steps: VisiteStepState[]) {
    setStepStates(steps)
    const treated = steps.filter(s => s.statut !== 'pending').length
    if (treated === steps.length) {
      setPhase('recap')
    } else if (treated > 0) {
      setCurrentIdx(steps.findIndex(s => s.statut === 'pending'))
      setPhase('step')
    } else {
      setPhase('intro')
    }
  }

  async function generateScenario(data: AnalyseResult) {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/api/visite/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyse: data }),
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error ?? `Erreur serveur (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let scenarioReceived = false

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

          if (event.type === 'scenario') {
            scenarioReceived = true
            const scenario = event.payload as ScenarioResult
            const states: VisiteStepState[] = scenario.steps.map(step => ({
              ...step,
              statut: 'pending',
              commentaire: '',
            }))
            setStepStates(states)
            localStorage.setItem('autocheck_visite', JSON.stringify({ steps: states }))
            setCurrentIdx(0)
            setPhase('intro')
          } else if (event.type === 'error') {
            throw new Error((event.payload as { message: string }).message)
          }
        }
      }

      if (!scenarioReceived) {
        throw new Error("Le scénario n'a pas pu être généré. Réessayez.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du scénario')
      setPhase('error')
    }
  }

  function updateStep(idx: number, patch: Partial<VisiteStepState>) {
    const updated = stepStates.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    setStepStates(updated)
    localStorage.setItem('autocheck_visite', JSON.stringify({ steps: updated }))
  }

  function handleNext() {
    if (currentIdx === lastNiveau1Idx && niveau2Steps.length > 0) {
      setPhase('transition')
      return
    }
    if (currentIdx >= stepStates.length - 1) {
      setPhase('recap')
      return
    }
    setCurrentIdx(prev => prev + 1)
  }

  function handleTransitionContinue() {
    const firstN2 = stepStates.findIndex(s => s.niveau === 2)
    if (firstN2 !== -1) setCurrentIdx(firstN2)
    setPhase('step')
  }

  function handleSuspend() {
    const visiteData: VisiteData = { steps: stepStates }
    localStorage.setItem('autocheck_visite', JSON.stringify(visiteData))
    saveAnalysis({ sessionId: getOrCreateSessionId(), visite: visiteData }).catch(() => {})
    onClose()
  }

  async function handleComplete() {
    const visiteData: VisiteData = { steps: stepStates }
    localStorage.setItem('autocheck_visite', JSON.stringify(visiteData))
    localStorage.removeItem('autocheck_decision')
    await saveAnalysis({ sessionId: getOrCreateSessionId(), visite: visiteData, stepReached: 3 })
    onComplete(visiteData)
  }

  function handleRestart() {
    const fresh = stepStates.map(s => ({ ...s, statut: 'pending' as const, commentaire: '', photo: undefined }))
    setStepStates(fresh)
    localStorage.setItem('autocheck_visite', JSON.stringify({ steps: fresh }))
    setCurrentIdx(0)
    setPhase('step')
  }

  if (!mounted) return null

  const vehiculeKey = `${analyse.vehicule.marque} ${analyse.vehicule.modele} ${analyse.vehicule.motorisation}`
  const treated = stepStates.filter(s => s.statut !== 'pending').length
  const progressStr = stepStates.length > 0 ? `${treated}/${stepStates.length}` : ''

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleSuspend}
      />

      {/* Panel */}
      <div
        className={`absolute inset-x-0 bottom-0 top-0 bg-slate-50 flex flex-col transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSuspend}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} className="text-slate-600" />
          </button>
          {phase === 'step' && currentIdx > 0 && (
            <button
              type="button"
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Étape précédente"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
          )}
          <span className="font-semibold text-slate-900 flex-1 text-sm">Inspection sur place</span>
          {progressStr && (
            <span className="text-xs text-slate-500 font-medium">{progressStr}</span>
          )}
          <button
            type="button"
            onClick={handleSuspend}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Suspendre"
          >
            <Pause size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">

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
                  onClick={() => generateScenario(analyse)}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Réessayer
                </button>
              </div>
            )}

            {phase === 'intro' && (
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
                treatedCount={treated}
                onOK={() => { updateStep(currentIdx, { statut: 'ok' }); handleNext() }}
                onNOK={() => updateStep(currentIdx, { statut: 'nok' })}
                onPasse={() => { updateStep(currentIdx, { statut: 'passe' }); handleNext() }}
                onModifier={() => updateStep(currentIdx, { statut: 'pending' })}
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
                onEnd={handleComplete}
              />
            )}

            {phase === 'recap' && (
              <ScenarioRecap
                steps={stepStates}
                marque={analyse.vehicule.marque}
                modele={analyse.vehicule.modele}
                onValidate={handleComplete}
                onRestart={handleRestart}
                analyse={analyse}
                contact={contactVerdict ?? undefined}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
