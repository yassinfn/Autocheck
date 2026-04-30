'use client'

import { useState } from 'react'
import type { ChecklistItemState } from '@/types'

interface ChecklistBlockProps {
  items: ChecklistItemState[]
  onUpdate: (id: string, changes: Partial<Pick<ChecklistItemState, 'statut' | 'note'>>) => void
}

function groupByCategorie(items: ChecklistItemState[]): [string, ChecklistItemState[]][] {
  const map = new Map<string, ChecklistItemState[]>()
  for (const item of items) {
    if (!map.has(item.categorie)) map.set(item.categorie, [])
    map.get(item.categorie)!.push(item)
  }
  return Array.from(map.entries())
}

export default function ChecklistBlock({ items, onUpdate }: ChecklistBlockProps) {
  const [openInstructions, setOpenInstructions] = useState<Set<string>>(new Set())

  function toggleInstruction(id: string) {
    setOpenInstructions(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const okCount = items.filter(i => i.statut === 'ok').length
  const nokCount = items.filter(i => i.statut === 'nok').length
  const pendingCount = items.filter(i => i.statut === 'pending').length
  const grouped = groupByCategorie(items)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-slate-900">Checklist de contrôle</span>
        <div className="flex items-center gap-2 text-xs shrink-0">
          {okCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              ✓ {okCount}
            </span>
          )}
          {nokCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              ✗ {nokCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-slate-400">{pendingCount} restants</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {grouped.map(([categorie, catItems]) => (
          <div key={categorie}>
            <div className="px-5 py-2 bg-slate-50">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {categorie}
              </span>
            </div>

            {catItems.map(item => (
              <div
                key={item.id}
                className={`px-5 py-3 border-l-4 transition-colors ${
                  item.statut === 'ok'
                    ? 'border-green-400 bg-green-50/30'
                    : item.statut === 'nok'
                    ? 'border-red-400 bg-red-50/30'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-slate-800 font-medium leading-snug">
                    {item.point}
                  </span>

                  <button
                    onClick={() => toggleInstruction(item.id)}
                    title="Comment vérifier ?"
                    className={`w-6 h-6 rounded-full border text-xs font-bold shrink-0 transition-colors ${
                      openInstructions.has(item.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    ?
                  </button>

                  <button
                    onClick={() =>
                      onUpdate(item.id, { statut: item.statut === 'ok' ? 'pending' : 'ok' })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      item.statut === 'ok'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700'
                    }`}
                  >
                    OK
                  </button>

                  <button
                    onClick={() =>
                      onUpdate(item.id, { statut: item.statut === 'nok' ? 'pending' : 'nok' })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      item.statut === 'nok'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700'
                    }`}
                  >
                    NOK
                  </button>
                </div>

                {openInstructions.has(item.id) && (
                  <div className="mt-2 text-xs text-slate-700 bg-indigo-50 rounded-lg px-3 py-2.5 leading-relaxed">
                    {item.instruction}
                  </div>
                )}

                {item.statut === 'nok' && (
                  <input
                    type="text"
                    value={item.note}
                    onChange={e => onUpdate(item.id, { note: e.target.value })}
                    placeholder="Note (optionnel)..."
                    className="mt-2 w-full text-xs rounded-lg border border-red-200 bg-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-300 placeholder:text-slate-400"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
