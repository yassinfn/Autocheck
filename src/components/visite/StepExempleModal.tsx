'use client'

import { useState, useEffect } from 'react'

interface StepExempleModalProps {
  vehiculeKey: string
  etapeId: string
  imageQuery: string
  youtubeQuery: string
  titre: string
  onClose: () => void
}

export default function StepExempleModal({
  vehiculeKey, etapeId, imageQuery, youtubeQuery, titre, onClose,
}: StepExempleModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [legende, setLegende] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!imageQuery) { setLoading(false); return }

    const params = new URLSearchParams({
      modele: vehiculeKey,
      etape_id: etapeId,
      query: imageQuery,
    })

    fetch(`/api/visite-image?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.image_url) {
          setImageUrl(data.image_url)
          setLegende(data.legende ?? '')
        } else {
          setError(data.error ?? 'Image non disponible')
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [vehiculeKey, etapeId, imageQuery])

  const youtubeUrl = youtubeQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery)}`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800 truncate pr-4">{titre}</p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Image */}
        <div className="bg-slate-50 min-h-[200px] flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 p-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Chargement...</p>
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-slate-400 p-8 text-center">{error}</p>
          )}
          {!loading && imageUrl && (
            <div className="w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={legende}
                className="w-full max-h-64 object-cover"
                onError={() => setError('Image non disponible')}
              />
              {legende && (
                <p className="text-xs text-slate-400 px-4 py-2 text-center leading-relaxed">{legende}</p>
              )}
            </div>
          )}
        </div>

        {/* YouTube link */}
        {youtubeUrl && (
          <div className="px-4 py-3 border-t border-slate-100">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Voir une vidéo explicative
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
