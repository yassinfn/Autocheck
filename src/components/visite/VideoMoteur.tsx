'use client'

import { useState, useRef, useCallback } from 'react'
import type { VideoAnalyseResult, VerdictMoteur } from '@/types'

interface VideoMoteurProps {
  langue: string
  onAnalyse: (result: VideoAnalyseResult) => void
  existingResult?: VideoAnalyseResult
}

const V: Record<VerdictMoteur, { label: string; color: string; bg: string }> = {
  sain:     { label: 'Sain',     color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  suspect:  { label: 'Suspect',  color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  critique: { label: 'Critique', color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
}

function analyseAudio(buffer: AudioBuffer): string {
  const data = buffer.getChannelData(0)
  const sr = buffer.sampleRate
  const dur = buffer.duration

  let sumSq = 0
  for (let i = 0; i < data.length; i++) sumSq += data[i] ** 2
  const rms = Math.sqrt(sumSq / data.length)

  let transients = 0
  const thr = rms * 3
  for (let i = 1; i < data.length; i++) {
    if (Math.abs(data[i] - data[i - 1]) > thr) transients++
  }
  const transientRate = transients / dur

  let zc = 0
  for (let i = 1; i < data.length; i++) {
    if ((data[i] >= 0) !== (data[i - 1] >= 0)) zc++
  }
  const domFreq = (zc / 2) / dur

  const level = rms < 0.01 ? 'très faible' : rms < 0.05 ? 'faible' : rms < 0.15 ? 'modéré' : 'élevé'
  const band = domFreq < 300
    ? 'basses fréquences (bruit sourd, grondement)'
    : domFreq < 1000
    ? 'fréquences moyennes (régime moteur normal)'
    : domFreq < 3000
    ? 'hautes fréquences (claquements, sifflements)'
    : 'très hautes fréquences (grincements, bruits métalliques)'
  const irrég = transientRate > 50
    ? 'irrégularités importantes'
    : transientRate > 20
    ? 'quelques irrégularités'
    : 'régulier'

  // sr is read but we use it only to provide context
  void sr
  return `Durée: ${dur.toFixed(1)}s | Amplitude RMS: ${rms.toFixed(4)} (niveau ${level}) | Fréquence dominante estimée: ${domFreq.toFixed(0)} Hz — ${band} | Transitoires: ${Math.round(transientRate)}/s (${irrég})`
}

export default function VideoMoteur({ langue, onAnalyse, existingResult }: VideoMoteurProps) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing' | 'done' | 'error'>(
    existingResult ? 'done' : 'idle'
  )
  const [result, setResult] = useState<VideoAnalyseResult | null>(existingResult ?? null)
  const [errorMsg, setErrorMsg] = useState('')
  const [duration, setDuration] = useState(0)
  const [capturedCount, setCapturedCount] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const framesRef = useRef<string[]>([])
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const captureFrame = useCallback(() => {
    if (framesRef.current.length >= 5) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 640
    canvas.height = 480
    ctx.drawImage(video, 0, 0, 640, 480)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    const b64 = dataUrl.split(',')[1]
    if (b64) {
      framesRef.current.push(b64)
      setCapturedCount(framesRef.current.length)
    }
  }, [])

  async function startRecording() {
    try {
      setErrorMsg('')
      framesRef.current = []
      chunksRef.current = []
      setDuration(0)
      setCapturedCount(0)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.muted = true
      await video.play()

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(200)

      setPhase('recording')

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
      frameTimerRef.current = setInterval(captureFrame, 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible d\'accéder à la caméra')
      setPhase('error')
    }
  }

  async function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null }

    captureFrame()

    const mr = mediaRecorderRef.current
    if (!mr) return

    setPhase('processing')

    await new Promise<void>(resolve => { mr.onstop = () => resolve(); mr.stop() })

    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null

    const frames = framesRef.current.slice(0, 5)

    let audioDescription = 'Analyse audio non disponible.'
    try {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType })
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      audioDescription = analyseAudio(audioBuffer)
      await audioCtx.close()
    } catch {
      // Audio decode unsupported (e.g. iOS MP4) — continue without
    }

    try {
      const res = await fetch('/api/video-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: frames.map(data => ({ data, mediaType: 'image/jpeg' })),
          audioDescription,
          langue,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json as VideoAnalyseResult)
      setPhase('done')
      onAnalyse(json as VideoAnalyseResult)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle')
    setResult(null)
    setErrorMsg('')
    setDuration(0)
    setCapturedCount(0)
    framesRef.current = []
    chunksRef.current = []
  }

  const cfg = result ? V[result.verdict_global] : null

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <span className="text-base font-semibold text-slate-900">Analyse vidéo moteur</span>
        <p className="text-xs text-slate-400 mt-0.5">Enregistrez 15–30s du moteur en marche pour une analyse IA visuelle et sonore</p>
      </div>

      <div className="p-5 space-y-4">
        <canvas ref={canvasRef} className="hidden" />

        <video
          ref={videoRef}
          className={`w-full rounded-lg bg-slate-900 ${phase === 'recording' ? 'block' : 'hidden'}`}
          playsInline
          muted
        />

        {phase === 'idle' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.943L15 14M3 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 mb-5">Pointez la caméra vers le moteur en marche</p>
            <button
              onClick={startRecording}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
            >
              Démarrer l&apos;enregistrement
            </button>
          </div>
        )}

        {phase === 'recording' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-700">Enregistrement en cours</span>
              </div>
              <span className="text-sm font-mono text-slate-500">{duration}s</span>
            </div>
            <p className="text-xs text-slate-400">{capturedCount}/5 image{capturedCount !== 1 ? 's' : ''} capturée{capturedCount !== 1 ? 's' : ''}</p>
            <button
              onClick={stopRecording}
              disabled={duration < 5}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {duration < 5 ? `Attendez encore ${5 - duration}s...` : 'Arrêter et analyser'}
            </button>
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Analyse IA en cours...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {errorMsg}
            </div>
            <button
              onClick={reset}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 text-sm"
            >
              Réessayer
            </button>
          </div>
        )}

        {phase === 'done' && result && cfg && (
          <div className="space-y-3">
            <div className={`rounded-lg border p-4 ${cfg.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Verdict global</span>
                <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label.toUpperCase()}</span>
              </div>
              <p className="text-sm text-slate-700">{result.recommandations}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Visuel</p>
                <span className={`text-xs font-bold ${V[result.verdict_visuel].color}`}>
                  {V[result.verdict_visuel].label.toUpperCase()}
                </span>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{result.detail_visuel}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Sonore</p>
                <span className={`text-xs font-bold ${V[result.verdict_sonore].color}`}>
                  {V[result.verdict_sonore].label.toUpperCase()}
                </span>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{result.detail_sonore}</p>
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 text-sm"
            >
              Refaire l&apos;analyse
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
