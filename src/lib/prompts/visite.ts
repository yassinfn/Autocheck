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

export function buildScenarioPrompt(
  analyse: AnalyseResult,
  universalIds: string[]
): string {
  const { vehicule, score, reputation, detection } = analyse
  const age = new Date().getFullYear() - vehicule.annee

  const ID_TITLES: Record<string, string> = {
    'univ-1-premier-regard': 'Premier regard — vue d\'ensemble',
    'univ-2-carrosserie': 'Carrosserie — panneaux et seuils',
    'univ-3-moteur-compartiment': 'Compartiment moteur / Baie moteur',
    'univ-4-huiles-fluides': 'Huiles et fluides',
    'univ-5-demarrage': 'Démarrage à froid',
    'univ-5-batterie-traction': 'Batterie de traction — santé et autonomie',
    'univ-6-habitacle': 'Habitacle — état général',
    'univ-7-dessous': 'Dessous du véhicule',
    'univ-7-charge': 'Recharge — port et câbles',
    'univ-8-essai-dynamique': 'Comportement routier',
    'univ-9-freinage': 'Freinage et direction',
    'univ-10-hybride-batterie': 'Batterie hybride — état et intégration',
  }

  const attentions = score.pointsAttention.map(p => `- ${p}`).join('\n') || '- Aucun'

  const problemes = (reputation?.problemesConnus ?? [])
    .map(p => `- ${p.description} (${p.gravite}, ${p.frequence})`)
    .join('\n') || '- Aucun problème spécifique connu'

  const analyseGen = reputation?.analyse_generation
  const genBloc = analyseGen
    ? `\nANALYSE DE GÉNÉRATION :
${analyseGen.explication}
Problèmes corrigés sur générations suivantes :
${analyseGen.problemes_corriges_versions_suivantes.length
  ? analyseGen.problemes_corriges_versions_suivantes.map(p => `- ${p}`).join('\n')
  : '- Aucun'
}\n`
    : ''

  const universalList = universalIds
    .map(id => `- ${id} : ${ID_TITLES[id] ?? id}`)
    .join('\n')

  return `Génère un complément de scénario d'inspection pour ce véhicule d'occasion.

━━━ RÈGLE DE BRIÈVETÉ ABSOLUE ━━━
Chaque texte produit doit être aussi court que possible. Pas d'introduction, pas de phrases qualifiantes. Va droit au point technique.
❌ "Sur ce 1.6 D-4D co-développé BMW/PSA, localiser le couvre-culasse et inspecter les abords de la chaîne de distribution côté droit : toute trace d'huile ou suintement est un signal d'alarme prioritaire." (INTERDIT — 40+ mots)
✅ "Chaîne de distribution côté droit : vérifier suintement d'huile au couvre-culasse — faiblesse connue de cette motorisation." (OK — 20 mots)
La verbosité fait planter la génération.

VÉHICULE : ${vehicule.marque} ${vehicule.modele} ${vehicule.annee} — ${vehicule.motorisation} ${vehicule.boite}
KILOMÉTRAGE : ${vehicule.kilometrage.toLocaleString()} km | ÂGE : ${age} an${age > 1 ? 's' : ''}
PRIX : ${vehicule.prix.toLocaleString()} ${detection.symbole}

POINTS D'ATTENTION DÉTECTÉS :
${attentions}

PROBLÈMES CONNUS DU MODÈLE :
${problemes}
${genBloc}
━━━ POINTS UNIVERSELS DÉJÀ COUVERTS ━━━

Ces points sont DÉJÀ inclus dans le scénario. Ne les recrée PAS dans steps_specifiques.
Tu peux les ENRICHIR via la map "enrichissements" avec du contexte ultra-spécifique à ce véhicule.

${universalList}

━━━ CE QUE TU DOIS GÉNÉRER ━━━

1. ENRICHISSEMENTS (objet "enrichissements") :
   - MAXIMUM 3 entrées — choisis les 3 IDs où tu as l'info LA PLUS spécifique à ce véhicule
   - Si moins de 3 infos vraiment spécifiques, mets moins (0, 1 ou 2)
   - IMPORTANT : utilise UNIQUEMENT les IDs listés dans la section POINTS UNIVERSELS DÉJÀ COUVERTS ci-dessus, à la lettre exacte. Tout ID non listé sera ignoré par le système.
   - Chaque valeur : MAXIMUM 40 MOTS (compte-les) — pas d'introduction type "Sur ce modèle..." ou "Pour cette génération...", entre immédiatement dans le sujet
   - ✅ "Chaîne de distribution côté droit : vérifier suintement d'huile au couvre-culasse — faiblesse connue de cette motorisation."
   - ✅ "Diesel >200 000 km : fumée bleue prolongée après démarrage = usure turbo."
   - ❌ "Sur ce 1.6 D-4D co-développé BMW/PSA, localiser le couvre-culasse et inspecter les abords..." (trop long)
   - ❌ "Bien vérifier la carrosserie." (générique)

2. STEPS SPÉCIFIQUES (tableau "steps_specifiques") :
   - 3 à 5 étapes — vise 3 ou 4, pas 5 par défaut
   - titre : MAXIMUM 6 mots
   - instruction : MAXIMUM 30 mots
   - quoi_chercher : 2 à 3 éléments, MAXIMUM 15 mots chacun
   - si_nok : MAXIMUM 25 mots
   - image_query / youtube_query : 4 à 6 mots max
   - Couvrent UNIQUEMENT : problèmes connus du modèle (FAP, DSG, EGR, distribution, turbo...), particularités de cette génération, seuils de kilométrage critique
   - NE PAS couvrir : carrosserie, pneus, fluides généraux, démarrage standard, habitacle, dessous standard, essai routier (couverts par les universels)
   - NE PAS couvrir : historique, CT, factures, nombre de propriétaires (Module 2)
   - IDs : "spe-1", "spe-2", ..., "spe-5"
   - Catégorie : "Points spécifiques" par défaut ; "Compartiment moteur" ou "Dessous du véhicule" si plus précis
   - Niveau : 2 par défaut ; 1 seulement si le point est ultra-visible sans démontage
   - Tous les textes en ${detection.langue}
   - Style AutoCheck : instructions actionnables, zéro jargon, ton accessible

━━━ FORMAT DE RÉPONSE ━━━

Ordre des champs : "enrichissements" en premier, "steps_specifiques" ensuite.
Réponds UNIQUEMENT avec ce JSON, sans markdown ni texte autour :

{
  "enrichissements": {
    "univ-3-moteur-compartiment": "Sur ce modèle, vérifier en particulier...",
    "univ-5-demarrage": "À ce kilométrage, surveiller..."
  },
  "steps_specifiques": [
    {
      "id": "spe-1",
      "categorie": "Points spécifiques",
      "niveau": 2,
      "titre": "...",
      "instruction": "...",
      "quoi_chercher": ["...", "..."],
      "photo_requise": true,
      "commentaire_possible": true,
      "si_nok": "...",
      "image_query": "...",
      "youtube_query": "..."
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
