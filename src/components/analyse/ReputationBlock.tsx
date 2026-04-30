'use client'

import Badge from '@/components/ui/Badge'
import { createT } from '@/lib/i18n'
import { getLocaleFromCountry } from '@/lib/i18n'
import type { ReputationResult, DetectionResult, Gravite, Frequence } from '@/types'

interface ReputationBlockProps {
  reputation: ReputationResult
  detection: DetectionResult
  locale?: string
}

const graviteVariant: Record<Gravite, 'green' | 'yellow' | 'orange' | 'red'> = {
  faible:  'yellow',
  modere:  'orange',
  eleve:   'red',
}

const frequenceVariant: Record<Frequence, 'green' | 'yellow' | 'orange' | 'red' | 'gray'> = {
  rare:        'green',
  occasionnel: 'yellow',
  frequent:    'orange',
}

export default function ReputationBlock({ reputation, detection, locale }: ReputationBlockProps) {
  const t = createT(locale ?? getLocaleFromCountry(detection.pays))
  const hasRappels = reputation.rappelsConstructeur.length > 0
  const gen = reputation.analyse_generation

  const graviteLabel: Record<Gravite, string> = {
    faible: t('analyse.gravite_faible'),
    modere: t('analyse.gravite_modere'),
    eleve:  t('analyse.gravite_eleve'),
  }
  const frequenceLabel: Record<Frequence, string> = {
    rare:        t('analyse.frequence_rare'),
    occasionnel: t('analyse.frequence_occasionnel'),
    frequent:    t('analyse.frequence_frequent'),
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <span className="text-base font-semibold text-slate-900">{t('analyse.reputation_modele')}</span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {detection.pays}
        </span>
      </div>

      <div className="p-5 space-y-5">
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
                  ? `${t('analyse.bonne_version')} — ${gen.generation}`
                  : `${t('analyse.pas_meilleure_version')} — ${gen.generation}`}
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

        {reputation.pointsForts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span>✅</span> {t('analyse.points_forts')}
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

        {reputation.problemesConnus.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span>⚠️</span> {t('analyse.problemes_connus')}
            </h4>
            <div className="space-y-2.5">
              {reputation.problemesConnus.map((prob, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  <p className="text-sm text-slate-700 mb-2">{prob.description}</p>
                  <div className="flex gap-2">
                    <Badge variant={graviteVariant[prob.gravite] ?? 'yellow'}>
                      {t('analyse.gravite_label')} : {graviteLabel[prob.gravite] ?? prob.gravite}
                    </Badge>
                    <Badge variant={frequenceVariant[prob.frequence] ?? 'green'}>
                      {t('analyse.frequence_label')} : {frequenceLabel[prob.frequence] ?? prob.frequence}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <span>🔔</span> {t('analyse.rappels_constructeur')}
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
            <p className="text-sm text-slate-500 italic">{t('analyse.aucun_rappel')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
