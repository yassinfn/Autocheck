import type { AnalyseResult } from '@/types'

export const VISITE_SYSTEM = `Tu es AutoCheck, expert en inspection de véhicules d'occasion.
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

  return `Génère un scénario de visite guidée personnalisé pour l'inspection de ce véhicule d'occasion.

VÉHICULE: ${vehicule.marque} ${vehicule.modele} ${vehicule.annee} — ${vehicule.motorisation} ${vehicule.boite}
KILOMÉTRAGE: ${vehicule.kilometrage.toLocaleString()} km | ÂGE: ${age} an${age > 1 ? 's' : ''}
PRIX: ${vehicule.prix.toLocaleString()} ${detection.symbole}

POINTS D'ATTENTION DÉTECTÉS À L'ÉTAPE 1:
${attentions}

PROBLÈMES CONNUS DU MODÈLE:
${problemes}

CATÉGORIES OBLIGATOIRES (dans cet ordre exact):
1. Extérieur — carrosserie, vitrages, pneus, jantes
2. Compartiment moteur — huile, liquides, courroie, fuites
3. Habitacle — tableau de bord, voyants, équipements, odeurs
4. Dessous du véhicule — fuites, échappement, silencieux
5. Démarrage à froid — comportement moteur, fumées, bruits
6. Points spécifiques — basés sur les alertes et problèmes connus ci-dessus

RÈGLES:
1. Entre 14 et 18 étapes au total, bien réparties entre les 6 catégories
2. Catégorie "Points spécifiques": 1 étape par problème connu/alerte majeure (2 à 4 étapes max)
3. Instructions courtes et actionnables — 1 à 2 phrases max, ce que la personne fait physiquement
4. quoi_chercher: 2 à 3 éléments concrets par étape (pas plus)
5. si_nok: conseil pratique en 1 à 2 phrases max
6. photo_requise true pour: au moins 1 étape Extérieur, au moins 1 Compartiment moteur, toutes Dessous du véhicule, Points spécifiques à risque élevé
7. Tous les textes en ${detection.langue}
8. IDs au format: ext-1, ext-2, mot-1, hab-1, des-1, dem-1, spe-1, etc.

Réponds UNIQUEMENT avec ce JSON valide:
{
  "steps": [
    {
      "id": "ext-1",
      "categorie": "Extérieur",
      "titre": "Contrôle de la carrosserie",
      "instruction": "Faites le tour complet du véhicule en vous plaçant à 1-2 mètres de chaque panneau, sous différents angles de lumière.",
      "quoi_chercher": [
        "Différences de teinte entre les panneaux (signe de peinture refaite)",
        "Traces de rouille sur les bas de caisse et passages de roues",
        "Bosses ou rayures non mentionnées dans l'annonce"
      ],
      "photo_requise": true,
      "commentaire_possible": true,
      "si_nok": "Une différence de teinte entre panneaux indique une réparation après accident. Demandez l'historique des sinistres et négociez 500 à 1 500 € selon l'étendue des réparations. Si impact majeur non déclaré, abandonnez."
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
