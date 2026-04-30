'use client'

import { useState, useEffect } from 'react'

const STEPS = [
  { n: 1 as const, label: 'Annonce',  href: '/analyse' },
  { n: 2 as const, label: 'Vendeur',  href: '/contact' },
  { n: 3 as const, label: 'Visite',   href: '/visite'  },
  { n: 4 as const, label: 'Décision', href: '/decision' },
]

interface StepNavProps {
  current: 1 | 2 | 3 | 4
  navigate: (href: string) => void
}

export default function StepNav({ current, navigate }: StepNavProps) {
  const [reached, setReached] = useState<number>(current)

  useEffect(() => {
    let r = 1
    if (localStorage.getItem('autocheck_analyse')) r = Math.max(r, 2)
    if (localStorage.getItem('autocheck_contact')) r = Math.max(r, 3)
    if (localStorage.getItem('autocheck_visite') || localStorage.getItem('autocheck_decision')) r = Math.max(r, 4)
    setReached(Math.max(r, current))
  }, [current])

  return (
    <div className="flex items-center">
      {STEPS.map((step, idx) => {
        const isActive    = step.n === current
        const isReachable = step.n <= reached
        const isCompleted = step.n < current

        return (
          <div key={step.n} className="flex items-center">
            {idx > 0 && (
              <div className={`w-3 h-px mx-0.5 shrink-0 ${isReachable ? 'bg-indigo-300' : 'bg-slate-200'}`} />
            )}
            <button
              onClick={() => !isActive && isReachable && navigate(step.href)}
              disabled={isActive || !isReachable}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : isReachable
                  ? 'text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                  : 'text-slate-300 cursor-default'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                isActive    ? 'bg-white text-indigo-600'    :
                isCompleted ? 'bg-indigo-100 text-indigo-600' :
                isReachable ? 'bg-slate-100 text-slate-500'   :
                              'bg-slate-100 text-slate-300'
              }`}>
                {step.n}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
