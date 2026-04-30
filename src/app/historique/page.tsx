'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { AnalyseResult, ContactVerdict, VisiteData, DecisionFinale, VerdictType } from '@/types'

interface AnalysisRow {
  id: string
  created_at: string
  marque: string | null
  modele: string | null
  annee: string | null
  prix: string | null
  devise: string | null
  pays: string | null
  score: number | null
  verdict: VerdictType | null
  step_reached: number
  analysis_data: AnalyseResult | null
  contact_data: ContactVerdict | null
  visit_data: VisiteData | null
  decision_data: DecisionFinale | null
  url_annonce: string | null
}

const VERDICT_CONFIG: Record<VerdictType, { label: string; bg: string; text: string }> = {
  excellent: { label: 'Excellent',  bg: 'bg-green-100',  text: 'text-green-700' },
  good:      { label: 'Bon',        bg: 'bg-yellow-100', text: 'text-yellow-700' },
  risky:     { label: 'Risqué',     bg: 'bg-orange-100', text: 'text-orange-700' },
  avoid:     { label: 'À éviter',   bg: 'bg-red-100',    text: 'text-red-700' },
}

const STEP_LABELS: Record<number, string> = {
  1: 'Annonce',
  2: 'Vendeur',
  3: 'Visite',
  4: 'Décision',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function HistoriquePage() {
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  async function fetchAnalyses() {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setAnalyses((data as AnalysisRow[]) ?? [])
    } catch (e) {
      console.error('[Supabase]', e)
    }
    setLoading(false)
  }

  function loadAnalysis(row: AnalysisRow) {
    window.location.href = `/analyse?id=${row.id}`
  }

  async function deleteAnalysis(id: string) {
    if (!confirm('Supprimer cette analyse ? Cette action est irréversible.')) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('analyses').delete().eq('id', id)
      if (error) throw error
      setAnalyses(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      console.error('[Supabase]', e)
    }
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a
            href="/analyse"
            className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0"
          >
            <span className="text-white font-bold text-sm">AC</span>
          </a>
          <span className="font-bold text-slate-900">AutoCheck</span>
          <span className="text-sm text-slate-500 ml-1">/ Historique</span>
          <a
            href="/analyse"
            className="ml-auto px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            + Nouvelle analyse
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Historique des analyses</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Retrouvez et reprenez toutes vos analyses précédentes.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-lg mb-2">Aucune analyse sauvegardée</p>
            <p className="text-slate-400 text-sm mb-6">
              Vos prochaines analyses apparaîtront ici automatiquement.
            </p>
            <a
              href="/analyse"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Analyser une annonce
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map(row => {
              const cfg =
                row.verdict ? (VERDICT_CONFIG[row.verdict] ?? VERDICT_CONFIG.good) : null
              const stepLabel = STEP_LABELS[row.step_reached] ?? 'En cours'
              const stepColor =
                row.step_reached >= 4 ? 'text-green-600'
                : row.step_reached >= 3 ? 'text-indigo-600'
                : 'text-slate-500'

              return (
                <div
                  key={row.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900">
                          {row.marque} {row.modele} {row.annee}
                        </h3>
                        {cfg && row.score !== null && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}
                          >
                            {row.score}/100 — {cfg.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                        {row.prix && (
                          <>
                            <span>
                              {Number(row.prix).toLocaleString('fr-FR')} {row.devise}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        {row.pays && (
                          <>
                            <span>{row.pays}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatDate(row.created_at)}</span>
                        <span>•</span>
                        <span className={`font-medium ${stepColor}`}>
                          Étape {row.step_reached}/4 — {stepLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => loadAnalysis(row)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Reprendre
                      </button>
                      <button
                        onClick={() => deleteAnalysis(row.id)}
                        disabled={deletingId === row.id}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        {deletingId === row.id ? '...' : 'Suppr.'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
