'use client'

import { useState } from 'react'
import ScoreGauge from '@/components/ui/ScoreGauge'
import type { ScoreResult, VerdictType } from '@/types'

interface ScoreBlockProps {
  score: ScoreResult
}

const VERDICT_CONFIG: Record<VerdictType, { bg: string; text: string; icon: string }> = {
  excellent: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: '✅' },
  good:      { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', icon: '👍' },
  risky:     { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: '⚠️' },
  avoid:     { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: '🚫' },
}

export default function ScoreBlock({ score }: ScoreBlockProps) {
  const [showDetails, setShowDetails] = useState(false)
  const config = VERDICT_CONFIG[score.verdictType] ?? VERDICT_CONFIG.good

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="text-base font-semibold text-slate-900">Score de l&apos;annonce</span>
      </div>

      {/* Score + verdict */}
      <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
        <div className="shrink-0">
          <ScoreGauge score={score.total} size={140} />
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium text-sm ${config.bg} ${config.text}`}>
            <span>{config.icon}</span>
            <span>{score.verdict}</span>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed">{score.ressentGlobal}</p>

          {score.pointsAttention.length > 0 && (
            <ul className="space-y-1">
              {score.pointsAttention.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Toggle details */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
        >
          <span>{showDetails ? '▲' : '▼'}</span>
          {showDetails ? 'Masquer le détail' : 'Voir le détail des critères'}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-2">
            {score.details.map((d, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="shrink-0 w-12 text-right">
                  <span className="text-sm font-semibold text-slate-900">{d.points}</span>
                  <span className="text-xs text-slate-400">/{d.maxPoints}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{d.critere}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.commentaire}</p>
                </div>
                {/* Progress bar */}
                <div className="shrink-0 w-16 flex items-center mt-1">
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(d.points / d.maxPoints) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
