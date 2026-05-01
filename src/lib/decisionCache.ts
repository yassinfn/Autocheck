import type { VisiteStepState } from '@/types'

export const MAX_MODIFS = 3

function isDebug(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('DEBUG_AUTOCHECK') === '1'
}

export function dbg(...args: unknown[]): void {
  if (isDebug()) console.log('[AutoCheck]', ...args)
}

function djb2(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h, 33) ^ s.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

export function hashEtape2(contactResponses: string): string {
  return djb2(contactResponses)
}

export function hashEtape3(steps: VisiteStepState[]): string {
  const treated = steps.filter(s => s.statut !== 'pending')
  if (treated.length === 0) return ''
  return djb2(treated.map(s => `${s.id}:${s.statut}:${s.commentaire ?? ''}`).join('|'))
}

export function hashGlobal(h2: string, h3: string): string {
  return djb2(`${h2}||${h3}`)
}
