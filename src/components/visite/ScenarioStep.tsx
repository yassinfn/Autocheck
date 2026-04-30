'use client'

import { useRef, useState } from 'react'
import type { VisiteStepState } from '@/types'
import StepExempleModal from './StepExempleModal'

interface ScenarioStepProps {
  step: VisiteStepState
  stepNumber: number
  totalSteps: number
  isLast: boolean
  isLastNiveau1?: boolean
  vehiculeKey: string
  onOK: () => void
  onNOK: () => void
  onPasse: () => void
  onPhoto: (base64: string) => void
  onCommentaire: (text: string) => void
  onNext: () => void
}

const CAT_COLORS: Record<string, string> = {
  'Extérieur':            'bg-blue-100 text-blue-700',
  'Compartiment moteur':  'bg-orange-100 text-orange-700',
  'Habitacle':            'bg-purple-100 text-purple-700',
  'Dessous du véhicule':  'bg-slate-200 text-slate-700',
  'Démarrage à froid':    'bg-red-100 text-red-700',
  'Points spécifiques':   'bg-amber-100 text-amber-800',
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 1280
        let { width, height } = img
        if (width > MAX) { height = Math.round((MAX / width) * height); width = MAX }
        if (height > MAX) { width = Math.round((MAX / height) * width); height = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1])
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function ScenarioStep({
  step, stepNumber, totalSteps, isLast, isLastNiveau1, vehiculeKey,
  onOK, onNOK, onPasse, onPhoto, onCommentaire, onNext,
}: ScenarioStepProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showModal, setShowModal] = useState(false)
  const verdictGiven = step.statut !== 'pending'
  const catColor = CAT_COLORS[step.categorie] ?? 'bg-slate-100 text-slate-600'
  const hasExemple = Boolean(step.image_query || step.youtube_query)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const b64 = await compressImage(file)
      onPhoto(b64)
    } catch { /* ignore */ }
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Étape {stepNumber} / {totalSteps}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              step.niveau === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'
            }`}>
              {step.niveau === 1 ? 'Contrôle rapide' : 'Inspection complète'}
            </span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor}`}>
            {step.categorie}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${((stepNumber - 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">

          {/* Title + exemple button */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{step.titre}</h2>
            {hasExemple && (
              <button
                onClick={() => setShowModal(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
              >
                📷 Exemple
              </button>
            )}
          </div>

          {/* Instruction */}
          <p className="text-sm text-slate-600 leading-relaxed">{step.instruction}</p>

          {/* Quoi chercher */}
          {step.quoi_chercher.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
                Quoi chercher
              </p>
              <ul className="space-y-2">
                {step.quoi_chercher.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="text-indigo-500 font-bold mt-0.5 shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Photo */}
          {step.photo_requise && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
              {step.photo ? (
                <div className="relative rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/jpeg;base64,${step.photo}`}
                    alt="Photo capturée"
                    className="w-full h-44 object-cover"
                  />
                  {!verdictGiven && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium border border-slate-200 shadow-sm"
                    >
                      Changer
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={verdictGiven}
                  className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Prendre une photo
                </button>
              )}
            </div>
          )}

          {/* Commentaire (before verdict) */}
          {step.commentaire_possible && !verdictGiven && (
            <textarea
              value={step.commentaire}
              onChange={e => onCommentaire(e.target.value)}
              placeholder="Commentaire (optionnel)..."
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          )}

          {/* NOK advice */}
          {step.statut === 'nok' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5">
                Que faire ?
              </p>
              <p className="text-sm text-amber-900 leading-relaxed">{step.si_nok}</p>
            </div>
          )}

          {/* Commentaire display (after verdict) */}
          {verdictGiven && step.commentaire && (
            <div className="bg-slate-50 rounded-lg px-3.5 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">Votre commentaire</p>
              <p className="text-sm text-slate-700">{step.commentaire}</p>
            </div>
          )}

          {/* Action buttons */}
          {!verdictGiven ? (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={onOK}
                className="py-3.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                ✓ OK
              </button>
              <button
                onClick={onNOK}
                className="py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                ✗ NOK
              </button>
              <button
                onClick={onPasse}
                className="py-3.5 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                ⏭ Passer
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <div className={`text-center py-2 rounded-lg text-sm font-semibold ${
                step.statut === 'ok'   ? 'bg-green-50 text-green-700' :
                step.statut === 'nok'  ? 'bg-red-50 text-red-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {step.statut === 'ok' ? '✓ OK' : step.statut === 'nok' ? '✗ NOK' : '⏭ Passé'}
              </div>
              <button
                onClick={onNext}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                {isLast ? 'Voir le récapitulatif →' : isLastNiveau1 ? 'Terminer le contrôle rapide →' : 'Étape suivante →'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exemple modal */}
      {showModal && (
        <StepExempleModal
          vehiculeKey={vehiculeKey}
          etapeId={step.id}
          imageQuery={step.image_query ?? ''}
          youtubeQuery={step.youtube_query ?? ''}
          titre={step.titre}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
