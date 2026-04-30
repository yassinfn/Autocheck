'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import StepNav from '@/components/ui/StepNav'
import ConfirmLeave from '@/components/ui/ConfirmLeave'
import ChecklistBlock from '@/components/visite/ChecklistBlock'
import PhotoUpload from '@/components/visite/PhotoUpload'
import type {
  AnalyseResult,
  ChecklistGeneratedResult,
  ChecklistItemState,
  VisiteData,
} from '@/types'
import { getOrCreateSessionId, saveAnalysis } from '@/lib/saveAnalysis'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function VisitePage() {
  const router = useRouter()
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null)
  const [items, setItems] = useState<ChecklistItemState[]>([])
  const [photoAnalyses, setPhotoAnalyses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFromHistory, setIsFromHistory] = useState(false)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const [isModified, setIsModified] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const originalItemsRef = useRef<ChecklistItemState[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('autocheck_analyse')
    if (!stored) { router.replace('/analyse'); return }

    const data = JSON.parse(stored) as AnalyseResult
    const fromHistory = localStorage.getItem('autocheck_from_history') === 'true'
    setAnalyse(data)
    setIsFromHistory(fromHistory)
    setLoadedAt(localStorage.getItem('autocheck_loaded_at'))

    if (fromHistory) {
      const savedVisite = localStorage.getItem('autocheck_visite')
      if (savedVisite) {
        const visitData = JSON.parse(savedVisite) as VisiteData
        setItems(visitData.items)
        setPhotoAnalyses(visitData.photoAnalyses)
        originalItemsRef.current = visitData.items
        setLoading(false)
        return
      }
    }

    generateChecklist(data)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateChecklist(data: AnalyseResult) {
    try {
      const res = await fetch('/api/visite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checklist', analyse: data }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      const generated = result as ChecklistGeneratedResult
      const flat: ChecklistItemState[] = generated.categories.flatMap(cat =>
        cat.items.map(item => ({
          ...item,
          categorie: cat.nom,
          statut: 'pending' as const,
          note: '',
        }))
      )
      setItems(flat)
      originalItemsRef.current = flat
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération de la checklist')
    }
    setLoading(false)
  }

  function navigate(href: string) {
    if (isModified) { setPendingHref(href); return }
    window.location.href = href
  }

  function handleUpdateItem(
    id: string,
    changes: Partial<Pick<ChecklistItemState, 'statut' | 'note'>>
  ) {
    setItems(prev => {
      const next = prev.map(item => (item.id === id ? { ...item, ...changes } : item))
      const hasChange = JSON.stringify(next) !== JSON.stringify(originalItemsRef.current)
      setIsModified(hasChange)
      if (hasChange) setIsUpdated(false)
      return next
    })
  }

  function saveAndContinue(clearDecision: boolean) {
    const visiteData: VisiteData = { items, photoAnalyses }
    localStorage.setItem('autocheck_visite', JSON.stringify(visiteData))
    if (clearDecision) localStorage.removeItem('autocheck_decision')
    originalItemsRef.current = items
    setIsModified(false)
    setIsUpdated(true)
    saveAnalysis({ sessionId: getOrCreateSessionId(), visite: visiteData, stepReached: 3 })
    router.push('/decision')
  }

  const evaluatedCount = items.filter(i => i.statut !== 'pending').length
  const nokCount = items.filter(i => i.statut === 'nok').length

  if (!analyse) return null

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
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700 shrink-0">Historique</a>
            <StepNav current={3} navigate={navigate} />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
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
              <a href="/analyse" className="text-xs text-slate-500 hover:text-slate-700">
                Nouvelle analyse
              </a>
            </div>
          </div>
        )}

        {/* Véhicule résumé */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {analyse.vehicule.marque} {analyse.vehicule.modele} {analyse.vehicule.annee}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
              <span>{analyse.vehicule.kilometrage.toLocaleString('fr-FR')} km</span>
              <span>•</span>
              <span>{analyse.vehicule.prix.toLocaleString('fr-FR')} {analyse.detection.symbole}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Visite du véhicule</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Vérifiez chaque point et marquez OK ou NOK. Ajoutez des photos pour une analyse automatique.
            </p>
          </div>
          {(isModified || isUpdated) && (
            <span className={`ml-auto shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
              isUpdated ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {isUpdated ? 'Mis à jour ✓' : 'Modifié — non sauvegardé'}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <Spinner size="lg" />
            <p className="text-slate-500 text-sm">Génération de la checklist personnalisée...</p>
          </div>
        ) : (
          <>
            <ChecklistBlock items={items} onUpdate={handleUpdateItem} />
            <PhotoUpload onAnalysisComplete={a => setPhotoAnalyses(prev => [...prev, a])} />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">
                  {evaluatedCount}/{items.length} points vérifiés
                </span>
                {nokCount > 0 && (
                  <span className="text-sm text-red-600 font-medium">
                    {nokCount} problème{nokCount > 1 ? 's' : ''} détecté{nokCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${items.length ? (evaluatedCount / items.length) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/contact')}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
                >
                  ← Retour au vendeur
                </button>
                {isModified ? (
                  <button
                    onClick={() => saveAndContinue(true)}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Recalculer le verdict
                  </button>
                ) : (
                  <button
                    onClick={() => saveAndContinue(false)}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Continuer → Décision
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {pendingHref && (
        <ConfirmLeave
          onConfirm={() => { window.location.href = pendingHref }}
          onCancel={() => setPendingHref(null)}
        />
      )}
    </div>
  )
}
