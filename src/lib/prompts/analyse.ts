export const ANALYSE_SYSTEM = `Tu es AutoCheck, un expert indépendant en évaluation de véhicules d'occasion.
Tu analyses des annonces automobiles et fournis des évaluations structurées en JSON.
Tu détectes automatiquement la langue, le pays et la devise de l'annonce.

RÈGLES ABSOLUES:
1. Réponds UNIQUEMENT avec du JSON valide, sans markdown ni texte autour
2. Tous les textes dans le JSON doivent être dans la langue détectée de l'annonce
3. Tous les montants doivent être dans la devise locale détectée, sans espaces insécables
4. Analyse UNIQUEMENT la version exacte du véhicule (motorisation, boîte, année précises)`

import type { HistoryData } from '@/types'

function buildHistorySection(h: HistoryData): string {
  const lines: string[] = [
    '=== RAPPORT D\'HISTORIQUE OFFICIEL AUTOVIZA (données vérifiées — priorité absolue sur l\'annonce) ===',
  ]
  if (h.proprietaires !== undefined)
    lines.push(`Nombre de propriétaires VÉRIFIÉ: ${h.proprietaires}`)
  lines.push(`Immatriculation vérifiée: ${h.immatriculationVerifiee ? 'OUI' : 'NON'}`)
  lines.push(`Cohérence kilométrique: ${h.coherenceKm ? 'OUI' : 'ANOMALIE DÉTECTÉE'}`)
  if (h.relevesKm.length > 0)
    lines.push(
      `Relevés km: ${h.relevesKm.map(r => `${r.km.toLocaleString()} km (${r.date})`).join(' | ')}`
    )
  if (h.resume) lines.push(`\nDétail:\n${h.resume.slice(0, 800)}`)
  lines.push('=== FIN RAPPORT AUTOVIZA ===')
  return lines.join('\n')
}

export function buildAnalysePrompt(annonce: string, historyData?: HistoryData): string {
  const historySection = historyData ? `\n\n${buildHistorySection(historyData)}\n` : ''

  return `Analyse cette annonce de véhicule d'occasion et évalue-la.

GRILLE DE SCORE (100 points total — respecte exactement ces maximums):
- Fiabilité du modèle / réputation: max 10 pts
- Qualité de la génération/phase (version optimale du modèle): max 5 pts
- Kilométrage par rapport à l'âge: max 10 pts
- Prix par rapport au marché local: max 10 pts
- État du contrôle technique: max 10 pts
- Rappels constructeur non traités: max 10 pts
- Nombre de propriétaires (1→5pts, 2→3pts, 3→1pt, 4+→0pt): max 5 pts — si rapport Autoviza présent, utilise le nombre vérifié
- Qualité et nombre de photos: max 10 pts
- Cohérence et complétude de la description: max 10 pts
- Transparence du vendeur: max 10 pts
- Signaux de suspicion (absence de signal = 10pts): max 10 pts

DÉPENSES À PRÉVOIR: utilise les PRIX RÉELS du marché local du pays détecté.
Inclure: révision complète, pièces en fin de vie selon âge/km, kit distribution si applicable,
immatriculation/carte grise selon le pays, assurance annuelle estimée.

Réponds UNIQUEMENT avec ce JSON (textes en langue de l'annonce, montants sans espaces insécables):
{
  "detection": {
    "langue": "fr",
    "pays": "France",
    "devise": "EUR",
    "symbole": "€"
  },
  "vehicule": {
    "marque": "",
    "modele": "",
    "annee": 0,
    "version": "",
    "motorisation": "",
    "boite": "",
    "kilometrage": 0,
    "prix": 0,
    "nombreProprietaires": 1
  },
  "score": {
    "total": 0,
    "verdictType": "good",
    "verdict": "",
    "details": [
      {"critere": "", "points": 0, "maxPoints": 0, "commentaire": ""}
    ],
    "pointsAttention": [],
    "ressentGlobal": ""
  },
  "depenses": {
    "items": [
      {"poste": "", "detail": "", "montantMin": 0, "montantMax": 0}
    ],
    "totalMin": 0,
    "totalMax": 0
  }
}

verdictType doit être exactement: "excellent" (80-100), "good" (60-79), "risky" (40-59), ou "avoid" (0-39)
Le total du score doit être la somme des points de chaque critère.

ANNONCE À ANALYSER:
${annonce}${historySection}`
}

export function buildReputationPrompt(annonce: string): string {
  return `Extrais le véhicule de cette annonce (marque, modèle, année, motorisation exacte, boîte) et analyse sa réputation.

RÈGLE ABSOLUE: Analyse UNIQUEMENT cette version exacte (motorisation précise, type de boîte, plage d'années).
Ne jamais mélanger avec d'autres motorisations ou millésimes.

Rédige tous les textes dans la langue de l'annonce.

Réponds UNIQUEMENT avec ce JSON valide:
{
  "pointsForts": ["point 1", "point 2"],
  "problemesConnus": [
    {
      "description": "description du problème",
      "gravite": "faible",
      "frequence": "rare"
    }
  ],
  "rappelsConstructeur": [
    {
      "reference": "référence officielle",
      "description": "description du rappel"
    }
  ],
  "analyse_generation": {
    "generation": "Phase 2 restylée (2018-2021)",
    "est_meilleure_version": true,
    "explication": "Cette génération est considérée comme la plus aboutie du modèle.",
    "problemes_corriges_versions_suivantes": [],
    "conseil_version": "Bonne version à privilégier."
  }
}

gravite doit être: "faible", "modere" ou "eleve"
frequence doit être: "rare", "occasionnel" ou "frequent"
Si aucun rappel connu, mets rappelsConstructeur à [].
Inclure au moins 3 points forts et les problèmes les plus significatifs (max 6).
Pour analyse_generation: identifie précisément la génération/phase (ex: "Phase 1 (2015-2018)", "Restylage 2019", "Série 2 (2020+)").
Si cette génération a des problèmes non corrigés ET qu'une version ultérieure les a résolus, mettre est_meilleure_version à false.

ANNONCE:
${annonce}`
}
