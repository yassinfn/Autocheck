'use client'

import { useState, useRef } from 'react'
import Spinner from '@/components/ui/Spinner'

interface Photo {
  preview: string
  data: string
  mimeType: string
  analysis: string | null
  loading: boolean
}

interface PhotoUploadProps {
  onAnalysisComplete: (analysis: string) => void
}

export default function PhotoUpload({ onAnalysisComplete }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function analysePhoto(base64: string, mimeType: string) {
    try {
      const res = await fetch('/api/visite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'photo', imageData: base64, mimeType }),
      })
      const data = await res.json()
      return (data.analysis as string) || 'Analyse non disponible'
    } catch {
      return 'Erreur lors de l\'analyse'
    }
  }

  function handleFiles(files: FileList) {
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string
        const base64 = dataUrl.split(',')[1]
        const mimeType = file.type

        setPhotos(prev => [
          ...prev,
          { preview: dataUrl, data: base64, mimeType, analysis: null, loading: true },
        ])

        const analysis = await analysePhoto(base64, mimeType)

        setPhotos(prev =>
          prev.map(p => (p.data === base64 ? { ...p, analysis, loading: false } : p))
        )
        onAnalysisComplete(analysis)
      }
      reader.readAsDataURL(file)
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <span className="text-base font-semibold text-slate-900">Photos du véhicule</span>
        <p className="text-sm text-slate-500 mt-0.5">
          Prenez des photos des points clés — chaque photo est analysée automatiquement.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 rounded-lg py-6 flex flex-col items-center gap-2 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors"
        >
          <span className="text-2xl">📷</span>
          <span className="text-sm font-medium">Ajouter des photos</span>
          <span className="text-xs text-slate-400">Moteur, carrosserie, intérieur, dessous de caisse...</span>
        </button>

        {photos.length > 0 && (
          <div className="space-y-3">
            {photos.map((photo, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={`Photo ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600 mb-1">Photo {i + 1}</p>
                  {photo.loading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Spinner size="sm" />
                      Analyse en cours...
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 leading-relaxed">{photo.analysis}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
