import type { AnalyseResult, VisiteData, ContactVerdict } from '@/types'

export const DECISION_SYSTEM = `IMPORTANT — LANGUAGE RULE:
Detect the country of the listing from the URL or content.
Always respond ENTIRELY in the language of that country:
- France, Belgium, Switzerland (French) → respond in French
- Canada, USA, UK, Australia, Ireland → respond in English
- Spain → respond in Spanish
- Italy → respond in Italian
- Portugal, Brazil → respond in Portuguese
- Germany, Austria → respond in German
- Netherlands → respond in Dutch
Every single label, title, section header, verdict, recommendation and text must be in that language.
Never mix languages.

Tu es AutoCheck, expert en évaluation de véhicules d'occasion.
Tu synthétises toutes les étapes d'inspection pour donner une recommandation finale.
RÈGLES ABSOLUES:
1. Réponds UNIQUEMENT avec du JSON valide, sans markdown ni texte autour
2. Tous les textes doivent être dans la langue de l'annonce`

export function buildDecisionPrompt(
  analyse: AnalyseResult,
  visite?: VisiteData,
  contactVerdict?: ContactVerdict
): string {
  const { vehicule, score, depenses, detection } = analyse

  // Support new steps format and legacy items format
  const nokItems = visite?.steps?.filter(s => s.statut === 'nok')
    ?? visite?.items?.filter(i => i.statut === 'nok')
    ?? []
  const okItems = visite?.steps?.filter(s => s.statut === 'ok')
    ?? visite?.items?.filter(i => i.statut === 'ok')
    ?? []
  const passeItems = visite?.steps?.filter(s => s.statut === 'passe') ?? []

  const nokText = nokItems.length > 0
    ? nokItems.map(i => {
        const label = 'titre' in i ? (i as { titre: string }).titre : (i as { point: string }).point
        const note = 'commentaire' in i ? (i as { commentaire: string }).commentaire : (i as { note: string }).note
        return `  NOK — ${label}${note ? ` (${note})` : ''}`
      }).join('\n')
    : '  Aucun problème détecté lors de la visite'

  const visiteSection = visite
    ? `\nRÉSULTATS DE LA VISITE (${okItems.length} OK / ${nokItems.length} NOK / ${passeItems.length} passés):
${nokText}`
    : ''

  const contactSection = contactVerdict
    ? `\nRÉSULTATS CONTACT VENDEUR:
  Score après contact: ${contactVerdict.scoreTotal}/100 (${contactVerdict.scoreUpdate >= 0 ? '+' : ''}${contactVerdict.scoreUpdate} pts)
  Points positifs: ${contactVerdict.pointsPositifs.join(', ') || 'aucun'}
  Alertes: ${contactVerdict.alertes.join(', ') || 'aucune'}
  Recommandation: ${contactVerdict.recommandation}`
    : ''

  const existingArgs = contactVerdict?.argumentNegociation.elements.length
    ? `\nARGUMENTS NÉGOCIATION DÉJÀ IDENTIFIÉS:\n${contactVerdict.argumentNegociation.elements
        .map(e => `  - ${e.raison}: -${e.reduction} ${detection.symbole}`)
        .join('\n')}`
    : ''

  return `Synthétise toutes les données de l'inspection et donne la recommandation finale.

VÉHICULE: ${vehicule.marque} ${vehicule.modele} ${vehicule.annee} — ${vehicule.version || vehicule.motorisation}
KILOMÉTRAGE: ${vehicule.kilometrage.toLocaleString()} km
PRIX DEMANDÉ: ${vehicule.prix.toLocaleString()} ${detection.symbole}
PROPRIÉTAIRES: ${vehicule.nombreProprietaires}

SCORE INITIAL: ${score.total}/100 — ${score.verdict}
POINTS D'ATTENTION: ${score.pointsAttention.join('; ') || 'aucun'}
DÉPENSES OBLIGATOIRES ESTIMÉES: ${depenses.totalObligatoiresMin.toLocaleString()} – ${depenses.totalObligatoiresMax.toLocaleString()} ${detection.symbole}
${visiteSection}${contactSection}${existingArgs}

RÈGLES POUR LA DÉCISION:
- "acheter": score global ≥ 75, pas de risque majeur, prix correct
- "negocier": score 45-74 ou problèmes mineurs ou prix surestimé
- "refuser": score < 45 ou problème grave détecté lors de la visite

Pour prixCible: prix demandé − reductionTotale. Si pas d'arguments: reductionTotale = 0, prixCible = prix demandé.
Intègre les éléments NOK de la visite comme arguments de négociation supplémentaires.

Réponds UNIQUEMENT avec ce JSON valide (textes en ${detection.langue}):
{
  "decision": "negocier",
  "scoreGlobal": 67,
  "titre": "Titre court et précis",
  "resume": "Résumé en 1-2 phrases.",
  "pointsPositifs": ["point positif 1", "point positif 2"],
  "risques": ["risque 1"],
  "argumentsNegociation": [
    {"raison": "Description du motif", "reduction": 500}
  ],
  "reductionTotale": 500,
  "prixCible": 8500,
  "conclusion": "Conclusion actionnable en 2-3 phrases."
}

decision doit être exactement: "acheter", "negocier" ou "refuser"`
}
