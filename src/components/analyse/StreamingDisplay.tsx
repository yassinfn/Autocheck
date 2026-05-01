'use client'

const PROGRESS_STAGES = [
  { key: '"depenses"',        label: 'Estimation des dépenses à prévoir...' },
  { key: '"pointsAttention"', label: "Analyse des points d'attention..." },
  { key: '"score"',           label: 'Calcul du score...' },
  { key: '"vehicule"',        label: 'Identification du véhicule...' },
]

function getProgressLabel(text: string): string {
  for (const stage of PROGRESS_STAGES) {
    if (text.includes(stage.key)) return stage.label
  }
  return "Lecture de l'annonce..."
}

export default function StreamingDisplay({ text }: { text: string }) {
  const label = getProgressLabel(text)
  const visible = text.length > 500 ? '…' + text.slice(-500) : text

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="animate-pulse text-indigo-400">▋</span>
      </div>
      <div className="bg-slate-900 rounded-xl px-4 py-3 font-mono text-xs text-slate-300 leading-relaxed max-h-52 overflow-hidden">
        <pre className="whitespace-pre-wrap break-all">{visible}</pre>
      </div>
    </div>
  )
}
