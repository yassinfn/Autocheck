'use client'

import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import type { HistoryData, AnalyseResult, ContactVerdict, VisiteData, DecisionFinale } from '@/types'

interface CachedRow {
  id: string
  created_at: string
  marque: string | null
  modele: string | null
  annee: string | null
  score: number | null
  step_reached: number
  analysis_data: AnalyseResult | null
  contact_data: ContactVerdict | null
  visit_data: VisiteData | null
  decision_data: DecisionFinale | null
  url_annonce: string | null
}

interface AnnonceInputProps {
  onSubmit: (
    annonce: string,
    type?: 'image',
    imageData?: string,
    mimeType?: string,
    historyData?: HistoryData
  ) => void
  onCacheHit?: (row: CachedRow) => void
  onStart?: () => void
  disabled?: boolean
  initialUrl?: string
  initialText?: string
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim())
    u.search = ''  // strip ALL query params
    u.hash = ''    // strip anchor
    let result = u.toString().toLowerCase()
    if (result.endsWith('/')) result = result.slice(0, -1)
    return result
  } catch {
    // Fallback for non-parseable strings: cut at ? and #
    return raw.trim().toLowerCase().split('?')[0].split('#')[0]
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function AnnonceInput({ onSubmit, onCacheHit, onStart, disabled, initialUrl, initialText }: AnnonceInputProps) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [fallbackTexte, setFallbackTexte] = useState(initialText ?? '')
  const [showFallback, setShowFallback] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [checking, setChecking] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [cachedRow, setCachedRow] = useState<CachedRow | null>(null)
  const [inputMode, setInputMode] = useState<'url' | 'text'>(initialText ? 'text' : 'url')
  const [showEmptyError, setShowEmptyError] = useState(false)

  // Autoviza state
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [autovizaUrl, setAutovizaUrl] = useState<string | null>(null)
  const [manualAutovizaUrl, setManualAutovizaUrl] = useState('')
  const [scrapingAutoviza, setScrapingAutoviza] = useState(false)
  const [pendingAnnonce, setPendingAnnonce] = useState<string | null>(null)

  function validateUrl(value: string): boolean {
    if (!value.trim().startsWith('http')) {
      setUrlError("Veuillez coller l'URL complète de l'annonce (ex: https://www.leboncoin.fr/...)")
      return false
    }
    setUrlError(null)
    return true
  }

  async function checkCache(normalizedUrl: string): Promise<CachedRow | null> {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('id, created_at, marque, modele, annee, score, step_reached, analysis_data, contact_data, visit_data, decision_data, url_annonce')
        .eq('url_annonce', normalizedUrl)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) { console.error('[Cache]', error.message); return null }
      return (data as CachedRow) ?? null
    } catch (e) {
      console.error('[Cache]', e)
      return null
    }
  }

  async function doScrape(rawUrl: string, normalizedUrl: string) {
    setScraping(true)
    setScrapeError(null)
    setHistoryData(null)
    setAutovizaUrl(null)
    setShowFallback(false)

    // Set URL immediately — persists through 403/fallback so url_annonce is always saved
    localStorage.setItem('autocheck_source_url', normalizedUrl)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
      })

      const data = await res.json()

      if (res.status === 403) {
        setShowFallback(true)
        setScrapeError(data.message)
        setScraping(false)
        return
      }

      if (!res.ok) {
        setScrapeError(data.error || 'Impossible de récupérer la page')
        setScraping(false)
        return
      }

      if (data.hasHistory && data.historyData) {
        setHistoryData(data.historyData)
        onSubmit(data.text, undefined, undefined, undefined, data.historyData)
      } else if (data.autovizaUrl) {
        setAutovizaUrl(data.autovizaUrl)
        setPendingAnnonce(data.text)
      } else {
        onSubmit(data.text)
      }
    } catch {
      setScrapeError('Erreur réseau lors de la récupération')
    }

    setScraping(false)
  }

  async function handleUrlSubmit() {
    if (!url.trim() || disabled) return
    if (!validateUrl(url)) return

    onStart?.()

    const rawUrl = url.trim()
    const normalizedUrl = normalizeUrl(rawUrl)

    setCachedRow(null)
    setChecking(true)
    const found = await checkCache(normalizedUrl)
    setChecking(false)

    if (found) {
      setCachedRow(found)
      return
    }

    await doScrape(rawUrl, normalizedUrl)
  }

  function handleUseCache() {
    if (!cachedRow || !onCacheHit) return
    onCacheHit(cachedRow)
    setCachedRow(null)
  }

  async function handleForceNew() {
    const rawUrl = url.trim()
    const normalizedUrl = normalizeUrl(rawUrl)
    setCachedRow(null)
    await doScrape(rawUrl, normalizedUrl)
  }

  async function handleManualAutoviza() {
    if (!manualAutovizaUrl.trim() || !pendingAnnonce) return
    setScrapingAutoviza(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualAutovizaUrl.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.hasHistory && data.historyData) {
        setHistoryData(data.historyData)
        onSubmit(pendingAnnonce, undefined, undefined, undefined, data.historyData)
      } else {
        onSubmit(pendingAnnonce)
      }
    } catch {
      onSubmit(pendingAnnonce)
    }
    setScrapingAutoviza(false)
  }

  function handleFallbackSubmit() {
    if (disabled) return
    if (inputMode === 'text' && !fallbackTexte.trim()) {
      setShowEmptyError(true)
      return
    }
    if (!fallbackTexte.trim()) return
    setShowEmptyError(false)
    if (inputMode === 'text') {
      onStart?.()
      localStorage.removeItem('autocheck_source_url')
    }
    onSubmit(fallbackTexte.trim())
  }

  const busy = scraping || checking

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 space-y-3">
        {/* Input mode selector */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setInputMode('url')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              inputMode === 'url'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            URL de l'annonce
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              inputMode === 'text'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Texte de l&apos;annonce
          </button>
        </div>

        {inputMode === 'text' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Copiez et collez le texte complet de l&apos;annonce (titre, prix, kilométrage, description…)
            </p>
            <textarea
              value={fallbackTexte}
              onChange={(e) => { setFallbackTexte(e.target.value); if (showEmptyError) setShowEmptyError(false) }}
              placeholder="Collez ici le texte complet de l'annonce..."
              rows={10}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y ${showEmptyError ? 'border-red-400' : 'border-slate-300'}`}
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-slate-400 -mt-2">
              <span>{fallbackTexte.length > 0 ? `${fallbackTexte.length} caractères` : "Collez ici le texte de l'annonce"}</span>
              <span>{fallbackTexte.length > 500 ? '✅ Suffisant' : fallbackTexte.length > 0 ? '⚠️ Texte trop court' : ''}</span>
            </div>
            {showEmptyError && (
              <p className="text-sm text-red-500">
                ⚠️ Veuillez coller le texte complet de l&apos;annonce avant d&apos;analyser.
              </p>
            )}
            <button
              onClick={handleFallbackSubmit}
              disabled={disabled}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Analyser cette annonce
            </button>
          </div>
        )}

        {inputMode === 'url' && (
          <>
            <p className="text-sm text-slate-500">
              Collez l&apos;URL de l&apos;annonce (leboncoin, lacentrale, autoscout24, mobile.de, autotrader, cargurus, olx, subito, otomoto…)
            </p>

            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(null); setCachedRow(null) }}
                onKeyDown={(e) => e.key === 'Enter' && !disabled && handleUrlSubmit()}
                placeholder="https://www.leboncoin.fr/annonce/..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={disabled || busy}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!url.trim() || disabled || busy}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
              >
                {busy ? <Spinner size="sm" /> : null}
                {checking ? 'Vérification...' : scraping ? 'Récupération...' : 'Analyser'}
              </button>
            </div>

            {urlError && <p className="text-sm text-red-600">{urlError}</p>}

            {/* Cache hit banner */}
            {cachedRow && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">🔄</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Annonce déjà analysée le {fmtDate(cachedRow.created_at)}
                    </p>
                    {cachedRow.analysis_data && (
                      <p className="text-xs text-blue-700 mt-0.5">
                        {cachedRow.marque} {cachedRow.modele} {cachedRow.annee}
                        {cachedRow.score !== null && ` — ${cachedRow.score}/100`}
                        {' '}• Étape {cachedRow.step_reached}/4 atteinte
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      Voulez-vous utiliser l&apos;analyse existante ou en lancer une nouvelle ?
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {cachedRow.analysis_data && (
                    <button
                      onClick={handleUseCache}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Utiliser l&apos;analyse existante
                    </button>
                  )}
                  <button
                    onClick={handleForceNew}
                    disabled={busy}
                    className="flex-1 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    {scraping ? <Spinner size="sm" /> : 'Nouvelle analyse'}
                  </button>
                </div>
              </div>
            )}

            {/* Autoviza badge */}
            {historyData && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                <span>✓</span>
                <span>
                  Rapport Autoviza intégré — {historyData.relevesKm.length} relevé(s) km,{' '}
                  {historyData.proprietaires ?? '?'} propriétaire(s)
                </span>
              </div>
            )}

            {/* Autoviza found but inaccessible */}
            {autovizaUrl && !historyData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-blue-800 font-medium">
                  Un rapport Autoviza est disponible pour cette annonce.
                </p>
                <p className="text-xs text-blue-700">
                  Le rapport n&apos;a pas pu être récupéré automatiquement. Copiez l&apos;URL du rapport et
                  collez-la ci-dessous.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={manualAutovizaUrl}
                    onChange={(e) => setManualAutovizaUrl(e.target.value)}
                    placeholder="https://autoviza.fr/report/..."
                    className="flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={scrapingAutoviza}
                  />
                  <button
                    onClick={handleManualAutoviza}
                    disabled={!manualAutovizaUrl.trim() || scrapingAutoviza}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {scrapingAutoviza ? <Spinner size="sm" /> : null}
                    {scrapingAutoviza ? '...' : 'Analyser'}
                  </button>
                </div>
                <button
                  onClick={() => pendingAnnonce && onSubmit(pendingAnnonce)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Ignorer et continuer sans le rapport
                </button>
              </div>
            )}

            {/* 403 fallback */}
            {showFallback && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
                  {scrapeError}
                </div>
                <textarea
                  value={fallbackTexte}
                  onChange={(e) => setFallbackTexte(e.target.value)}
                  placeholder="Collez ici le texte complet de l'annonce..."
                  rows={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                  disabled={disabled}
                />
                <button
                  onClick={handleFallbackSubmit}
                  disabled={!fallbackTexte.trim() || disabled}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Analyser cette annonce
                </button>
              </div>
            )}

            {/* Generic scrape error */}
            {scrapeError && !showFallback && (
              <p className="text-sm text-red-600">{scrapeError}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
