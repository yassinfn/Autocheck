'use client'

interface ScoreGaugeProps {
  score: number
  size?: number
}

function getColor(score: number): string {
  if (score >= 80) return '#16a34a'  // green-600
  if (score >= 60) return '#ca8a04'  // yellow-600
  if (score >= 40) return '#ea580c'  // orange-600
  return '#dc2626'                    // red-600
}

export default function ScoreGauge({ score, size = 140 }: ScoreGaugeProps) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference
  const color = getColor(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-slate-400 mt-0.5">/100</span>
      </div>
    </div>
  )
}
