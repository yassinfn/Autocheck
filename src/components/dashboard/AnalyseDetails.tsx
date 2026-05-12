'use client'

import { AlertTriangle, ChevronRight } from 'lucide-react'
import type { AnalyseResult, DepenseItem, Gravite, Frequence } from '@/types'

function normalize(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>
    if (typeof o.titre === 'string') return o.detail ? `${o.titre} — ${o.detail}` : o.titre
    if (typeof o.title === 'string') return o.title
  }
  return String(item ?? '')
}

const GRAVITE_STYLE: Record<Gravite, string> = {
  faible: 'bg-slate-100 text-slate-600',
  modere: 'bg-amber-100 text-amber-700',
  eleve:  'bg-red-100 text-red-700',
}

const FREQUENCE_STYLE: Record<Frequence, string> = {
  rare:        'bg-slate-50 text-slate-500',
  occasionnel: 'bg-slate-100 text-slate-600',
  frequent:    'bg-slate-200 text-slate-700',
}

function AccordionSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors list-none">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <ChevronRight size={16} className="text-slate-400 shrink-0 transition-transform duration-200 group-open:rotate-90" />
      </summary>
      <div className="px-4 py-3 border-t border-slate-100">
        {children}
      </div>
    </details>
  )
}

function DepenseList({ items, symbole }: { items: DepenseItem[]; symbole: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{item.poste}</p>
            {item.detail && <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>}
          </div>
          <span className="text-sm font-medium text-slate-700 shrink-0 whitespace-nowrap">
            {item.montantMin.toLocaleString('fr-FR')}–{item.montantMax.toLocaleString('fr-FR')} {symbole}
          </span>
        </li>
      ))}
    </ul>
  )
}

interface AnalyseDetailsProps {
  analyse: AnalyseResult
}

export default function AnalyseDetails({ analyse }: AnalyseDetailsProps) {
  const { score, reputation, depenses, detection } = analyse
  const pointsForts      = reputation?.pointsForts ?? []
  const problemesConnus  = reputation?.problemesConnus ?? []
  const rappels          = reputation?.rappelsConstructeur ?? []
  const analyseGen       = reputation?.analyse_generation ?? null

  return (
    <div className="space-y-3">

      {/* Section 1 — Synthèse + Points d'attention (toujours visible) */}
      <div className="space-y-2">
        {score.ressentGlobal && (
          <p className="text-sm text-slate-600 leading-relaxed">{score.ressentGlobal}</p>
        )}
        {score.pointsAttention.length > 0 ? (
          <div className="space-y-2">
            {score.pointsAttention.map((risk, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-100">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-500" />
                <span>{normalize(risk)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2.5 border border-green-100">
            Aucun point d&apos;attention détecté.
          </p>
        )}
      </div>

      {/* Section 2 — Points forts du modèle */}
      {pointsForts.length > 0 && (
        <AccordionSection title={`✓ Points forts du modèle (${pointsForts.length})`}>
          <ul className="space-y-1.5">
            {pointsForts.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                <span className="shrink-0 mt-0.5 text-green-500 font-bold">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </AccordionSection>
      )}

      {/* Section 3 — Problèmes connus */}
      {problemesConnus.length > 0 && (
        <AccordionSection title={`⚠ Problèmes connus (${problemesConnus.length})`}>
          <ul className="space-y-3">
            {problemesConnus.map((pb, i) => (
              <li key={i} className={i > 0 ? 'pt-3 border-t border-slate-100' : ''}>
                <p className="text-sm text-slate-700 mb-1.5">{pb.description}</p>
                <div className="flex gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GRAVITE_STYLE[pb.gravite] ?? 'bg-slate-100 text-slate-600'}`}>
                    {pb.gravite}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FREQUENCE_STYLE[pb.frequence] ?? 'bg-slate-100 text-slate-600'}`}>
                    {pb.frequence}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </AccordionSection>
      )}

      {/* Section 4 — Rappels constructeur */}
      {rappels.length > 0 && (
        <AccordionSection title={`📌 Rappels constructeur (${rappels.length})`}>
          <div className="space-y-2">
            {rappels.map((r, i) => (
              <div key={i} className="bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-800">{r.reference}</p>
                <p className="text-sm text-slate-600 mt-0.5">{r.description}</p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Section 5 — Analyse de génération */}
      {analyseGen && (
        <AccordionSection title={
          <span className="flex items-center gap-2">
            <span>🔄 Analyse de génération</span>
            {analyseGen.est_meilleure_version
              ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">✨ Meilleure version</span>
              : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠ Génération antérieure</span>
            }
          </span>
        }>
          <div className="space-y-3">
            {analyseGen.generation && (
              <p className="text-sm font-semibold text-slate-800">{analyseGen.generation}</p>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">{analyseGen.explication}</p>
            {analyseGen.problemes_corriges_versions_suivantes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Problèmes corrigés sur générations suivantes :
                </p>
                <ul className="space-y-1">
                  {analyseGen.problemes_corriges_versions_suivantes.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="shrink-0 mt-0.5 text-slate-400">→</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analyseGen.conseil_version && (
              <p className="text-sm text-slate-500 italic leading-relaxed">{analyseGen.conseil_version}</p>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Section 6 — Dépenses détaillées */}
      {depenses && (
        <AccordionSection title={
          `💰 Dépenses à prévoir · ${depenses.totalObligatoiresMin.toLocaleString('fr-FR')}–${depenses.totalObligatoiresMax.toLocaleString('fr-FR')} ${detection.symbole}`
        }>
          <div className="space-y-4">
            {depenses.obligatoires.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  À faire obligatoirement à l&apos;achat
                </p>
                <DepenseList items={depenses.obligatoires} symbole={detection.symbole} />
              </div>
            )}
            {depenses.eventuelles.length > 0 && (
              <div className={depenses.obligatoires.length > 0 ? 'border-t border-slate-100 pt-4' : ''}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  À prévoir selon résultats diagnostic
                </p>
                <DepenseList items={depenses.eventuelles} symbole={detection.symbole} />
              </div>
            )}
            {depenses.fraisAchat.length > 0 && (
              <div className={(depenses.obligatoires.length > 0 || depenses.eventuelles.length > 0) ? 'border-t border-slate-100 pt-4' : ''}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Frais d&apos;achat obligatoires
                </p>
                <DepenseList items={depenses.fraisAchat} symbole={detection.symbole} />
              </div>
            )}
          </div>
        </AccordionSection>
      )}

    </div>
  )
}
