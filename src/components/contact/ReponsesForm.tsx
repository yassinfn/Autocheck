'use client'

import { useState, useRef } from 'react'
import Spinner from '@/components/ui/Spinner'

export interface UploadedFile {
  name: string
  data: string
  mimeType: string
  preview?: string
}

interface ReponsesFormProps {
  onSubmit: (reponses: string, images: { data: string; mimeType: string }[]) => void
  loading?: boolean
  initialValue?: string
  initialFiles?: UploadedFile[]
  buttonLabel?: string
  onTextChange?: (text: string) => void
  onFilesChange?: (files: UploadedFile[]) => void
}

export default function ReponsesForm({ onSubmit, loading, initialValue, initialFiles, buttonLabel, onTextChange, onFilesChange }: ReponsesFormProps) {
  const [reponses, setReponses] = useState(initialValue ?? '')
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles ?? [])
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = ev.target?.result as string
        const base64 = result.split(',')[1]
        setFiles(prev => {
          const next = [...prev, {
            name: file.name,
            data: base64,
            mimeType: file.type,
            preview: file.type.startsWith('image/') ? result : undefined,
          }]
          onFilesChange?.(next)
          return next
        })
      }
      reader.readAsDataURL(file)
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeFile(idx: number) {
    setFiles(prev => {
      const next = prev.filter((_, i) => i !== idx)
      onFilesChange?.(next)
      return next
    })
  }

  function handleSubmit() {
    if (!reponses.trim() || loading) return
    onSubmit(reponses.trim(), files.map(f => ({ data: f.data, mimeType: f.mimeType })))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <span className="text-base font-semibold text-slate-900">Réponses du vendeur</span>
        <p className="text-sm text-slate-500 mt-0.5">
          Copiez-collez les réponses reçues, puis joignez les documents si nécessaire.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <textarea
          value={reponses}
          onChange={e => { setReponses(e.target.value); onTextChange?.(e.target.value) }}
          placeholder="Collez ici les réponses du vendeur..."
          rows={7}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          disabled={loading}
        />

        {/* File upload zone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 flex flex-col items-center gap-1 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">📎</span>
          <span className="text-sm font-medium">Joindre des documents (CT, factures, photos)</span>
          <span className="text-xs text-slate-400">JPG, PNG, WebP</span>
        </button>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt={f.name} className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center shrink-0 text-base">
                    📄
                  </div>
                )}
                <span className="flex-1 text-sm text-slate-700 truncate">{f.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!reponses.trim() || loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Analyse en cours...
            </>
          ) : (
            buttonLabel ?? 'Analyser les réponses'
          )}
        </button>
      </div>
    </div>
  )
}
