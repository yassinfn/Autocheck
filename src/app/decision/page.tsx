'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import StepNav from '@/components/ui/StepNav'
import type { AnalyseResult, VisiteData, ContactVerdict, DecisionFinale, DecisionType } from '@/types'
import { supabase } from '@/lib/supabase'
import { getOrCreateSessionId, saveAnalysis, restoreRowId } from '@/lib/saveAnalysis'
import { generatePDF } from '@/lib/generatePDF'
import BoutonTelechargement from '@/components/pdf/BoutonTelechargement'
import { MAX_MODIFS, dbg, hashEtape2, hashEtape3, hashGlobal } from '@/lib/decisionCache'

const DECISION_CONFIG: Record<DecisionType, {
  bg: string; border: string; text: string; icon: string; label: string
}> = {
  acheter:  { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  icon: '✓', label: 'Achat recommandé' },
  negocier: { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-800',  icon: '⚡', label: 'Négociation recommandée' },
  refuser:  { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    icon: '✗', label: 'Déconseillé' },
}

const SCORE_COLOR = (n: number) =>
  n >= 75 ? 'text-green-600' : n >= 60 ? 'text-yellow-500' : n >= 45 ? 'text-orange-500' : 'text-red-600'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface HashUpdate {
  h2: string; h3: string; hGlobal: string
  incrCount2: boolean; incrCount3: boolean
  count2: number; count3: number
}

export default function DecisionPage() {
  const router = useRouter()
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null)
  const [visite, setVisite] = useState<VisiteData | undefined>()
  const [contactVerdict, setContactVerdict] = useState<ContactVerdict | undefined>()
  const [decision, setDecision] = useState<DecisionFinale | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFromHistory, setIsFromHistory] = useState(false)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const [isUpdated, setIsUpdated] = useState(false)
  const [userChoice, setUserChoice] = useState<'acheter' | 'negocier' | 'refuser' | null>(null)
  const [modifCount2, setModifCount2] = useState(0)
  const [modifCount3, setModifCount3] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlId = params.get('id')
    const storedAnalyse = localStorage.getItem('autocheck_analyse')
    if (!storedAnalyse) {
      if (urlId) { loadFromSupabase(urlId); return }
      router.replace('/analyse')
      return
    }

    const analyseData = JSON.parse(storedAnalyse) as AnalyseResult
    if (!analyseData.reputation) {
      router.replace('/analyse?incomplete=1')
      return
    }
    const visiteData = localStorage.getItem('autocheck_visite')
      ? (JSON.parse(localStorage.getItem('autocheck_visite')!) as VisiteData)
      : undefined
    const contactData = localStorage.getItem('autocheck_contact')
      ? (JSON.parse(localStorage.getItem('autocheck_contact')!) as ContactVerdict)
      : undefined

    const fromHistory = localStorage.getItem('autocheck_from_history') === 'true'

    setAnalyse(analyseData)
    setVisite(visiteData)
    setContactVerdict(contactData)
    setIsFromHistory(fromHistory)
    setLoadedAt(localStorage.getItem('autocheck_loaded_at'))

    const count2 = parseInt(localStorage.getItem('autocheck_modif_count2') ?? '0', 10)
    const count3 = parseInt(localStorage.getItem('autocheck_modif_count3') ?? '0', 10)
    setModifCount2(count2)
    setModifCount3(count3)
    dbg('[MODIF COUNT] etape2 =', count2, 'etape3 =', count3)

    computeAndFetchDecision(analyseData, visiteData, contactData)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadFromSupabase(id: string) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('id, created_at, analysis_data, contact_data, visit_data, decision_data, contact_responses, decision_input_hash, decision_input_hash_etape2, decision_input_hash_etape3, modifications_count_etape2, modifications_count_etape3, url_annonce')
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
      if (data.decision_data) localStorage.setItem('autocheck_decision', JSON.stringify(data.decision_data))
      if (data.contact_responses) localStorage.setItem('autocheck_contact_responses', data.contact_responses)
      if (data.decision_input_hash) localStorage.setItem('autocheck_decision_hash', data.decision_input_hash)
      if (data.decision_input_hash_etape2) localStorage.setItem('autocheck_decision_hash2', data.decision_input_hash_etape2)
      if (data.decision_input_hash_etape3) localStorage.setItem('autocheck_decision_hash3', data.decision_input_hash_etape3)

      const count2 = data.modifications_count_etape2 ?? 0
      const count3 = data.modifications_count_etape3 ?? 0
      localStorage.setItem('autocheck_modif_count2', String(count2))
      localStorage.setItem('autocheck_modif_count3', String(count3))

      const analyseData = data.analysis_data as AnalyseResult
      const visiteData = (data.visit_data as VisiteData | null) ?? undefined
      const contactData = (data.contact_data as ContactVerdict | null) ?? undefined

      setAnalyse(analyseData)
      setIsFromHistory(true)
      setLoadedAt(data.created_at)
      if (contactData) setContactVerdict(contactData)
      if (visiteData) setVisite(visiteData)
      setModifCount2(count2)
      setModifCount3(count3)

      computeAndFetchDecision(analyseData, visiteData, contactData)
    } catch {
      router.replace('/analyse')
      setLoading(false)
    }
  }

  async function computeAndFetchDecision(
    analyseData: AnalyseResult,
    visiteData?: VisiteData,
    contactData?: ContactVerdict,
    forceFetch = false
  ) {
    const contactResponses = localStorage.getItem('autocheck_contact_responses') ?? ''
    const steps = visiteData?.steps ?? []
    const h2 = hashEtape2(contactResponses)
    const h3 = hashEtape3(steps)
    const hGlobal = hashGlobal(h2, h3)

    const storedGlobal = localStorage.getItem('autocheck_decision_hash')
    const storedH2 = localStorage.getItem('autocheck_decision_hash2')
    const storedH3 = localStorage.getItem('autocheck_decision_hash3')
    const savedDecision = localStorage.getItem('autocheck_decision')

    const count2 = parseInt(localStorage.getItem('autocheck_modif_count2') ?? '0', 10)
    const count3 = parseInt(localStorage.getItem('autocheck_modif_count3') ?? '0', 10)

    dbg('[HASH] h2 =', h2, 'h3 =', h3, 'hGlobal =', hGlobal)
    dbg('[HASH] stored global =', storedGlobal, 'h2 =', storedH2, 'h3 =', storedH3)

    // CAS A: cache hit — inputs unchanged since last generation
    if (!forceFetch && savedDecision && storedGlobal === hGlobal) {
      dbg('[CACHE HIT] decision inputs unchanged')
      setDecision(JSON.parse(savedDecision) as DecisionFinale)
      setLoading(false)
      return
    }

    // CAS B: first generation — no stored hash or no cached decision
    if (!storedGlobal || !savedDecision) {
      dbg('[CACHE MISS] first generation — no counter increment')
      await fetchDecision(analyseData, visiteData, contactData, {
        h2, h3, hGlobal, incrCount2: false, incrCount3: false, count2, count3,
      })
      return
    }

    // CAS C: modification detected
    const h2Changed = !storedH2 || h2 !== storedH2
    const h3Changed = !storedH3 || h3 !== storedH3
    const incrCount2 = h2Changed && count2 < MAX_MODIFS
    const incrCount3 = h3Changed && count3 < MAX_MODIFS
    // canRecalculate = true si :
    //  - Étape 2 a changé ET son compteur n'est pas à la limite (incrCount2)
    //  - Étape 3 a changé ET son compteur n'est pas à la limite (incrCount3)
    //  - Aucun sub-hash n'a changé (sécurité défensive : hash global différent
    //    mais sub-hashs identiques, ex. corruption localStorage)
    const canRecalculate = incrCount2 || incrCount3 || (!h2Changed && !h3Changed)

    if (canRecalculate) {
      dbg('[CACHE MISS] modification — recalculating')
      if (incrCount2) dbg('[MODIF COUNT] incrementing etape2:', count2, '→', count2 + 1)
      if (incrCount3) dbg('[MODIF COUNT] incrementing etape3:', count3, '→', count3 + 1)
      await fetchDecision(analyseData, visiteData, contactData, {
        h2, h3, hGlobal, incrCount2, incrCount3, count2, count3,
      })
    } else {
      dbg('[LIMIT REACHED] etape2:', count2, 'etape3:', count3, '— showing cached decision')
      setDecision(JSON.parse(savedDecision) as DecisionFinale)
      setLimitReached(true)
      setLoading(false)
    }
  }

  async function fetchDecision(
    analyseData: AnalyseResult,
    visiteData?: VisiteData,
    contactData?: ContactVerdict,
    hashUpdate?: HashUpdate
  ) {
    setLoading(true)
    setError(null)
    try {
      const visiteForApi = visiteData
        ? { ...visiteData, steps: (visiteData.steps ?? []).map(({ photo: _p, ...rest }) => rest) }
        : undefined

      const res = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyse: analyseData, visite: visiteForApi, contactVerdict: contactData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const decisionResult = data as DecisionFinale

      localStorage.setItem('autocheck_decision', JSON.stringify(decisionResult))
      setDecision(decisionResult)
      setIsUpdated(true)
      setLimitReached(false)

      if (hashUpdate) {
        const { h2, h3, hGlobal, incrCount2, incrCount3, count2, count3 } = hashUpdate
        const newCount2 = incrCount2 ? count2 + 1 : count2
        const newCount3 = incrCount3 ? count3 + 1 : count3

        localStorage.setItem('autocheck_decision_hash', hGlobal)
        localStorage.setItem('autocheck_decision_hash2', h2)
        localStorage.setItem('autocheck_decision_hash3', h3)
        localStorage.setItem('autocheck_modif_count2', String(newCount2))
        localStorage.setItem('autocheck_modif_count3', String(newCount3))
        setModifCount2(newCount2)
        setModifCount3(newCount3)
        dbg('[MODIF COUNT] after recalc: etape2 =', newCount2, 'etape3 =', newCount3)

        saveAnalysis({
          sessionId: getOrCreateSessionId(),
          decision: decisionResult,
          decisionHashes: { global: hGlobal, etape2: h2, etape3: h3 },
          modifCounts: { etape2: newCount2, etape3: newCount3 },
          stepReached: 4,
        })
      } else {
        saveAnalysis({ sessionId: getOrCreateSessionId(), decision: decisionResult, stepReached: 4 })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération')
    }
    setLoading(false)
  }

  function handleRecalculate() {
    if (!analyse) return

    // Anti-spam: skip API call if inputs haven't changed since last verdict
    const contactResponses = localStorage.getItem('autocheck_contact_responses') ?? ''
    const steps = visite?.steps ?? []
    const h2 = hashEtape2(contactResponses)
    const h3 = hashEtape3(steps)
    const hGlobal = hashGlobal(h2, h3)
    const storedGlobal = localStorage.getItem('autocheck_decision_hash')

    if (storedGlobal === hGlobal) {
      dbg('[RECALC SKIP] no changes since last verdict')
      setRecalcMessage('Aucune modification à recalculer.')
      setTimeout(() => setRecalcMessage(null), 3000)
      return
    }

    setIsUpdated(false)
    setLimitReached(false)
    computeAndFetchDecision(analyse, visite, contactVerdict, true)
  }

  if (!analyse) return null
  const cfg = decision ? DECISION_CONFIG[decision.decision] ?? DECISION_CONFIG.negocier : null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/analyse" className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">AC</span>
          </a>
          <span className="font-bold text-slate-900">AutoCheck</span>
          <div className="ml-auto flex items-center gap-3">
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700 shrink-0">Historique</a>
            <StepNav current={4} navigate={(href) => { window.location.href = href }} />
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
              {isUpdated && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                  Mis à jour ✓
                </span>
              )}
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
          <h2 className="text-base font-bold text-slate-900">
            {analyse.vehicule.marque} {analyse.vehicule.modele} {analyse.vehicule.annee}
          </h2>
          <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
            <span>{analyse.vehicule.kilometrage.toLocaleString('fr-FR')} km</span>
            <span>•</span>
            <span>{analyse.vehicule.prix.toLocaleString('fr-FR')} {analyse.detection.symbole}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Recommandation finale</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Synthèse complète de toutes les étapes de votre inspection.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <Spinner size="lg" />
            <p className="text-slate-500 text-sm">Génération de la recommandation finale...</p>
          </div>
        ) : !decision ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
            <p className="text-slate-600 text-sm">Aucune recommandation enregistrée pour cette analyse.</p>
            <button
              onClick={handleRecalculate}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Générer la recommandation
            </button>
          </div>
        ) : decision && cfg ? (
          <>
            {limitReached && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Limite de {MAX_MODIFS} modifications atteinte. Le verdict affiché correspond à vos dernières données analysées.
              </div>
            )}

            <div className={`rounded-xl border-2 ${cfg.bg} ${cfg.border} p-6`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-3xl font-bold ${cfg.text}`}>{cfg.icon}</span>
                <span className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</span>
              </div>
              <h3 className={`text-base font-semibold ${cfg.text} mb-1`}>{decision.titre}</h3>
              <p className={`text-sm leading-relaxed ${cfg.text} opacity-90`}>{decision.resume}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-6">
              <div className="shrink-0 text-center">
                <div className={`text-5xl font-bold ${SCORE_COLOR(decision.scoreGlobal)}`}>
                  {decision.scoreGlobal}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">/100</div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 mb-1">Score global de l&apos;inspection</p>
                <p className="text-xs text-slate-500 leading-relaxed">{decision.conclusion}</p>
              </div>
            </div>

            {(decision.pointsPositifs.length > 0 || decision.risques.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {decision.pointsPositifs.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-800 mb-2">Points positifs</p>
                    <ul className="space-y-1.5">
                      {decision.pointsPositifs.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                          <span className="shrink-0 mt-0.5">✓</span><span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {decision.risques.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-red-800 mb-2">Risques identifiés</p>
                    <ul className="space-y-1.5">
                      {decision.risques.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                          <span className="shrink-0 mt-0.5">⚠</span><span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {decision.argumentsNegociation.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <span className="text-base font-semibold text-slate-900">Arguments de négociation</span>
                </div>
                <div className="p-5 space-y-1">
                  {decision.argumentsNegociation.map((el, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-700">{el.raison}</span>
                      <span className="text-sm font-medium text-red-600 shrink-0 ml-3">
                        -{el.reduction.toLocaleString('fr-FR')} {analyse.detection.symbole}
                      </span>
                    </div>
                  ))}
                  {decision.reductionTotale > 0 && (
                    <>
                      <div className="flex items-center justify-between pt-3 font-semibold">
                        <span className="text-sm text-slate-900">Réduction totale recommandée</span>
                        <span className="text-sm text-red-600 shrink-0 ml-3">
                          -{decision.reductionTotale.toLocaleString('fr-FR')} {analyse.detection.symbole}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 mt-2">
                        <span className="text-sm font-bold text-indigo-900">Prix cible à proposer</span>
                        <span className="text-xl font-bold text-indigo-700 shrink-0 ml-3">
                          {decision.prixCible.toLocaleString('fr-FR')} {analyse.detection.symbole}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Votre décision */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <span className="text-base font-semibold text-slate-900">Votre décision</span>
                <p className="text-sm text-slate-500 mt-0.5">Qu&apos;est-ce que vous décidez ?</p>
              </div>
              <div className="p-5">
                {!userChoice ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => { setUserChoice('acheter'); generatePDF({ analyse, contactVerdict, visite, decision }) }}
                      className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                    >
                      J&apos;achète
                    </button>
                    <button
                      onClick={() => setUserChoice('negocier')}
                      className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm"
                    >
                      Je veux négocier
                    </button>
                    <button
                      onClick={() => setUserChoice('refuser')}
                      className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
                    >
                      Je n&apos;achète pas
                    </button>
                  </div>
                ) : userChoice === 'acheter' ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="font-semibold text-green-800 text-base">Félicitations !</p>
                      <p className="text-sm text-green-700 mt-1 leading-relaxed">
                        Votre rapport complet a été téléchargé. Bonne route !
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => generatePDF({ analyse, contactVerdict, visite, decision })}
                        className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
                      >
                        ↓ Télécharger à nouveau le rapport
                      </button>
                      <button
                        onClick={() => setUserChoice(null)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
                      >
                        Changer de décision
                      </button>
                    </div>
                  </div>
                ) : userChoice === 'negocier' ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <p className="font-semibold text-amber-800">Stratégie de négociation</p>
                      {decision.reductionTotale > 0 && (
                        <div className="flex items-center justify-between bg-white rounded-lg border border-amber-200 px-4 py-3">
                          <span className="text-sm font-medium text-amber-900">Prix cible à proposer</span>
                          <span className="text-xl font-bold text-amber-700">
                            {decision.prixCible.toLocaleString('fr-FR')} {analyse.detection.symbole}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-amber-700 leading-relaxed">
                        Appuyez-vous sur les arguments listés ci-dessus pour justifier votre offre.
                        Restez ferme mais ouvert — proposez le prix cible dès le départ sans justification,
                        puis utilisez chaque argument si le vendeur refuse.
                      </p>
                    </div>
                    <button
                      onClick={() => setUserChoice(null)}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Changer de décision
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="font-semibold text-slate-800">Sage décision.</p>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        Ne vous précipitez pas. Une meilleure annonce vous attend.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="/analyse"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Chercher une autre annonce
                      </a>
                      <button
                        onClick={() => setUserChoice(null)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
                      >
                        Changer de décision
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <BoutonTelechargement
              analyse={analyse}
              contact={contactVerdict}
              visite={visite}
              decision={decision}
            />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => {
                  const id = localStorage.getItem('autocheck_row_id')
                  window.location.href = id ? `/visite?id=${id}` : '/visite'
                }}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Retour à la visite
              </button>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2">
                  <button
                    onClick={handleRecalculate}
                    disabled={loading || limitReached}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    ↺ Recalculer
                  </button>
                  <a
                    href="/analyse"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Nouvelle analyse
                  </a>
                </div>
                {recalcMessage && (
                  <p className="text-xs text-slate-500">{recalcMessage}</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
