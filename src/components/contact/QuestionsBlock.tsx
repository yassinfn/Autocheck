'use client'

import { useState } from 'react'
import type { ContactQuestionsResult } from '@/types'

interface QuestionsBlockProps {
  result: ContactQuestionsResult
}

export default function QuestionsBlock({ result }: QuestionsBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(result.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-slate-900">Message à envoyer au vendeur</span>
        <button
          onClick={handleCopy}
          className={`shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
        >
          {copied ? '✓ Copié !' : 'Copier'}
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200 font-mono">
          {result.message}
        </div>

        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">
            Questions incluses ({result.questions.length})
          </p>
          <ul className="space-y-1.5">
            {result.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="shrink-0 text-indigo-400 font-semibold">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
