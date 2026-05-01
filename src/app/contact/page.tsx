'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import StepNav from '@/components/ui/StepNav'
import DownloadPDFButton from '@/components/ui/DownloadPDFButton'
import BoutonTelechargement from '@/components/pdf/BoutonTelechargement'
import ConfirmLeave from '@/components/ui/ConfirmLeave'
import QuestionsBlock from '@/components/contact/QuestionsBlock'
import ReponsesForm, { type UploadedFile } from '@/components/contact/ReponsesForm'
import VerdictBlock from '@/components/contact/VerdictBlock'
import type { AnalyseResult, ContactQuestionsResult, ContactVerdict } from '@/types'
import { supabase } from '@/lib/supabase'
import { getOrCreateSessionId, saveAnalysis, restoreRowId } from '@/lib/saveAnalysis'
import { MAX_MODIFS, dbg } from '@/lib/decisionCache'

type Step = 'loading-questions' | 'questions' | 'analysing' | 'verdict'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ContactPage() {
  const router = useRouter()
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null)
  const [step, setStep] = useState<Step>('loading-questions')
  const [questions, setQuestions] = useState<ContactQuestionsResult | null>(null)
  const [verdict, setVerdict] = useState<ContactVerdict | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFromHistory, setIsFromHistory] = useState(false)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)
  const [savedResponses, setSavedResponses] = useState<string>('')
  const [savedFiles, setSavedFiles] = useState<UploadedFile[]>([])
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([])
  const [isModified, setIsModified] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [modifCount2, setModifCount2] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlId = params.get('id')
    const stored = localStorage.getItem('autocheck_analyse')
    if (!stored) {
      if (urlId) { loadFromSupabase(urlId); return }
      router.replace('/analyse')
      return
    }

    const data = JSON.parse(stored) as AnalyseResult
    if (!data.reputation) {
      router.replace('/analyse?incomplete=1')
      return
    }
    const annonce = localStorage.getItem('autocheck_annonce') ?? ''
    const fromHistory = localStorage.getItem('autocheck_from_history') === 'true'
    setAnalyse(data)
    setIsFromHistory(fromHistory)
    setLoadedAt(localStorage.getItem('autocheck_loaded_at'))

    const count2 = parseInt(localStorage.getItem('autocheck_modif_count2') ?? '0', 10)
    setModifCount2(count2)
    dbg('[MODIF COUNT] etape2 =', count2)

    const savedResp = localStorage.getItem('autocheck_contact_responses') ?? ''
    setSavedResponses(savedResp)

    const savedFilesRaw = localStorage.getItem('autocheck_contact_files')
    const savedFilesData: UploadedFile[] = savedFilesRaw ? JSON.parse(savedFilesRaw) : []
    setSavedFiles(savedFilesData)
    setPendingFiles(savedFilesData)

    // Priority 1: verdict in localStorage
    const savedV = localStorage.getItem('autocheck_contact')
    if (savedV) {
      dbg('[CACHE HIT] verdict from localStorage')
      setVerdict(JSON.parse(savedV) as ContactVerdict)
      const savedQ = localStorage.getItem('autocheck_questions')
      if (savedQ) setQuestions(JSON.parse(savedQ) as ContactQuestionsResult)
      setStep('verdict')
      return
    }

    // Priority 2: questions in localStorage
    const savedQ = localStorage.getItem('autocheck_questions')
    if (savedQ) {
      dbg('[CACHE HIT] questions from localStorage')
      setQuestions(JSON.parse(savedQ) as ContactQuestionsResult)
      setStep('questions')
      return
    }

    // Priority 3 & 4: Supabase fallback
    const rowId = localStorage.getItem('autocheck_row_id')
    if (rowId) {
      dbg('[CACHE MISS] checking Supabase for rowId', rowId)
      loadQuestionsFromSupabase(rowId, data, annonce)
      return
    }

    // Priority 5: generate from Claude
    dbg('[CACHE MISS] generating questions from Claude')
    generateQuestions(data, annonce)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadQuestionsFromSupabase(rowId: string, data: AnalyseResult, annonce: string) {
    setStep('loading-questions')
    try {
      const { data: row, error } = await supabase
        .from('analyses')
        .select('contact_data, questions_data, contact_responses, modifications_count_etape2')
        .eq('id', rowId)
        .single()
      if (error || !row) { generateQuestions(data, annonce); return }

      const count2 = row.modifications_count_etape2 ?? 0
      localStorage.setItem('autocheck_modif_count2', String(count2))
      setModifCount2(count2)
      dbg('[MODIF COUNT] etape2 from Supabase =', count2)

      if (row.contact_data) {
        // Priority 3: verdict in Supabase
        dbg('[CACHE HIT] verdict from Supabase')
        localStorage.setItem('autocheck_contact', JSON.stringify(row.contact_data))
        setVerdict(row.contact_data as ContactVerdict)
        if (row.questions_data) {
          localStorage.setItem('autocheck_questions', JSON.stringify(row.questions_data))
          setQuestions(row.questions_data as ContactQuestionsResult)
        }
        if (row.contact_responses) {
          localStorage.setItem('autocheck_contact_responses', row.contact_responses)
          setSavedResponses(row.contact_responses)
        }
        setStep('verdict')
        return
      }

      if (row.questions_data) {
        // Priority 4: questions in Supabase
        dbg('[CACHE HIT] questions from Supabase')
        localStorage.setItem('autocheck_questions', JSON.stringify(row.questions_data))
        setQuestions(row.questions_data as ContactQuestionsResult)
        if (row.contact_responses) {
          localStorage.setItem('autocheck_contact_responses', row.contact_responses)
          setSavedResponses(row.contact_responses)
        }
        setStep('questions')
        return
      }

      // Priority 5: generate from Claude
      dbg('[CACHE MISS] generating questions from Claude')
      generateQuestions(data, annonce)
    } catch {
      generateQuestions(data, annonce)
    }
  }

  async function loadFromSupabase(id: string) {
    setStep('loading-questions')
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('id, created_at, analysis_data, contact_data, questions_data, contact_responses, modifications_count_etape2, url_annonce')
        .eq('id', id)
        .single()
      if (error || !data?.analysis_data) { router.replace('/analyse'); return }
      restoreRowId(data.id)
      localStorage.setItem('autocheck_analyse', JSON.stringify(data.analysis_data))
      localStorage.setItem('autocheck_from_history', 'true')
      localStorage.setItem('autocheck_loaded_at', data.created_at)
      if (data.url_annonce) localStorage.setItem('autocheck_source_url', data.url_annonce)
      const analyseData = data.analysis_data as AnalyseResult
      setAnalyse(analyseData)
      setIsFromHistory(true)
      setLoadedAt(data.created_at)

      const count2 = data.modifications_count_etape2 ?? 0
      localStorage.setItem('autocheck_modif_count2', String(count2))
      setModifCount2(count2)

      if (data.contact_responses) {
        localStorage.setItem('autocheck_contact_responses', data.contact_responses)
        setSavedResponses(data.contact_responses)
      }
      if (data.questions_data) {
        localStorage.setItem('autocheck_questions', JSON.stringify(data.questions_data))
        setQuestions(data.questions_data as ContactQuestionsResult)
      }

      if (data.contact_data) {
        localStorage.setItem('autocheck_contact', JSON.stringify(data.contact_data))
        setVerdict(data.contact_data as ContactVerdict)
        setStep('verdict')
      } else if (data.questions_data) {
        setStep('questions')
      } else {
        localStorage.removeItem('autocheck_contact')
        generateQuestions(analyseData, '')
      }
    } catch {
      router.replace('/analyse')
    }
  }

  function navigate(href: string) {
    const id = localStorage.getItem('autocheck_row_id')
    const needsId = id && !href.startsWith('/analyse') && !href.includes('?id=')
    const dest = needsId ? `${href}?id=${id}` : href
    if (isModified) { setPendingHref(dest); return }
    window.location.href = dest
  }

  async function generateQuestions(data: AnalyseResult, annonce: string) {
    setStep('loading-questions')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'questions', analyse: data, annonce }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      localStorage.setItem('autocheck_questions', JSON.stringify(result))
      setQuestions(result as ContactQuestionsResult)
      saveAnalysis({ sessionId: getOrCreateSessionId(), questions: result as ContactQuestionsResult })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération des questions')
    }
    setStep('questions')
  }

  async function handleAnalyseReponses(reponses: string, images: { data: string; mimeType: string }[]) {
    if (!analyse) return

    const unchanged = !!savedResponses && reponses === savedResponses && !!verdict
    if (unchanged) {
      dbg('[CACHE HIT] responses unchanged, showing cached verdict')
      setStep('verdict')
      return
    }

    setStep('analysing')
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyse', analyse, reponses, images }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      localStorage.setItem('autocheck_contact', JSON.stringify(result))
      localStorage.setItem('autocheck_contact_responses', reponses)
      localStorage.setItem('autocheck_contact_files', JSON.stringify(pendingFiles))
      setSavedResponses(reponses)
      setSavedFiles(pendingFiles)
      setVerdict(result as ContactVerdict)
      setIsModified(false)
      setIsUpdated(true)
      setStep('verdict')
      saveAnalysis({
        sessionId: getOrCreateSessionId(),
        contactVerdict: result as ContactVerdict,
        contactResponses: reponses,
        stepReached: 2,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse")
      setStep('questions')
    }
  }

  function handleRegenerateQuestions() {
    if (!analyse) return
    const annonce = localStorage.getItem('autocheck_annonce') ?? ''
    localStorage.removeItem('autocheck_questions')
    setIsUpdated(false)
    generateQuestions(analyse, annonce)
  }

  function handleEditResponses() {
    setIsModified(false)
    setIsUpdated(false)
    setPendingFiles(savedFiles)
    setFormKey(k => k + 1)
    setStep('questions')
  }

  if (!analyse) return null

  const atLimit2 = modifCount2 >= MAX_MODIFS
  const remaining2 = MAX_MODIFS - modifCount2

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/analyse" className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">AC</span>
          </a>
          <span className="font-bold text-slate-900">AutoCheck</span>
          <div className="ml-auto flex items-center gap-3">
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700 shrink-0">Historique</a>
            <DownloadPDFButton />
            <StepNav current={2} navigate={navigate} />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* History banner */}
        {isFromHistory && loadedAt && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-indigo-700">
              Analyse du {fmtDate(loadedAt)}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <a href="/historique" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                ← Historique
              </a>
              <a href="/analyse" className="text-xs text-slate-500 hover:text-slate-700">
                Nouvelle analyse
              </a>
            </div>
          </div>
        )}

        {/* Véhicule résumé */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {analyse.vehicule.marque} {analyse.vehicule.modele} {analyse.vehicule.annee}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
              <span>{analyse.vehicule.kilometrage.toLocaleString('fr-FR')} km</span>
              <span>•</span>
              <span>{analyse.vehicule.prix.toLocaleString('fr-FR')} {analyse.detection.symbole}</span>
              <span>•</span>
              <span>Score initial : {analyse.score.total}/100</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Contact vendeur</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Envoyez les questions au vendeur, puis collez ses réponses pour un bilan mis à jour.
            </p>
          </div>
          {(isModified || isUpdated) && (
            <span className={`ml-auto shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
              isUpdated ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {isUpdated ? 'Mis à jour ✓' : 'Modifié — non sauvegardé'}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {step === 'loading-questions' && (
          <div className="flex flex-col items-center py-16 gap-4">
            <Spinner size="lg" />
            <p className="text-slate-500 text-sm">Génération des questions personnalisées...</p>
          </div>
        )}

        {(step === 'questions' || step === 'analysing') && questions && (
          <div className="space-y-3">
            <QuestionsBlock result={questions} />
            <button
              onClick={handleRegenerateQuestions}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ↺ Régénérer les questions
            </button>
          </div>
        )}

        {step === 'questions' && (
          <>
            {atLimit2 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Vous avez atteint la limite de {MAX_MODIFS} modifications affectant le verdict final.
                Vous pouvez encore modifier vos réponses, mais le verdict final ne sera plus recalculé.
              </div>
            )}
            <ReponsesForm
              key={formKey}
              onSubmit={handleAnalyseReponses}
              initialValue={savedResponses}
              initialFiles={savedFiles}
              buttonLabel={savedResponses ? 'Analyser les nouvelles réponses' : undefined}
              onTextChange={(text) => setIsModified(text !== savedResponses)}
              onFilesChange={setPendingFiles}
            />
            {!atLimit2 && modifCount2 > 0 && (
              <p className="text-xs text-slate-400 text-center">
                {remaining2} modification{remaining2 > 1 ? 's' : ''} restante{remaining2 > 1 ? 's' : ''}
              </p>
            )}
            {/* Back nav */}
            <div className="flex items-center">
              <button
                onClick={() => navigate('/analyse')}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Retour à l&apos;annonce
              </button>
            </div>
          </>
        )}

        {step === 'analysing' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Spinner size="lg" />
            <div className="text-center">
              <p className="text-base font-semibold text-slate-900">Analyse des réponses</p>
              <p className="text-slate-500 text-sm mt-1">Mise à jour du score et bilan financier...</p>
            </div>
          </div>
        )}

        {step === 'verdict' && verdict && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleEditResponses}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Modifier les réponses
              </button>
            </div>
            <VerdictBlock
              verdict={verdict}
              detection={analyse.detection}
              onVisiter={() => navigate('/visite')}
              onDecisionNow={() => navigate('/decision')}
            />
            {/* PDF + Bottom nav */}
            <div className="space-y-3">
              {analyse && verdict && (
                <BoutonTelechargement analyse={analyse} contact={verdict} />
              )}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => navigate('/analyse')}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← Retour à l&apos;annonce
                </button>
                <button
                  onClick={() => navigate('/visite')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Continuer → Visite
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {pendingHref && (
        <ConfirmLeave
          onConfirm={() => { window.location.href = pendingHref }}
          onCancel={() => setPendingHref(null)}
        />
      )}
    </div>
  )
}
