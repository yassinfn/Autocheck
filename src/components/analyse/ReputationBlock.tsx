'use client'

import Badge from '@/components/ui/Badge'
import type { ReputationResult, DetectionResult, Gravite, Frequence } from '@/types'


interface ReputationBlockProps {
  reputation: ReputationResult
  detection: DetectionResult
}

const graviteConfig: Record<Gravite, { label: string; variant: 'green' | 'yellow' | 'orange' | 'red' }> = {
  faible:  { label: 'Faible', variant: 'yellow' },
  modere:  { label: 'Modéré', variant: 'orange' },
  eleve:   { label: 'Élevé', variant: 'red' },
}

const frequenceConfig: Record<Frequence, { label: string; variant: 'green' | 'yellow' | 'orange' | 'red' | 'gray' }> = {
  rare:        { label: 'Rare', variant: 'green' },
  occasionnel: { label: 'Occasionnel', variant: 'yellow' },
  frequent:    { label: 'Fréquent', variant: 'orange' },
}

export default function ReputationBlock({ reputation, detection }: ReputationBlockProps) {
  const hasRappels = reputation.rappelsConstructeur.length > 0
  const gen = reputation.analyse_generation

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <span className="text-base font-semibold text-slate-900">Réputation du modèle</span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {detection.pays}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Génération / phase */}
        {gen && (
          <div
            className={`rounded-lg px-4 py-3 flex flex-col gap-1 border ${
              gen.est_meilleure_version
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {gen.est_meilleure_version ? '✓' : '⚠'}
              </span>
              <span
                className={`text-sm font-semibold ${
                  gen.est_meilleure_version ? 'text-green-800' : 'text-orange-800'
                }`}
              >
                {gen.est_meilleure_version
                  ? `Bonne version — ${gen.generation}`
                  : `Pas la meilleure version — ${gen.generation}`}
              </span>
            </div>
            {gen.explication && (
              <p
                className={`text-xs leading-relaxed ${
                  gen.est_meilleure_version ? 'text-green-700' : 'text-orange-700'
                }`}
              >
                {gen.explication}
              </p>
            )}
            {!gen.est_meilleure_version && gen.problemes_corriges_versions_suivantes.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {gen.problemes_corriges_versions_suivantes.map((p, i) => (
                  <li key={i} className="text-xs text-orange-700 flex items-start gap-1.5">
                    <span className="shrink-0">→</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
            {gen.conseil_version && (
              <p className={`text-xs font-medium mt-0.5 ${
                gen.est_meilleure_version ? 'text-green-800' : 'text-orange-800'
              }`}>
                {gen.conseil_version}
              </p>
            )}
          </div>
        )}
        {/* Points forts */}
        {reputation.pointsForts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span>✅</span> Points forts
            </h4>
            <ul className="space-y-1.5">
              {reputation.pointsForts.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="shrink-0 text-green-500 mt-0.5">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Problèmes connus */}
        {reputation.problemesConnus.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span>⚠️</span> Problèmes connus
            </h4>
            <div className="space-y-2.5">
              {reputation.problemesConnus.map((prob, i) => {
                const g = graviteConfig[prob.gravite] ?? graviteConfig.faible
                const f = frequenceConfig[prob.frequence] ?? frequenceConfig.rare
                return (
                  <div key={i} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                    <p className="text-sm text-slate-700 mb-2">{prob.description}</p>
                    <div className="flex gap-2">
                      <Badge variant={g.variant}>Gravité : {g.label}</Badge>
                      <Badge variant={f.variant}>Fréquence : {f.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rappels constructeur */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <span>🔔</span> Rappels constructeur
          </h4>
          {hasRappels ? (
            <div className="space-y-2">
              {reputation.rappelsConstructeur.map((r, i) => (
                <div key={i} className="border border-red-200 bg-red-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="red">{r.reference}</Badge>
                  </div>
                  <p className="text-sm text-red-700 mt-1.5">{r.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">
              Aucun rappel constructeur connu pour ce modèle.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
