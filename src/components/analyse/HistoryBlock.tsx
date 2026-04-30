import { getLabels, type UILabels } from '@/lib/uiLabels'
import type { HistoryData, DetectionResult } from '@/types'

interface HistoryBlockProps {
  history: HistoryData
  detection: DetectionResult
  labels?: UILabels
}

export default function HistoryBlock({ history, detection, labels }: HistoryBlockProps) {
  const L = labels ?? getLabels(detection.pays)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-base font-semibold text-slate-900">{L.historique}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            ✓ Autoviza vérifié
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {history.proprietaires ?? '?'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{L.proprietaires}</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{history.relevesKm.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">{L.releve_km}</div>
          </div>

          <div
            className={`rounded-lg p-3 text-center ${
              history.immatriculationVerifiee ? 'bg-green-50' : 'bg-slate-50'
            }`}
          >
            <div className={`text-lg font-bold ${history.immatriculationVerifiee ? 'text-green-600' : 'text-slate-400'}`}>
              {history.immatriculationVerifiee ? '✓' : '?'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Immatriculation</div>
          </div>

          <div
            className={`rounded-lg p-3 text-center ${
              history.coherenceKm ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <div className={`text-lg font-bold ${history.coherenceKm ? 'text-green-600' : 'text-red-600'}`}>
              {history.coherenceKm ? '✓' : '⚠'}
            </div>
            <div className={`text-xs mt-0.5 ${history.coherenceKm ? 'text-slate-500' : 'text-red-600 font-medium'}`}>
              {history.coherenceKm ? L.km_coherents : L.km_suspect}
            </div>
          </div>
        </div>

        {history.relevesKm.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">
              {L.historique}
            </p>
            <div className="space-y-1.5">
              {history.relevesKm.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-800">
                    {r.km.toLocaleString()} km
                  </span>
                  <span className="text-xs text-slate-400">{r.date}</span>
                  {r.source && (
                    <span className="text-xs text-slate-400 italic">— {r.source}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!history.coherenceKm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <span className="font-medium">{L.anomalie_km}</span>{' '}
            — {L.anomalie_km_detail}
          </div>
        )}
      </div>
    </div>
  )
}
