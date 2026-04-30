import type { AnalyseResult, VisiteData, ContactVerdict } from '@/types'

export const DECISION_SYSTEM = `Tu es AutoCheck, expert en évaluation de véhicules d'occasion.
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

  const nokItems = visite?.items.filter(i => i.statut === 'nok') ?? []
  const okItems = visite?.items.filter(i => i.statut === 'ok') ?? []

  const visiteSection = visite
    ? `\nRÉSULTATS DE LA VISITE (${okItems.length} OK / ${nokItems.length} NOK):
${nokItems.length > 0
  ? nokItems.map(i => `  NOK — ${i.point}${i.note ? ` (${i.note})` : ''}`).join('\n')
  : '  Aucun problème détecté lors de la visite'}${visite.photoAnalyses.length > 0
  ? `\nANALYSES PHOTOS:\n${visite.photoAnalyses.map((a, i) => `  Photo ${i + 1}: ${a}`).join('\n')}`
  : ''}`
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
