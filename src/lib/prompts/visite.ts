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

  const problemes = (reputation?.problemesConnus ?? [])
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
   - 0 à 9 entrées maximum
   - IMPORTANT : utilise UNIQUEMENT les IDs listés dans la section POINTS UNIVERSELS DÉJÀ COUVERTS ci-dessus, à la lettre exacte. Tout ID non listé sera ignoré par le système.
   - Valeur = 1 à 2 phrases de contexte ULTRA spécifique à ce véhicule (modèle, génération, kilométrage)
   - Si rien de spécifique pour un ID, NE PAS l'inclure du tout
   - ✅ Bon : "Sur cette génération, contrôler l'usure intérieure des pneus avant — défaut connu de parallélisme progressif."
   - ✅ Bon : "Diesel à plus de 200 000 km : guetter une fumée bleue prolongée après démarrage, signe d'usure turbo."
   - ❌ Mauvais : "Bien vérifier la carrosserie." (générique, pas d'info nouvelle)
   - ❌ Mauvais : "Faire attention à la rouille." (déjà dans le quoi_chercher universel)

2. STEPS SPÉCIFIQUES (tableau "steps_specifiques") :
   - Exactement 3 à 5 étapes
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
