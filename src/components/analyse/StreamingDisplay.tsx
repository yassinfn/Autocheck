'use client'

const STAGES = [
  { key: '"vehicule"',        label: 'Identification du véhicule' },
  { key: '"score"',           label: 'Calcul du score' },
  { key: '"pointsAttention"', label: "Points d'attention" },
  { key: '"depenses"',        label: 'Estimation des dépenses' },
]

export default function StreamingDisplay({ text }: { text: string }) {
  const reachedIdx = (() => {
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (text.includes(STAGES[i].key)) return i
    }
    return -1
  })()

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-sm font-semibold text-slate-800">Analyse en cours…</span>
      </div>
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const done = idx <= reachedIdx
          const active = idx === reachedIdx + 1
          return (
            <div
              key={stage.key}
              className={`flex items-center gap-3 text-sm transition-colors ${
                done ? 'text-slate-700' : active ? 'text-slate-500' : 'text-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                done
                  ? 'bg-green-100 text-green-600'
                  : active
                  ? 'bg-indigo-100 text-indigo-400 animate-pulse'
                  : 'bg-slate-100 text-slate-300'
              }`}>
                {done ? '✓' : active ? '…' : '○'}
              </div>
              <span>{stage.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
