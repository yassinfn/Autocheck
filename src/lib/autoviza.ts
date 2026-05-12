import * as cheerio from 'cheerio'
import type { AutovizaData, AutovizaEvenementTimeline, AutovizaUsagePro } from '@/types'

/**
 * Extrait l'URL du rapport Autoviza depuis le HTML brut LeBonCoin.
 * Cherche le champ "vehicle_history_report_public_url" dans __NEXT_DATA__.
 * Retourne null si non trouvé ou si le statut n'est pas "visible".
 */
export function extractAutovizaUrl(leboncoinHtml: string): string | null {
  const urlMatch = leboncoinHtml.match(
    /"vehicle_history_report_public_url"\s*,\s*"value"\s*:\s*"(https:\/\/autoviza\.fr\/report\/report\?uid=[a-f0-9-]+)"/i
  )
  if (!urlMatch) return null

  const statusMatch = leboncoinHtml.match(
    /"vehicle_history_report_status"\s*,\s*"value"\s*:\s*"(\w+)"/i
  )
  if (statusMatch && statusMatch[1] !== 'visible') return null

  return urlMatch[1]
}

/**
 * Fetch et parse un rapport Autoviza public.
 * Retourne null en cas d'erreur (timeout, 404, structure inattendue).
 */
export async function fetchAutovizaReport(url: string): Promise<AutovizaData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`[Autoviza] HTTP ${response.status} sur ${url}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // ─── SYNTHÈSE (ul.resume-list) ───
    const synthese: AutovizaData['synthese'] = {}

    $('ul.resume-list > li').each((_, li) => {
      const h3 = $(li).find('h3').first().text().trim()
      const p = $(li).find('p').first().text().trim()

      const propMatch = h3.match(/(\d+)\s*propriétaire/i)
      if (propMatch) {
        synthese.nombreProprietaires = propMatch[1]
      }

      if (/contrôle de l'existence/i.test(h3)) {
        synthese.controleExistenceOk = /correspond bien/i.test(p)
      }

      const relevesMatch = h3.match(/(\d+)\s*relevés? kilométriques?/i)
      if (relevesMatch) {
        synthese.relevesKilometriquesNombre = parseInt(relevesMatch[1], 10)
      }

      if (/opération atypique/i.test(h3)) {
        synthese.operationsAtypiques = h3.replace(/\.$/, '')
      }

      const critAir = $(li).find('#critair_n').text().trim()
      if (critAir) {
        synthese.critAir = critAir
      }
    })

    // ─── USAGES PROFESSIONNELS (div#use-cards) ───
    const usagesProfessionnels: AutovizaUsagePro[] = []
    $('#use-cards > div').each((_, card) => {
      const type = $(card).find('h3').first().text().trim()
      const label = $(card).find('.label').first().text().trim()
      if (type) {
        usagesProfessionnels.push({
          type,
          detecte: !/pas d['']usage détecté/i.test(label),
        })
      }
    })

    // ─── TIMELINE HISTORIQUE (ul.timeline) ───
    const historique: AutovizaEvenementTimeline[] = []
    $('ul.timeline > li').each((_, li) => {
      const date = $(li).find('.meta .date').first().text().trim()
      const km = $(li).find('.meta .label').first().text().trim() || undefined
      const titre = $(li).find('.title h3').first().text().trim()
      const description = $(li).find('.description > p').first().text().trim() || undefined

      let sinistre: AutovizaEvenementTimeline['sinistre'] | undefined
      const sinistreItems = $(li).find('ul.timeline-detail > li')
      if (sinistreItems.length > 0) {
        sinistre = {}
        sinistreItems.each((_, item) => {
          const $item = $(item)
          const label = $item.find('.content > div').eq(0).text().trim().toLowerCase()
          const value = $item.find('.content > div').eq(1).text().trim()
          if (/type de sinistre/i.test(label)) sinistre!.typeDeSinistre = value
          else if (/coût/i.test(label)) sinistre!.coutEstime = value
          else if (/zone du choc/i.test(label)) sinistre!.zoneDuChoc = value
        })
      }

      if (date && titre) {
        historique.push({ date, km, titre, description, sinistre })
      }
    })

    return { synthese, usagesProfessionnels, historique }
  } catch (error) {
    console.error('[Autoviza] Erreur fetch/parse:', error)
    return null
  }
}

/**
 * Formate les données Autoviza en bloc texte lisible pour concaténation
 * au texte envoyé à Claude.
 */
export function formatAutovizaForPrompt(data: AutovizaData): string {
  const lines: string[] = ['', "═══ RAPPORT D'HISTORIQUE AUTOVIZA ═══", '']

  if (data.synthese.nombreProprietaires) {
    lines.push(`Nombre de propriétaires à la date du rapport : ${data.synthese.nombreProprietaires}`)
  }
  if (data.synthese.controleExistenceOk !== undefined) {
    lines.push(
      `Contrôle d'existence du véhicule : ${data.synthese.controleExistenceOk ? "OK (immatriculation correspond à un véhicule enregistré)" : 'PROBLÈME'}`
    )
  }
  if (data.synthese.relevesKilometriquesNombre !== undefined) {
    lines.push(`Nombre de relevés kilométriques disponibles : ${data.synthese.relevesKilometriquesNombre}`)
  }
  if (data.synthese.operationsAtypiques) {
    lines.push(`Opérations atypiques : ${data.synthese.operationsAtypiques}`)
  }
  if (data.synthese.critAir) {
    lines.push(`Vignette Crit'Air : ${data.synthese.critAir}`)
  }

  if (data.usagesProfessionnels.length > 0) {
    lines.push('', 'Usages professionnels détectés :')
    data.usagesProfessionnels.forEach((u) => {
      lines.push(`  - ${u.type} : ${u.detecte ? '⚠️ DÉTECTÉ' : 'Aucun usage détecté'}`)
    })
  }

  if (data.historique.length > 0) {
    lines.push('', 'Historique chronologique :')
    data.historique.forEach((e) => {
      let line = `  - ${e.date}`
      if (e.km) line += ` (${e.km})`
      line += ` : ${e.titre}`
      if (e.description) line += ` — ${e.description}`
      if (e.sinistre) {
        const parts: string[] = []
        if (e.sinistre.typeDeSinistre) parts.push(`type: ${e.sinistre.typeDeSinistre}`)
        if (e.sinistre.coutEstime) parts.push(`coût: ${e.sinistre.coutEstime}`)
        if (e.sinistre.zoneDuChoc) parts.push(`zone: ${e.sinistre.zoneDuChoc}`)
        if (parts.length > 0) line += ` [SINISTRE EXPERTISÉ — ${parts.join(', ')}]`
      }
      lines.push(line)
    })
  }

  lines.push('')
  return lines.join('\n')
}
