'use client'

import VideoMoteur from '@/components/visite/VideoMoteur'
import type { VisiteStepState, VideoAnalyseResult, AnalyseResult, ContactVerdict } from '@/types'

interface ScenarioRecapProps {
  steps: VisiteStepState[]
  marque: string
  modele: string
  langue: string
  videoAnalyse?: VideoAnalyseResult
  onVideoAnalyse: (result: VideoAnalyseResult) => void
  onValidate: () => void
  onRestart?: () => void
  analyse?: AnalyseResult
  contact?: ContactVerdict
}

function groupByCategorie(steps: VisiteStepState[]): Map<string, VisiteStepState[]> {
  const map = new Map<string, VisiteStepState[]>()
  for (const s of steps) {
    if (!map.has(s.categorie)) map.set(s.categorie, [])
    map.get(s.categorie)!.push(s)
  }
  return map
}

export default function ScenarioRecap({
  steps, marque, modele, langue, videoAnalyse, onVideoAnalyse, onValidate, onRestart,
}: ScenarioRecapProps) {
  const ok    = steps.filter(s => s.statut === 'ok').length
  const nok   = steps.filter(s => s.statut === 'nok').length
  const passe = steps.filter(s => s.statut === 'passe').length
  const pend  = steps.filter(s => s.statut === 'pending').length

  const nokSteps    = steps.filter(s => s.statut === 'nok')
  const photoSteps  = steps.filter(s => s.photo)
  const grouped     = groupByCategorie(photoSteps)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Récapitulatif de la visite
        </h2>
        <p className="text-sm text-slate-500">{marque} {modele}</p>
      </div>

      {/* Score counts */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{ok}</p>
          <p className="text-xs text-green-700 font-medium mt-0.5">OK</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{nok}</p>
          <p className="text-xs text-red-700 font-medium mt-0.5">NOK</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-500">{passe}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Passés</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${pend > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-2xl font-bold ${pend > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{pend}</p>
          <p className={`text-xs font-medium mt-0.5 ${pend > 0 ? 'text-amber-700' : 'text-slate-400'}`}>Restants</p>
        </div>
      </div>

      {/* NOK list */}
      {nokSteps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-red-50">
            <span className="text-sm font-semibold text-red-700">
              {nokSteps.length} problème{nokSteps.length > 1 ? 's' : ''} détecté{nokSteps.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {nokSteps.map(s => (
              <div key={s.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 font-bold text-sm mt-0.5 shrink-0">✗</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{s.titre}</p>
                    <p className="text-xs text-slate-400 mb-2">{s.categorie}</p>
                    {s.commentaire && (
                      <p className="text-xs text-slate-600 mb-2 italic">&quot;{s.commentaire}&quot;</p>
                    )}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-amber-800 leading-relaxed">{s.si_nok}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos by category */}
      {photoSteps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">
              Photos ({photoSteps.length})
            </span>
          </div>
          <div className="p-4 space-y-4">
            {Array.from(grouped.entries()).map(([cat, catSteps]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{cat}</p>
                <div className="grid grid-cols-2 gap-2">
                  {catSteps.map(s => (
                    <div key={s.id} className="rounded-xl overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/jpeg;base64,${s.photo}`}
                        alt={s.titre}
                        className={`w-full h-28 object-cover ${
                          s.statut === 'nok' ? 'ring-2 ring-red-400' :
                          s.statut === 'ok'  ? 'ring-2 ring-green-400' : ''
                        }`}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                        <p className="text-white text-xs font-medium truncate">{s.titre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video moteur */}
      <VideoMoteur
        langue={langue}
        onAnalyse={onVideoAnalyse}
        existingResult={videoAnalyse}
      />

      {/* Actions */}
      <div className="space-y-3 pb-4">
        {pend > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            {pend} étape{pend > 1 ? 's' : ''} non complétée{pend > 1 ? 's' : ''} — vous pouvez quand même valider.
          </div>
        )}

        <button
          onClick={onValidate}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors"
        >
          Valider la visite → Décision finale
        </button>

        {onRestart && (
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            Reprendre depuis le début
          </button>
        )}
      </div>
    </div>
  )
}
