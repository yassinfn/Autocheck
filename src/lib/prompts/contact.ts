import type { AnalyseResult } from '@/types'

export const CONTACT_SYSTEM = `IMPORTANT — LANGUAGE RULE:
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

Tu es AutoCheck, un expert en évaluation de véhicules d'occasion.
RÈGLES ABSOLUES:
1. Réponds UNIQUEMENT avec du JSON valide, sans markdown ni texte autour
2. Tous les textes dans le JSON doivent être dans la langue détectée de l'annonce
3. Tous les montants dans la devise locale détectée, sans espaces insécables`

export function buildContactQuestionsPrompt(analyse: AnalyseResult, annonce?: string): string {
  const { vehicule, score, reputation, detection } = analyse

  const problemesText = reputation.problemesConnus
    .map(p => `- ${p.description} (gravité: ${p.gravite}, fréquence: ${p.frequence})`)
    .join('\n')

  const attentionText = score.pointsAttention.map(p => `- ${p}`).join('\n')

  const annonceSection = annonce?.trim()
    ? `
TEXTE ORIGINAL DE L'ANNONCE (source de vérité pour la règle anti-redondance):
---
${annonce.trim()}
---
`
    : ''

  return `Tu es AutoCheck. Génère un message de contact vendeur pour ce véhicule.

VÉHICULE: ${vehicule.marque} ${vehicule.modele} ${vehicule.annee} - ${vehicule.motorisation} ${vehicule.boite}
KILOMÉTRAGE: ${vehicule.kilometrage.toLocaleString()} km
PRIX: ${vehicule.prix} ${detection.symbole}
PROPRIÉTAIRES: ${vehicule.nombreProprietaires}
PAYS: ${detection.pays}
${annonceSection}
POINTS D'ATTENTION (NE PAS RÉVÉLER AU VENDEUR — formule des questions indirectes):
${attentionText || '- Aucun point particulier'}

PROBLÈMES CONNUS DU MODÈLE (NE PAS RÉVÉLER — formule des questions indirectes):
${problemesText || '- Aucun'}

RÈGLE ANTI-REDONDANCE — OBLIGATOIRE avant chaque question:
Avant de générer chaque question, vérifie si l'information est déjà mentionnée
explicitement dans le texte de l'annonce ci-dessus.

- Info présente ET complète → NE PAS poser la question
- Info présente MAIS incomplète → poser une question de PRÉCISION uniquement sur ce qui manque (km, facture, date, état de la partie non mentionnée)
- Info absente → poser la question normalement

Exemples de transformations obligatoires:
• Annonce dit "CT vierge" → ne pas demander l'état du CT
• Annonce dit "courroie faite" → demander uniquement "À quel kilométrage et avez-vous la facture ?"
• Annonce dit "pneus neufs à l'avant" → demander uniquement l'état des pneus arrière
• Annonce dit "plaquettes changées" → demander uniquement à quel km et si les disques ont été vérifiés
• Annonce dit "1 seul propriétaire" → ne pas redemander le nombre de propriétaires
• Annonce dit "non-fumeur" → ne pas demander si le véhicule a été fumé dedans
• Annonce dit "révisé en 2024" → ne pas demander si le véhicule est révisé, mais demander le kilométrage à la révision et si la facture est disponible

Priorise les 4 questions les plus importantes parmi celles que tu aurais posées. Préfère les questions sur les problèmes connus du modèle et les points d'attention au score.

AUTRES RÈGLES:
1. Rédigé en ${detection.langue}
2. 4 questions maximum, jamais génériques
3. Ne jamais nommer les problèmes connus — formule des questions indirectes
   Exemple: "avez-vous remarqué des bruits inhabituels ?" au lieu de "y a-t-il des problèmes de distribution ?"
4. Ton cordial, message prêt à copier-coller avec introduction et conclusion
5. Si vendeur professionnel détectable : ne pas demander pourquoi il vend

Réponds UNIQUEMENT avec ce JSON valide:
{
  "message": "Message complet prêt à copier-coller, avec introduction et conclusion",
  "questions": ["question 1", "question 2"]
}`
}

export function buildContactAnalysePrompt(
  analyse: AnalyseResult,
  reponses: string
): string {
  const { vehicule, score, reputation, detection, depenses } = analyse

  return `Tu es AutoCheck. Analyse les réponses du vendeur et mets à jour l'évaluation.

VÉHICULE: ${vehicule.marque} ${vehicule.modele} ${vehicule.annee} - ${vehicule.motorisation} ${vehicule.boite}
Kilométrage: ${vehicule.kilometrage.toLocaleString()} km | Prix demandé: ${vehicule.prix} ${detection.symbole}
Score initial: ${score.total}/100 | Pays: ${detection.pays} | Devise: ${detection.devise} (${detection.symbole})

DÉPENSES OBLIGATOIRES ESTIMÉES: ${depenses.totalObligatoiresMin} à ${depenses.totalObligatoiresMax} ${detection.symbole}

PROBLÈMES CONNUS DU MODÈLE:
${reputation.problemesConnus.map(p => `- ${p.description} (${p.gravite}, ${p.frequence})`).join('\n') || '- Aucun'}

RÉPONSES DU VENDEUR:
${reponses}

RÈGLES:
1. Rédige en ${detection.langue}
2. scoreUpdate entre -20 et +10 selon la qualité/transparence des réponses
3. scoreTotal = ${score.total} + scoreUpdate, entre 0 et 100
4. Montants en ${detection.devise} (${detection.symbole}), sans espaces insécables
5. prixCible = ${vehicule.prix} - reductionTotale
6. Au moins 1 argument de négociation concret basé sur les faits
7. bilanFinancier doit refléter les dépenses mises à jour après les réponses du vendeur

Réponds UNIQUEMENT avec ce JSON valide:
{
  "scoreUpdate": 0,
  "scoreTotal": ${score.total},
  "pointsPositifs": [],
  "alertes": [],
  "bilanFinancier": {
    "items": [{"poste": "", "detail": "", "montantMin": 0, "montantMax": 0}],
    "totalMin": 0,
    "totalMax": 0
  },
  "argumentNegociation": {
    "elements": [{"raison": "", "reduction": 0}],
    "reductionTotale": 0,
    "prixCible": 0
  },
  "recommandation": "Synthèse en 2-3 phrases"
}`
}
