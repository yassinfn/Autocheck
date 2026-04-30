// ─── Rapport d'historique ────────────────────────────────────────────────────

export interface KmReleve {
  date: string
  km: number
  source?: string
}

export interface HistoryData {
  proprietaires?: number
  relevesKm: KmReleve[]
  immatriculationVerifiee: boolean
  coherenceKm: boolean
  resume: string
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export type VerdictType = 'excellent' | 'good' | 'risky' | 'avoid'
export type Gravite = 'faible' | 'modere' | 'eleve'
export type Frequence = 'rare' | 'occasionnel' | 'frequent'

export interface VehiculeInfo {
  marque: string
  modele: string
  annee: number
  version: string
  motorisation: string
  boite: string
  kilometrage: number
  prix: number
  nombreProprietaires: number
}

export interface ScoreDetail {
  critere: string
  points: number
  maxPoints: number
  commentaire: string
}

export interface ScoreResult {
  total: number
  verdictType: VerdictType
  verdict: string
  details: ScoreDetail[]
  pointsAttention: string[]
  ressentGlobal: string
}

export interface ProblemeConnu {
  description: string
  gravite: Gravite
  frequence: Frequence
}

export interface RappelConstructeur {
  reference: string
  description: string
}

export interface AnalyseGeneration {
  generation: string
  est_meilleure_version: boolean
  explication: string
  problemes_corriges_versions_suivantes: string[]
  conseil_version: string
}

export interface ReputationResult {
  pointsForts: string[]
  problemesConnus: ProblemeConnu[]
  rappelsConstructeur: RappelConstructeur[]
  analyse_generation: AnalyseGeneration
}

export interface DepenseItem {
  poste: string
  detail: string
  montantMin: number
  montantMax: number
}

export interface DepensesResult {
  obligatoires: DepenseItem[]
  eventuelles: DepenseItem[]
  fraisAchat: DepenseItem[]
  totalObligatoiresMin: number
  totalObligatoiresMax: number
}

export interface DetectionResult {
  langue: string
  pays: string
  devise: string
  symbole: string
}

export interface AnalyseResult {
  detection: DetectionResult
  vehicule: VehiculeInfo
  score: ScoreResult
  reputation: ReputationResult
  depenses: DepensesResult
}

// ─── Page 3 : Visite ─────────────────────────────────────────────────────────

// Legacy checklist format (kept for backward compat with old Supabase rows)
export interface ChecklistItemData {
  id: string
  categorie: string
  point: string
  instruction: string
}
export interface ChecklistCategorie {
  nom: string
  items: Omit<ChecklistItemData, 'categorie'>[]
}
export interface ChecklistGeneratedResult {
  categories: ChecklistCategorie[]
}
export interface ChecklistItemState extends ChecklistItemData {
  statut: 'pending' | 'ok' | 'nok'
  note: string
}

// New guided scenario format
export interface VisiteStep {
  id: string
  categorie: string
  titre: string
  instruction: string
  quoi_chercher: string[]
  photo_requise: boolean
  commentaire_possible: boolean
  si_nok: string
  image_query?: string
  youtube_query?: string
  niveau: 1 | 2
}

export interface VisiteStepState extends VisiteStep {
  statut: 'pending' | 'ok' | 'nok' | 'passe'
  commentaire: string
  photo?: string
}

export interface ScenarioResult {
  steps: VisiteStep[]
}

export type VerdictMoteur = 'sain' | 'suspect' | 'critique'

export interface VideoAnalyseResult {
  verdict_visuel: VerdictMoteur
  detail_visuel: string
  verdict_sonore: VerdictMoteur
  detail_sonore: string
  verdict_global: VerdictMoteur
  recommandations: string
  analyse_date: string
}

export interface VisiteData {
  // New guided scenario format
  steps?: VisiteStepState[]
  videoAnalyse?: VideoAnalyseResult
  // Legacy checklist format (old Supabase rows)
  items?: ChecklistItemState[]
  photoAnalyses?: string[]
}

// ─── Page 4 : Décision finale ────────────────────────────────────────────────

export type DecisionType = 'acheter' | 'negocier' | 'refuser'

export interface DecisionFinale {
  decision: DecisionType
  scoreGlobal: number
  titre: string
  resume: string
  pointsPositifs: string[]
  risques: string[]
  argumentsNegociation: NegociationElement[]
  reductionTotale: number
  prixCible: number
  conclusion: string
}

// ─── Page 2 : Contact Vendeur ────────────────────────────────────────────────

export interface ContactQuestionsResult {
  message: string
  questions: string[]
}

export interface NegociationElement {
  raison: string
  reduction: number
}

export interface ContactVerdict {
  scoreUpdate: number
  scoreTotal: number
  pointsPositifs: string[]
  alertes: string[]
  bilanFinancier: {
    items: DepenseItem[]
    totalMin: number
    totalMax: number
  }
  argumentNegociation: {
    elements: NegociationElement[]
    reductionTotale: number
    prixCible: number
  }
  recommandation: string
}
