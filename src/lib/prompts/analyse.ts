export const ANALYSE_SYSTEM = `IMPORTANT — LANGUAGE RULE:
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

Tu es AutoCheck, un expert indépendant en évaluation de véhicules d'occasion.
Tu analyses des annonces automobiles et fournis des évaluations structurées en JSON.
Tu détectes automatiquement la langue, le pays et la devise de l'annonce.

RÈGLES ABSOLUES:
1. Réponds UNIQUEMENT avec du JSON valide, sans markdown ni texte autour
2. Tous les textes dans le JSON doivent être dans la langue détectée de l'annonce
3. Tous les montants doivent être dans la devise locale détectée, sans espaces insécables
4. Analyse UNIQUEMENT la version exacte du véhicule (motorisation, boîte, année précises)`

import type { HistoryData } from '@/types'

function detectKmAnomalies(relevesKm: HistoryData['relevesKm']): string[] {
  const anomalies: string[] = []
  const sorted = [...relevesKm].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const daysDiff = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24)
    const kmDiff = curr.km - prev.km
    if (daysDiff > 0 && daysDiff <= 31 && kmDiff > 2000) {
      anomalies.push(
        `⚠️⚠️ ANOMALIE KILOMÉTRIQUE DÉTECTÉE — +${kmDiff.toLocaleString('fr-FR')} km en ${Math.round(daysDiff)} jour(s) entre le ${prev.date} (${prev.km.toLocaleString('fr-FR')} km) et le ${curr.date} (${curr.km.toLocaleString('fr-FR')} km). Vérifier si le compteur a été falsifié.`
      )
    }
  }
  return anomalies
}

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
      `Relevés km: ${h.relevesKm.map(r => `${r.km.toLocaleString()} km (${r.date}${r.source ? ` — ${r.source}` : ''})`).join(' | ')}`
    )

  const kmAnomalies = detectKmAnomalies(h.relevesKm)
  if (kmAnomalies.length > 0) {
    lines.push('\nANOMALIES PRÉ-CALCULÉES (à inclure telles quelles dans pointsAttention):')
    kmAnomalies.forEach(a => lines.push(a))
  }

  if (h.resume) lines.push(`\nDétail:\n${h.resume.slice(0, 1200)}`)
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

DÉPENSES À PRÉVOIR: utilise les PRIX RÉELS du marché local du pays détecté. 3 catégories:
- obligatoires: révision complète (vidange+filtres) + diagnostics spécifiques au véhicule selon ses points d'attention (ex: diagnostic injecteurs, diagnostic chaîne distribution) — 2 à 4 postes max
- eventuelles: remplacements potentiels selon résultats diagnostic (ex: injecteurs, FAP, EGR, distribution) — générés dynamiquement selon l'état probable du véhicule, 2 à 5 postes
- fraisAchat: carte grise/immatriculation selon pays et puissance fiscale + assurance annuelle estimée — 2 postes exactement
- totalObligatoiresMin/Max = somme des postes "obligatoires" UNIQUEMENT

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
    "obligatoires": [
      {"poste": "", "detail": "", "montantMin": 0, "montantMax": 0}
    ],
    "eventuelles": [
      {"poste": "", "detail": "", "montantMin": 0, "montantMax": 0}
    ],
    "fraisAchat": [
      {"poste": "", "detail": "", "montantMin": 0, "montantMax": 0}
    ],
    "totalObligatoiresMin": 0,
    "totalObligatoiresMax": 0
  },
  "signauxAlerte": [
    {
      "niveau": "eleve",
      "categorie": "annonce",
      "titre": "Exemple titre 8 mots max",
      "explication": "1-2 phrases factuelles sur pourquoi c'est suspect.",
      "action": "1 phrase concrète sur ce que l'acheteur doit faire."
    }
  ]
}

