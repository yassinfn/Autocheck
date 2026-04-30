'use client'

import { generatePDF } from '@/lib/generatePDF'
import type { AnalyseResult, ContactVerdict, VisiteData, DecisionFinale } from '@/types'

export default function DownloadPDFButton() {
  function handleClick() {
    const analyseRaw = localStorage.getItem('autocheck_analyse')
    if (!analyseRaw) return
    const analyse = JSON.parse(analyseRaw) as AnalyseResult

    const contactRaw  = localStorage.getItem('autocheck_contact')
    const visiteRaw   = localStorage.getItem('autocheck_visite')
    const decisionRaw = localStorage.getItem('autocheck_decision')

    generatePDF({
      analyse,
      contactVerdict: contactRaw  ? JSON.parse(contactRaw)  as ContactVerdict : undefined,
      visite:         visiteRaw   ? JSON.parse(visiteRaw)   as VisiteData     : undefined,
      decision:       decisionRaw ? JSON.parse(decisionRaw) as DecisionFinale  : undefined,
    })
  }

  return (
    <button
      onClick={handleClick}
      title="Télécharger le rapport PDF"
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shrink-0 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      PDF
    </button>
  )
}
