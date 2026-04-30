import type { AnalyseResult } from '@/types'

export const VISITE_SYSTEM = `IMPORTANT — LANGUAGE RULE:
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

Tu es AutoCheck, expert en inspection de véhicules d'occasion.
RÈGLES ABSOLUES:
1. Réponds UNIQUEMENT avec du JSON valide, sans markdown ni texte autour
2. Instructions dans la langue de l'annonce`

export function buildChecklistPrompt(analyse: AnalyseResult): string {
  const { vehicule, reputation, detection } = analyse

  const problemes = reputation.problemesConnus
    .map(p => `- ${p.description} (gravité: ${p.gravite}, fréquence: ${p.frequence})`)
    .join('\n') || '- Aucun problème spécifique connu'

  return `Génère une checklist de contrôle pour la visite de ce véhicule.

VÉHICULE: ${vehicule.marque} ${vehicule.modele} ${vehicule.annee} - ${vehicule.motorisation} ${vehicule.boite}
KILOMÉTRAGE: ${vehicule.kilometrage.toLocaleString()} km

PROBLÈMES CONNUS DU MODÈLE (à inspecter en priorité, sans nommer le problème directement):
${problemes}

RÈGLES:
1. 15 à 20 points répartis dans 5 catégories exactes: Extérieur, Moteur, Intérieur, Dessous de caisse, Essai routier
2. Instructions précises et actionnables (1-3 phrases max par point)
3. Pour chaque problème connu du modèle, inclure un point d'inspection dédié formulé indirectement
   (ex: si problème de distribution connu → "Démarrage à froid" avec instruction d'écoute)
4. Instructions en ${detection.langue}
5. IDs au format: "ext-1", "mot-1", "int-1", "des-1", "ess-1", etc.

Réponds UNIQUEMENT avec ce JSON valide:
{
  "categories": [
    {
      "nom": "Extérieur",
      "items": [
        {"id": "ext-1", "point": "Carrosserie et peinture", "instruction": "Regardez la voiture de côté sous la lumière. Des ondulations ou des différences de teinte indiquent une réparation après accident. Vérifiez l'uniformité des espaces entre les portes et le capot."}
      ]
    }
  ]
}`
}

export function buildPhotoPrompt(): string {
  return `Analyse cette photo prise lors de la visite d'un véhicule d'occasion.
Décris précisément ce que tu observes : état de la pièce, défauts visibles (rouille, fuite, usure anormale, dommages, craquelures, traces).
Sois factuel et concis. Mentionne clairement tout élément préoccupant.
Maximum 3 phrases.`
}

