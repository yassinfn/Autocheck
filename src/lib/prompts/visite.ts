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
