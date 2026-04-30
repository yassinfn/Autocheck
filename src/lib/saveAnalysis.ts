import { supabase } from './supabase'
import type { AnalyseResult, ContactVerdict, VisiteData, DecisionFinale } from '@/types'

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('autocheck_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('autocheck_session_id', id)
  }
  return id
}

function getRowId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('autocheck_row_id')
}

function setRowId(id: string): void {
  if (typeof window !== 'undefined') localStorage.setItem('autocheck_row_id', id)
}

export function clearRowId(): void {
  if (typeof window !== 'undefined') localStorage.removeItem('autocheck_row_id')
}

export function restoreRowId(id: string): void {
  if (typeof window !== 'undefined') localStorage.setItem('autocheck_row_id', id)
}

interface SavePayload {
  sessionId: string
  analyse?: AnalyseResult
  contactVerdict?: ContactVerdict
  visite?: VisiteData
  decision?: DecisionFinale
  stepReached?: number
  urlAnnonce?: string
}

export async function saveAnalysis(payload: SavePayload): Promise<void> {
  try {
    const { sessionId, analyse, contactVerdict, visite, decision, stepReached, urlAnnonce } = payload

    const record: Record<string, unknown> = {
      session_id: sessionId,
      updated_at: new Date().toISOString(),
    }

    if (urlAnnonce) record.url_annonce = urlAnnonce
    if (stepReached !== undefined) record.step_reached = stepReached

    if (analyse) {
      record.marque = analyse.vehicule.marque
      record.modele = analyse.vehicule.modele
      record.annee = String(analyse.vehicule.annee)
      record.prix = String(analyse.vehicule.prix)
      record.pays = analyse.detection.pays
      record.devise = analyse.detection.devise
      record.langue = analyse.detection.langue
      record.score = analyse.score.total
      record.verdict = analyse.score.verdictType
      record.analysis_data = analyse
      record.reputation_data = analyse.reputation
      record.finance_data = analyse.depenses
    }

    if (contactVerdict) record.contact_data = contactVerdict
    if (visite) record.visit_data = visite
    if (decision) {
      record.decision = decision.decision
      record.decision_data = decision
      record.is_complete = true
    }

    const rowId = getRowId()

    if (rowId) {
      const { error } = await supabase.from('analyses').update(record).eq('id', rowId)
      if (error) console.error('[Supabase]', error.message)
    } else {
      const { data, error } = await supabase
        .from('analyses')
        .insert(record)
        .select('id')
        .single()
      if (error) console.error('[Supabase]', error.message)
      else if (data?.id) setRowId(data.id)
    }
  } catch (e) {
    console.error('[Supabase]', e)
  }
}