export function buildScenarioPrompt(analyse: AnalyseResult): string {
  const { vehicule, score, reputation, detection } = analyse
  const age = new Date().getFullYear() - vehicule.annee

  const problemes = reputation.problemesConnus
    .map(p => `- ${p.description} (${p.gravite}, ${p.frequence})`)
    .join('\n') || '- Aucun problème spécifique connu'

  const attentions = score.pointsAttention.map(p => `- ${p}`).join('\n') || '- Aucun'

  return `Génère un scénario de visite en DEUX NIVEAUX pour l'inspection de ce véhicule d'occasion.

VÉHICULE: ${vehicule.marque} ${vehicule.modele} ${vehicule.annee} — ${vehicule.motorisation} ${vehicule.boite}
KILOMÉTRAGE: ${vehicule.kilometrage.toLocaleString()} km | ÂGE: ${age} an${age > 1 ? 's' : ''}
PRIX: ${vehicule.prix.toLocaleString()} ${detection.symbole}

POINTS D'ATTENTION DÉTECTÉS:
${attentions}

PROBLÈMES CONNUS DU MODÈLE:
${problemes}

━━━ NIVEAU 1 — CONTRÔLE RAPIDE (champ "niveau": 1) ━━━
• 5 à 10 points MAXIMUM — observable par quelqu'un qui n'a jamais ouvert un capot
• Zéro jargon technique — reformuler en action concrète et sensorielle
  ❌ "Vérifiez l'arbre du turbocompresseur pour détecter un jeu axial"
  ✅ "Regardez sous la voiture — y a-t-il des traces de liquide ou d'huile sur le sol ?"
• Exemples de contrôles simples (à adapter selon ce véhicule) :
  - Regarder sous la voiture (fuites au sol)
  - Démarrer le moteur (voyants qui restent allumés)
  - Observation fumée échappement
  - État général carrosserie (bosses, rouille visible)
  - État des pneus à l'œil
  - Niveau d'huile sur la jauge
  - Bruit au démarrage à froid
  - Odeur habitacle (humidité)
  - Équipements simples (clim, vitres électriques)
• photo_requise: true pour 2 à 3 points seulement
• quoi_chercher: 2 éléments max, formulés simplement

━━━ NIVEAU 2 — INSPECTION COMPLÈTE (champ "niveau": 2) ━━━
• 10 à 15 points supplémentaires — plus techniques mais expliqués clairement
• Couvre les catégories: Compartiment moteur (détail), Dessous du véhicule, Essai routier, Points spécifiques au modèle
• Les problèmes connus du modèle (FAP, DSG, EGR, distribution, etc.) vont ici — 1 point par problème
• Instructions: 1 à 2 phrases max, action physique claire
• quoi_chercher: 2 à 3 éléments concrets
• photo_requise: true pour toutes les étapes Dessous du véhicule et Points spécifiques à risque élevé
• image_query: requête Google Images EN ANGLAIS pour illustrer l'inspection sur CE modèle. "" si non pertinent.
• youtube_query: requête YouTube en ${detection.langue} pour vidéo explicative. "" si non pertinent.

RÈGLES COMMUNES:
1. Tous les textes en ${detection.langue}
2. si_nok: conseil pratique en 1 à 2 phrases max
3. IDs niveau 1: n1-1, n1-2, ... / IDs niveau 2: n2-1, n2-2, ...
4. Les steps niveau 1 doivent apparaître EN PREMIER dans le tableau, puis les niveau 2
5. commentaire_possible: true pour tous les points

Réponds UNIQUEMENT avec ce JSON valide:
{
  "steps": [
    {
      "id": "n1-1",
      "categorie": "Premier regard",
      "niveau": 1,
      "titre": "Fuites sous le véhicule",
      "instruction": "Regardez sous la voiture avant même de la démarrer. Y a-t-il des taches ou des traces de liquide sur le sol ?",
      "quoi_chercher": [
        "Taches d'huile sombre sous le moteur",
        "Traces de liquide coloré (vert/rouge = liquide de refroidissement)"
      ],
      "photo_requise": false,
      "commentaire_possible": true,
      "si_nok": "Des fuites actives sont un signal sérieux. Demandez les derniers entretiens et faites vérifier par un mécanicien avant d'acheter.",
      "image_query": "",
      "youtube_query": ""
    },
    {
      "id": "n2-1",
      "categorie": "Compartiment moteur",
      "niveau": 2,
      "titre": "Couleur du liquide de refroidissement",
      "instruction": "Ouvrez le bouchon du vase d'expansion (ne pas ouvrir moteur chaud). Regardez la couleur du liquide.",
      "quoi_chercher": [
        "Liquide marron ou noirâtre (signe de mélange avec huile)",
        "Niveau sous le minimum"
      ],
      "photo_requise": true,
      "commentaire_possible": true,
      "si_nok": "Un liquide trouble ou marron peut indiquer un joint de culasse défaillant — réparation coûteuse. Abandonnez ou négociez fortement.",
      "image_query": "${vehicule.marque} ${vehicule.modele} coolant reservoir inspection",
      "youtube_query": "vérifier liquide refroidissement voiture occasion"
    }
  ]
}`
}

export function buildVideoAnalysePrompt(audioDescription: string, langue: string, frameCount: number): string {
  return `Tu es AutoCheck, expert en inspection de moteurs de voitures d'occasion.
Tu reçois ${frameCount} image(s) extraite(s) d'une vidéo du compartiment moteur, ainsi qu'une analyse audio.

ANALYSE AUDIO DU MOTEUR:
${audioDescription}

RÈGLES:
1. Analyse visuelle : cherche fuites (huile, liquide de refroidissement), corrosion, câbles/tuyaux abîmés, niveaux visibles, état général
2. Analyse sonore : évalue à partir des métriques audio fournies
3. verdict_visuel / verdict_sonore / verdict_global : "sain", "suspect" ou "critique"
4. "critique" = problème grave nécessitant réparation urgente avant achat
5. "suspect" = anomalie à investiguer, potentiellement préoccupante
6. "sain" = aucun problème apparent
7. Réponds UNIQUEMENT avec du JSON valide (textes en ${langue})

{
  "verdict_visuel": "sain",
  "detail_visuel": "Description factuelle de ce que les images révèlent.",
  "verdict_sonore": "suspect",
  "detail_sonore": "Interprétation du profil sonore.",
  "verdict_global": "suspect",
  "recommandations": "Conseils concrets et actionnables.",
  "analyse_date": ""
}`
}
