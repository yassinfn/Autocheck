'use client'

import { useState } from 'react'
import { generatePDF } from '@/lib/generatePDF'
import type { AnalyseResult, ContactVerdict, VisiteData, DecisionFinale } from '@/types'

interface Props {
  analyse: AnalyseResult
  contact?: ContactVerdict
  visite?: VisiteData
  decision?: DecisionFinale
}

export default function BoutonTelechargement({ analyse, contact, visite, decision }: Props) {
  const [generating, setGenerating] = useState(false)

  async function handleClick() {
    setGenerating(true)
    // Let React paint the loading state before the synchronous PDF work
    await new Promise(r => setTimeout(r, 50))
    try {
      generatePDF({ analyse, contactVerdict: contact, visite, decision })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={generating}
      className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-semibold text-sm hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {generating ? (
        <>
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Génération du PDF...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          Télécharger le rapport PDF
        </>
      )}
    </button>
  )
}