verdictType doit être exactement: "excellent" (80-100), "good" (60-79), "risky" (40-59), ou "avoid" (0-39)
Le total du score doit être la somme des points de chaque critère.
${historySection ? `
━━━ ANALYSE OBLIGATOIRE DU RAPPORT AUTOVIZA ━━━

Si un rapport Autoviza est présent, tu DOIS analyser le champ "Détail" pour détecter ces 4 patterns et ajouter les alertes correspondantes dans pointsAttention. Rédige les alertes dans la langue de l'annonce.

PATTERN 1 — ACQUISITION PAR SOCIÉTÉ
Si "Détail" mentionne un titulaire qui est une société (SARL, SAS, SA, SCI, auto-école, VTC, concessionnaire, flotte, leasing, ou tout nom commercial):
• 1 société → ajouter dans pointsAttention: "⚠️ USAGE PROFESSIONNEL — Titulaire société : [nom]. Usage professionnel probable (flotte, VTC, commerciaux), entretien parfois négligé, usure multi-conducteurs. Exiger le carnet d'entretien complet et toutes les factures."
• 2 sociétés différentes → ajouter: "⚠️⚠️ HISTORIQUE SUSPECT — Acquisition par 2 sociétés différentes : [société1] et [société2]. Usage professionnel intensif cumulé, risque d'entretien lacunaire. Exiger absolument toutes les factures et carnet d'entretien."

PATTERN 2 — REPRISE RAPIDE PAR 2 PROFESSIONNELS
Si 2 entités professionnelles (marchands, concessionnaires) ont chacune détenu ce véhicule et la durée entre les 2 reprises est inférieure à 3 mois:
→ ajouter: "⚠️⚠️ HISTORIQUE SUSPECT — Repris par 2 marchands en moins de 3 mois. Pourquoi ce véhicule ne se vend-il pas ? Problème mécanique caché possible. Exiger un diagnostic complet avant toute décision."

PATTERN 3 — KILOMÉTRAGE ANNUEL ÉLEVÉ
Calcule : kilométrage annoncé ÷ (année actuelle − année du véhicule) = km/an
Si km/an > 20 000:
→ ajouter: "⚠️ USAGE INTENSIF — [X] km/an calculé (moyenne ~15 000 km/an). Usure accélérée sur la distribution, les freins et la boîte. Prévoir des contrôles approfondis."

PATTERN 4 — ROTATION DE PROPRIÉTAIRES ÉLEVÉE
Si nombre de propriétaires > 2 et durée de possession totale < 3 ans (selon dates disponibles ou données du rapport):
→ ajouter: "⚠️ ROTATION ÉLEVÉE — [N] propriétaires en moins de 3 ans. Questionner systématiquement le motif de chaque revente."

ANOMALIES PRÉ-CALCULÉES : si des anomalies kilométriques apparaissent dans la section "ANOMALIES PRÉ-CALCULÉES" du rapport, copie-les telles quelles dans pointsAttention.

━━━ FIN RÈGLES AUTOVIZA ━━━
` : ''}
━━━ SIGNAUX D'ALERTE À DÉTECTER (champ "signauxAlerte") ━━━

Analyse l'annonce pour détecter des drapeaux rouges. Retourne 0 à 8 signaux.
SOIS HONNÊTE : si tout va bien, retourne []. Ne force PAS la détection.
niveau: "faible" | "modere" | "eleve" — categorie: "prix" | "annonce" | "incoherence" | "vendeur"
titre: 8 mots max, percutant — explication: 1-2 phrases factuelles — action: 1 phrase concrète.

CHECK 1 — PRIX ANORMALEMENT BAS (categorie: "prix")
Estime le prix marché pour cette marque/modèle/année/km. Si prix demandé < 75% de ton estimation → signal "eleve".

CHECK 2 — PRIX TROP ROND (categorie: "prix")
Si prix = multiple parfait de 1000 ET contexte suspect (ex: véhicule récent à 10 000 €) → signal "faible".

CHECK 3 — DESCRIPTION BÂCLÉE (categorie: "annonce")
Si description < 80 mots OU aucune mention d'entretien/historique/factures → signal "modere".

CHECK 4 — MOTS-CLÉS D'URGENCE (categorie: "annonce")
Cherche: "urgent", "doit partir vite", "départ étranger", "cause déménagement", "cause divorce", "héritage", "saisie". Si présent → signal "modere".

CHECK 5 — CT NON MENTIONNÉ (categorie: "annonce")
Si véhicule > 4 ans ET aucune mention du contrôle technique → signal "eleve" (CT obligatoire pour vendre).

CHECK 6 — KILOMÉTRAGE ATYPIQUE (categorie: "incoherence")
km/an = kilométrage / (année actuelle − année véhicule).
< 5 000 km/an → signal "modere" (compteur possiblement trafiqué ou très peu roulé).
> 25 000 km/an → signal "modere" (usage commercial/intensif probable).

CHECK 7 — INCOHÉRENCE VERSION/MOTORISATION (categorie: "incoherence")
Si version annoncée (ex: "GTI", "Sport", "S-line") ne correspond pas aux caractéristiques techniques typiques → signal "eleve".

CHECK 8 — PRO DÉGUISÉ EN PARTICULIER (categorie: "vendeur")
Indices: "garantie 6 mois", "garantie 12 mois", "facture fournie", "reconditionné", "TVA récupérable", "société". Si présent ET vendeur se dit "particulier" → signal "eleve".

━━━ FIN SIGNAUX D'ALERTE ━━━

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
