import type { VisiteStep } from '@/types'

export type MotorisationType = 'essence' | 'diesel' | 'hybride' | 'electrique'

export type UniversalEnrichments = Record<string, string>

export function detectMotorisation(motorisation: string): MotorisationType {
  const m = motorisation.toLowerCase()
  if (m.includes('hybride') || m.includes('hybrid') || m.includes('phev') || m.includes('hev')) return 'hybride'
  if (m.includes('électrique') || m.includes('electrique') || m.includes('electric') || m.includes('bev') || m.includes('ev')) return 'electrique'
  if (m.includes('diesel') || m.includes('hdi') || m.includes('tdi') || m.includes('cdti') || m.includes('dci') || m.includes('jtd') || m.includes('crd')) return 'diesel'
  return 'essence'
}

// ─── THERMIQUE (essence & diesel) ────────────────────────────────────────────

const UNIVERSAL_STEPS_THERMIQUE: VisiteStep[] = [
  {
    id: 'univ-1-premier-regard',
    categorie: 'Extérieur',
    titre: 'Premier regard — vue d\'ensemble',
    instruction: 'Faites le tour complet du véhicule en vous plaçant à 3-4 mètres. L\'objectif est une impression globale avant d\'entrer dans les détails.',
    quoi_chercher: [
      'Alignement général des panneaux de carrosserie',
      'Différences de teinte entre les panneaux (signe de repeinture partielle)',
      'Carrosserie bombée, enfoncée ou ondulée',
      'Toit, gouttières et montants de portes',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Notez les panneaux suspects. Toute différence de teinte visible à 3 m indique une reprise après accident ou une réparation non déclarée.',
    image_query: 'car exterior inspection walkthrough',
    youtube_query: 'inspection extérieure voiture occasion',
    niveau: 1,
  },
  {
    id: 'univ-2-carrosserie',
    categorie: 'Extérieur',
    titre: 'Carrosserie — panneaux et seuils',
    instruction: 'Placez-vous de côté en regardant chaque panneau en contre-jour. Passez lentement la main à plat sur les surfaces pour détecter les ondulations.',
    quoi_chercher: [
      'Ondulations visibles en contre-jour (signe de mastic)',
      'Micro-fissures dans la peinture ou texture granuleuse',
      'Seuils de portes, bas de caisse et passages de roues (rouille)',
      'Joints de portes et de vitres en bon état, bien collés',
    ],
    photo_requise: true,
    commentaire_possible: true,
    si_nok: 'Toute ondulation ou peinture granuleuse indique du mastic derrière. Demandez un rapport d\'historique et faites contrôler par un carrossier avant d\'acheter.',
    image_query: 'car body panel inspection contre-jour light',
    youtube_query: 'contrôle carrosserie occasion mastic repeinture',
    niveau: 1,
  },
  {
    id: 'univ-3-moteur-compartiment',
    categorie: 'Compartiment moteur',
    titre: 'Compartiment moteur — premier contrôle',
    instruction: 'Ouvrez le capot moteur FROID. Prenez le temps de sentir, observer la propreté générale et chercher les traces de suintement avant de toucher quoi que ce soit.',
    quoi_chercher: [
      'Traces d\'huile noire sur le bas-moteur, culasse ou durites',
      'Liquide de refroidissement marron ou laiteux (contamination huile/eau)',
      'Câblage bricolé, faisceaux abîmés ou ruban adhésif visible',
      'Rouille sur les supports moteur et la structure de la baie',
    ],
    photo_requise: true,
    commentaire_possible: true,
    si_nok: 'Des traces d\'huile importantes ou un liquide de refroidissement marron sont des signaux critiques. N\'achetez pas sans diagnostic professionnel préalable.',
    image_query: 'engine bay inspection used car oil leaks',
    youtube_query: 'inspection compartiment moteur occasion fuites',
    niveau: 1,
  },
  {
    id: 'univ-4-huiles-fluides',
    categorie: 'Compartiment moteur',
    titre: 'Huiles et fluides — qualité et niveaux',
    instruction: 'Contrôlez chaque jauge et chaque bouchon. Lisez la couleur et l\'état des fluides — pas seulement les niveaux.',
    quoi_chercher: [
      'Huile moteur : couleur (noire = longtemps pas changée, laiteuse = eau dans l\'huile)',
      'Liquide de refroidissement : niveau et couleur (doit être coloré et propre)',
      'Liquide de frein : niveau et couleur (foncé = à changer impérativement)',
      'Liquide de direction assistée si présent',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Huile laiteuse ou niveaux très bas sans fuite visible sont des signaux critiques. Refus conseillé ou expertise moteur préalable.',
    niveau: 1,
  },
  {
    id: 'univ-5-demarrage',
    categorie: 'Démarrage à froid',
    titre: 'Démarrage à froid',
    instruction: 'Demandez que le véhicule soit FROID au moment de votre visite — c\'est non négociable. Observez et écoutez pendant les 3 à 5 premières minutes de chauffe.',
    quoi_chercher: [
      'Bruits au démarrage : cliquetis, cognement ou sifflement',
      'Fumée bleue = huile brûlée, noire = mélange trop riche, blanche épaisse persistante = joint de culasse',
      'Ralenti irrégulier, papillotement ou à-coups en phase de chauffe',
      'Voyants moteur ou huile qui restent allumés après démarrage',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Fumée bleue ou blanche épaisse = moteur potentiellement en fin de vie. Cliquetis au démarrage = usure hydraulique avancée. Ne continuez pas sans expertise moteur.',
    image_query: 'cold start engine smoke inspection',
    youtube_query: 'démarrage à froid fumée diagnostic occasion',
    niveau: 1,
  },
  {
    id: 'univ-6-habitacle',
    categorie: 'Habitacle',
    titre: 'Habitacle — état général et équipements',
    instruction: 'Montez à bord et testez chaque commande systématiquement. Ne vous laissez pas influencer par l\'odeur de propre ou le rangement soigné.',
    quoi_chercher: [
      'Kilométrage cohérent avec l\'usure réelle des pédales, du volant et du siège conducteur',
      'Toutes les commandes fonctionnelles : vitrages, rétroviseurs, clim, chauffage, autoradio',
      'Odeur d\'humidité ou traces d\'eau sous les tapis et dans le coffre',
      'Ceintures, airbag (voyant allumé = sécurité compromise)',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Usure excessive des pédales sur faible kilométrage = compteur potentiellement trafiqué. Odeur d\'humidité = infiltration ou noyade. Voyant airbag = refus obligatoire.',
    niveau: 1,
  },
  {
    id: 'univ-7-dessous',
    categorie: 'Dessous du véhicule',
    titre: 'Dessous du véhicule',
    instruction: 'Accroupissez-vous à l\'arrière puis à l\'avant pour regarder sous le véhicule avec la lampe de votre téléphone. Cherchez des taches fraîches sur le sol d\'abord.',
    quoi_chercher: [
      'Taches fraîches sous le véhicule (huile, liquide de refroidissement, carburant)',
      'Rouille perforante sur le plancher, les longerons ou les bras de suspension',
      'Soufflets de transmission, silent-blocs et rotules en bon état (pas de craquelures)',
      'Traces de choc ou débosselage sur les éléments de structure',
    ],
    photo_requise: true,
    commentaire_possible: true,
    si_nok: 'Rouille perforante sur les longerons = problème de sécurité grave et réparation coûteuse. Fuite active = intervention immédiate nécessaire.',
    image_query: 'car underbody inspection rust suspension',
    youtube_query: 'inspection dessous véhicule occasion rouille',
    niveau: 1,
  },
  {
    id: 'univ-8-essai-dynamique',
    categorie: 'Essai routier',
    titre: 'Comportement routier',
    instruction: 'Conduisez au moins 20 minutes sur différents types de route. Cherchez un tronçon à 80+ km/h pour tester la tenue de cap.',
    quoi_chercher: [
      'Tirage à gauche ou à droite sans tenir le volant en ligne droite',
      'Vibrations du volant à vitesse stabilisée (roue déséquilibrée ou voilée)',
      'Bruits de roulement ou sifflement qui varient avec la vitesse',
      'Passages de vitesse fluides, absence de ratés ou d\'à-coups (boîte auto en particulier)',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Tirage = géométrie mal réglée ou frein qui accroche. Vibrations = jeu de direction ou roue voilée. Ratés de boîte auto = réparation potentiellement très coûteuse.',
    image_query: 'test drive highway used car inspection',
    youtube_query: 'essai routier contrôle occasion comportement',
    niveau: 2,
  },
  {
    id: 'univ-9-freinage',
    categorie: 'Essai routier',
    titre: 'Freinage et direction',
    instruction: 'Sur route dégagée, freinez franchement à 50 km/h puis à 80 km/h. Testez la direction en effectuant un virage serré à basse vitesse.',
    quoi_chercher: [
      'Véhicule dévie au freinage (tirage frein = frein coincé ou disque tordu)',
      'Vibrations dans la pédale de frein (disques voilés)',
      'Grincement ou crissement au freinage (plaquettes à fond)',
      'Direction : jeu excessif, bruits en braquant à fond (rotules ou crémaillère)',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Déviation au freinage = frein coincé ou disque tordu, dangereux. Crissement = plaquettes usées à remplacer immédiatement. Jeu important en direction = rotules ou crémaillère.',
    image_query: 'brake test used car inspection',
    youtube_query: 'test freinage direction essai routier',
    niveau: 2,
  },
]

// ─── ÉLECTRIQUE ───────────────────────────────────────────────────────────────

const UNIVERSAL_STEPS_ELECTRIQUE: VisiteStep[] = [
  {
    id: 'univ-1-premier-regard',
    categorie: 'Extérieur',
    titre: 'Premier regard — vue d\'ensemble',
    instruction: 'Faites le tour complet du véhicule en vous plaçant à 3-4 mètres. L\'objectif est une impression globale avant d\'entrer dans les détails.',
    quoi_chercher: [
      'Alignement général des panneaux de carrosserie',
      'Différences de teinte entre les panneaux (signe de repeinture partielle)',
      'Carrosserie bombée, enfoncée ou ondulée',
      'Toit, gouttières et montants de portes',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Notez les panneaux suspects. Toute différence de teinte visible à 3 m indique une reprise après accident ou une réparation non déclarée.',
    image_query: 'electric car exterior inspection walkthrough',
    youtube_query: 'inspection extérieure voiture électrique occasion',
    niveau: 1,
  },
  {
    id: 'univ-2-carrosserie',
    categorie: 'Extérieur',
    titre: 'Carrosserie — panneaux et seuils',
    instruction: 'Placez-vous de côté en regardant chaque panneau en contre-jour. Passez lentement la main à plat sur les surfaces pour détecter les ondulations.',
    quoi_chercher: [
      'Ondulations visibles en contre-jour (signe de mastic)',
      'Micro-fissures dans la peinture ou texture granuleuse',
      'Seuils de portes, bas de caisse et passages de roues (rouille)',
      'Joints de portes et de vitres en bon état, bien collés',
    ],
    photo_requise: true,
    commentaire_possible: true,
    si_nok: 'Toute ondulation ou peinture granuleuse indique du mastic derrière. Demandez un rapport d\'historique et faites contrôler par un carrossier avant d\'acheter.',
    image_query: 'car body panel inspection contre-jour light',
    youtube_query: 'contrôle carrosserie occasion mastic repeinture',
    niveau: 1,
  },
  {
    id: 'univ-3-moteur-compartiment',
    categorie: 'Compartiment moteur',
    titre: 'Baie moteur électrique',
    instruction: 'Ouvrez la baie moteur. Sur une voiture électrique elle doit être propre, sans huile et sans odeur de brûlé.',
    quoi_chercher: [
      'Traces de brûlé ou odeur âcre sur les connecteurs haute tension',
      'Fuites de liquide de refroidissement (le moteur électrique est refroidi par eau)',
      'Câbles haute tension orange en bon état, non dénudés ni abîmés',
      'État des fixations, supports et absence de corrosion sur les connecteurs',
    ],
    photo_requise: true,
    commentaire_possible: true,
    si_nok: 'Odeur de brûlé ou câbles haute tension endommagés = risque de sécurité grave. Refus impératif sans inspection par un électricien automobile.',
    image_query: 'electric car motor bay inspection EV',
    youtube_query: 'inspection baie moteur voiture électrique occasion',
    niveau: 1,
  },
  {
    id: 'univ-4-huiles-fluides',
    categorie: 'Compartiment moteur',
    titre: 'Fluides — refroidissement et freins',
    instruction: 'Vérifiez les fluides présents dans la baie moteur : le liquide de refroidissement et le liquide de frein.',
    quoi_chercher: [
      'Liquide de refroidissement : niveau et couleur (propre, coloré)',
      'Liquide de frein : niveau et couleur (foncé = à changer)',
      'Absence de fuite visible sur les durites et raccords',
      'Lubrifiant du réducteur si accessible',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Liquide de refroidissement bas ou souillé = problème de circuit thermique batterie ou moteur. Demandez l\'historique d\'entretien.',
    niveau: 1,
  },
  {
    id: 'univ-5-batterie-traction',
    categorie: 'Points spécifiques',
    titre: 'Batterie de traction — santé et autonomie',
    instruction: 'Dans le menu de bord, cherchez le State of Health (SoH) si disponible. Vérifiez l\'autonomie affichée à charge élevée et comparez avec les spécifications du véhicule neuf.',
    quoi_chercher: [
      'SoH ou capacité restante si accessible (> 80% attendu pour < 100 000 km)',
      'Autonomie affichée à charge élevée vs autonomie d\'origine constructeur',
      'Présence d\'une garantie batterie constructeur encore en cours',
      'Historique de charge rapide excessif si accessible',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'SoH < 80% = batterie dégradée, autonomie significativement réduite. Remplacement coûteux (5 000–20 000€ selon le modèle). Négociez fortement ou passez votre chemin.',
    image_query: 'EV battery state of health dashboard screen',
    youtube_query: 'vérifier batterie voiture électrique état de santé',
    niveau: 1,
  },
  {
    id: 'univ-6-habitacle',
    categorie: 'Habitacle',
    titre: 'Habitacle — tableau de bord et infodivertissement',
    instruction: 'Testez toutes les fonctions tactiles et la connectivité. Les véhicules électriques ont plus d\'électronique embarquée que les thermiques.',
    quoi_chercher: [
      'Écran tactile : réactivité correcte, absence de pixels morts ou de lags',
      'Android Auto / Apple CarPlay fonctionnels',
      'Climatisation : refroidissement et chauffage efficaces (consomment l\'autonomie)',
      'Voyants allumés sur le tableau de bord, en particulier le voyant batterie haute tension',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Écran tactile défaillant = remplacement coûteux sur VE. Voyant batterie haute tension allumé = expertise obligatoire avant tout achat.',
    niveau: 1,
  },
  {
    id: 'univ-7-charge',
    categorie: 'Points spécifiques',
    titre: 'Recharge — port et câbles',
    instruction: 'Inspectez visuellement le port de charge. Si possible, branchez le câble fourni et vérifiez que la charge démarre sans erreur.',
    quoi_chercher: [
      'Port de charge : état des broches, absence de brûlures ou de déformation',
      'Câble AC (Mode 2 ou Mode 3) fourni en bon état',
      'Compatibilité DC / charge rapide et norme (CCS, CHAdeMO, Type 2)',
      'Vitesse de charge maximale indiquée sur le tableau de bord lors du branchement',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Port de charge endommagé = remplacement à prévoir. Vérifiez la compatibilité avec votre installation domestique (Wallbox ou prise renforcée).',
    image_query: 'EV charging port inspection type 2 CCS',
    youtube_query: 'inspection port recharge voiture électrique',
    niveau: 1,
  },
  {
    id: 'univ-8-essai-dynamique',
    categorie: 'Essai routier',
    titre: 'Comportement routier',
    instruction: 'Conduisez au moins 20 minutes sur différents types de route. La motricité électrique doit être linéaire et sans à-coups.',
    quoi_chercher: [
      'Tirage à gauche ou à droite sans tenir le volant en ligne droite',
      'Vibrations du volant à vitesse stabilisée',
      'Bruits de roulement ou sifflement qui varient avec la vitesse',
      'Récupération d\'énergie au freinage : présence et intensité correctes',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Tirage = géométrie ou frein qui accroche. Vibrations = jeu de direction ou roue voilée. Récupération absente = problème électronique à diagnostiquer.',
    image_query: 'electric car test drive highway',
    youtube_query: 'essai routier voiture électrique occasion',
    niveau: 2,
  },
  {
    id: 'univ-9-freinage',
    categorie: 'Essai routier',
    titre: 'Freinage et direction',
    instruction: 'Sur route dégagée, freinez franchement à 50 km/h puis à 80 km/h. Testez la direction en effectuant un virage serré à basse vitesse.',
    quoi_chercher: [
      'Véhicule dévie au freinage (tirage = frein coincé ou disque tordu)',
      'Vibrations dans la pédale de frein (disques voilés)',
      'Grincement ou crissement au freinage (plaquettes peu utilisées sur VE peuvent gripper)',
      'Direction : jeu excessif, bruits en braquant à fond',
    ],
    photo_requise: false,
    commentaire_possible: true,
    si_nok: 'Sur un VE, les plaquettes s\'usent peu mais peuvent gripper. Un déviation au freinage est toujours préoccupante. Jeu important en direction = rotules ou crémaillère.',
    image_query: 'EV brake test inspection',
    youtube_query: 'test freinage voiture électrique occasion',
    niveau: 2,
  },
]

// ─── HYBRIDE ──────────────────────────────────────────────────────────────────

const STEP_HYBRIDE_BATTERIE: VisiteStep = {
  id: 'univ-10-hybride-batterie',
  categorie: 'Points spécifiques',
  titre: 'Batterie hybride — état et intégration',
  instruction: 'Demandez l\'historique d\'entretien de la batterie haute tension. Vérifiez le fonctionnement du mode électrique pur à basse vitesse (< 30 km/h).',
  quoi_chercher: [
    'Passage fluide moteur thermique ↔ électrique à basse vitesse',
    'Grille de ventilation batterie haute tension dégagée (souvent sous le siège arrière)',
    'Voyant hybride ou batterie haute tension sur le tableau de bord',
    'Autonomie électrique affichée si hybride rechargeable (PHEV)',
  ],
  photo_requise: false,
  commentaire_possible: true,
  si_nok: 'Absence de mode électrique ou voyant hybride = batterie haute tension dégradée. Coût de remplacement estimé entre 3 000 et 8 000€ selon le modèle.',
  image_query: 'hybrid battery pack inspection used car',
  youtube_query: 'vérifier batterie hybride occasion état santé',
  niveau: 2,
}

const UNIVERSAL_STEPS_HYBRIDE: VisiteStep[] = [
  ...UNIVERSAL_STEPS_THERMIQUE,
  STEP_HYBRIDE_BATTERIE,
]

// ─── Public API ───────────────────────────────────────────────────────────────

export function getUniversalSteps(type: MotorisationType): VisiteStep[] {
  switch (type) {
    case 'electrique': return UNIVERSAL_STEPS_ELECTRIQUE
    case 'hybride': return UNIVERSAL_STEPS_HYBRIDE
    case 'diesel':
    case 'essence':
    default: return UNIVERSAL_STEPS_THERMIQUE
  }
}

export function applyEnrichments(steps: VisiteStep[], enrichments: UniversalEnrichments): VisiteStep[] {
  return steps.map(step => {
    const enrichment = enrichments[step.id]
    if (!enrichment) return step
    return {
      ...step,
      instruction: `${step.instruction}\n\n📍 Spécifique à ce véhicule : ${enrichment}`,
    }
  })
}
