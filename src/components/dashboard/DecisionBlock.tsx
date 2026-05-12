'use client'

import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import type { AnalyseResult, ContactVerdict, VisiteData, DecisionFinale, DecisionType } from '@/types'

function normalize(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>
    if (typeof o.titre === 'string') return o.detail ? `${o.titre} — ${o.detail}` : o.titre
    if (typeof o.title === 'string') return o.title
  }
  return String(item ?? '')
}

const DECISION_CONFIG: Record<DecisionType, {
  bg: string; border: string; text: string; icon: string; label: string
}> = {
  acheter:  { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  icon: '✓', label: 'Achat recommandé' },
  negocier: { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-800',  icon: '⚡', label: 'Négociation recommandée' },
  refuser:  { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    icon: '✗', label: 'Déconseillé' },
}

function scoreTextClass(n: number): string {
  if (n >= 75) return 'text-green-600'
  if (n >= 60) return 'text-yellow-600'
  if (n >= 45) return 'text-orange-600'
  return 'text-red-600'
}

interface DecisionBlockProps {
  analyse: AnalyseResult
  contactVerdict?: ContactVerdict | null
  visite?: VisiteData | null
  decision: DecisionFinale | null
  loading: boolean
  error: string | null
  onLancer: () => void
  onRecalculer: () => void
}

export default function DecisionBlock({
  analyse, decision, loading, error, onLancer, onRecalculer,
}: DecisionBlockProps) {
  const [userChoice, setUserChoice] = useState<'acheter' | 'negocier' | 'refuser' | null>(null)
  const symbol = analyse.detection.symbole

  // A. Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <Spinner size="lg" />
        <p className="text-slate-500 text-sm">Génération de la recommandation finale...</p>
      </div>
    )
  }

  // B. Error
  if (error) {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
        <button
          onClick={onLancer}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }

  // C. Pre-decision
  if (!decision) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Génération basée sur l&apos;analyse, les réponses vendeur et l&apos;inspection.
        </p>
        <button
          onClick={onLancer}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Lancer la décision
        </button>
      </div>
    )
  }

  // D. Decision
  const cfg = DECISION_CONFIG[decision.decision] ?? DECISION_CONFIG.negocier

  return (
    <div className="space-y-5">

      {/* D1. Bandeau verdict */}
      <div className={`rounded-xl border-2 ${cfg.bg} ${cfg.border} p-5`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-2xl font-bold ${cfg.text}`}>{cfg.icon}</span>
          <span className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</span>
        </div>
        <h3 className={`text-sm font-semibold ${cfg.text} mb-1`}>{decision.titre}</h3>
        <p className={`text-sm leading-relaxed ${cfg.text} opacity-90`}>{decision.resume}</p>
      </div>

      {/* D2. Score + conclusion */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-5">
        <div className="shrink-0 text-center">
          <div className={`text-4xl font-bold ${scoreTextClass(decision.scoreGlobal)}`}>
            {decision.scoreGlobal}
          </div>
          <div className="text-xs text-slate-400">/100</div>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-0.5">Score global</p>
          <p className="text-xs text-slate-500 leading-relaxed">{decision.conclusion}</p>
        </div>
      </div>

      {/* D3. Points positifs / Risques */}
      {(decision.pointsPositifs.length > 0 || decision.risques.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {decision.pointsPositifs.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Points positifs</p>
              <ul className="space-y-1.5">
                {decision.pointsPositifs.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="shrink-0 mt-0.5">✓</span>
                    <span>{normalize(p)}</span>
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
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{normalize(r)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* D4. Arguments de négociation + prix cible */}
      {decision.argumentsNegociation.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">Arguments de négociation</span>
          </div>
          <div className="p-4 space-y-1">
            {decision.argumentsNegociation.map((el, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700">{el.raison}</span>
                <span className="text-sm font-medium text-red-600 shrink-0 ml-3">
                  -{el.reduction.toLocaleString('fr-FR')} {symbol}
                </span>
              </div>
            ))}
            {decision.reductionTotale > 0 && (
              <>
                <div className="flex items-center justify-between pt-3 font-semibold">
                  <span className="text-sm text-slate-900">Réduction totale recommandée</span>
                  <span className="text-sm text-red-600 shrink-0 ml-3">
                    -{decision.reductionTotale.toLocaleString('fr-FR')} {symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 mt-2">
                  <span className="text-sm font-bold text-indigo-900">Prix cible à proposer</span>
                  <span className="text-xl font-bold text-indigo-700 shrink-0 ml-3">
                    {decision.prixCible.toLocaleString('fr-FR')} {symbol}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* D5. Votre décision */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-900">Votre décision</span>
          <p className="text-xs text-slate-500 mt-0.5">Qu&apos;est-ce que vous décidez ?</p>
        </div>
        <div className="p-4">
          {!userChoice ? (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => setUserChoice('acheter')}
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
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-semibold text-green-800">Félicitations !</p>
                <p className="text-sm text-green-700 mt-1 leading-relaxed">Bonne route !</p>
              </div>
              <button
                onClick={() => setUserChoice(null)}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Changer de décision
              </button>
            </div>
          ) : userChoice === 'negocier' ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-amber-800">Stratégie de négociation</p>
                {decision.reductionTotale > 0 && (
                  <div className="flex items-center justify-between bg-white rounded-lg border border-amber-200 px-4 py-3">
                    <span className="text-sm font-medium text-amber-900">Prix cible à proposer</span>
                    <span className="text-xl font-bold text-amber-700">
                      {decision.prixCible.toLocaleString('fr-FR')} {symbol}
                    </span>
                  </div>
                )}
                <p className="text-sm text-amber-700 leading-relaxed">
                  Proposez le prix cible dès le départ sans justification, puis utilisez chaque argument si le vendeur refuse.
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
            <div className="space-y-3">
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

      {/* D6. Recalculer */}
      <div className="flex justify-end">
        <button
          onClick={onRecalculer}
          className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          ↺ Recalculer
        </button>
      </div>

    </div>
  )
}
