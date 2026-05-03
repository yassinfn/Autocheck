# AUTOCHECK — Aperçu Complet du Projet

> Généré le **2026-05-02** à partir d'une exploration exhaustive du code source.
> Ce document sert de référence pour les nouvelles sessions et les nouveaux développeurs.

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture technique](#2-architecture-technique)
3. [Composants réutilisables](#3-composants-réutilisables)
4. [Libs / Helpers](#4-libs--helpers)
5. [Flux utilisateur détaillés](#5-flux-utilisateur-détaillés)
6. [Système de persistance / Cache](#6-système-de-persistance--cache)
7. [Flags et modes de debug](#7-flags-et-modes-de-debug)
8. [Dépendances externes](#8-dépendances-externes)
9. [Chantiers récents — Historique Git](#9-chantiers-récents--historique-git)
10. [Limitations connues / TODO](#10-limitations-connues--todo)
11. [Prochains chantiers planifiés](#11-prochains-chantiers-planifiés)
12. [Comment lancer le projet en local](#12-comment-lancer-le-projet-en-local)
13. [Anomalies détectées pendant l'audit](#13-anomalies-détectées-pendant-laudit)

---

## 1. Vue d'ensemble du projet

### Nom et vision

**AutoCheck** est un assistant IA de vérification de voiture d'occasion. L'utilisateur colle une annonce (texte ou URL), et AutoCheck l'accompagne en 4 étapes pour l'aider à prendre la meilleure décision d'achat possible.

**Proposition de valeur :** Éviter les mauvaises surprises lors d'un achat de voiture d'occasion — détecter les risques cachés, préparer les questions au vendeur, guider la visite physique, et synthétiser une recommandation finale chiffrée.

### Public cible

Particuliers francophones (et multilingues) qui achètent une voiture d'occasion en France, Belgique, Espagne, Italie, Allemagne, etc. sur des sites comme LeBonCoin, La Centrale, AutoScout24, CarGurus, Mobile.de, Subito, Coches, Milanuncios.

### Fonctionnement en 4 étapes

| Étape | Page | Rôle |
|-------|------|------|
| 1 | `/analyse` | L'utilisateur colle l'annonce (URL ou texte). L'IA analyse et donne un score sur 100, une réputation du modèle, et une estimation des dépenses futures. |
| 2 | `/contact` | L'IA génère 4 questions ciblées à poser au vendeur. L'utilisateur colle les réponses + photos reçues. L'IA met à jour le score. |
| 3 | `/visite` | L'IA génère un scénario d'inspection en 2 niveaux (rapide + détaillé). L'utilisateur coche OK/NOK/Passé à chaque étape, prend des photos, filme le moteur. |
| 4 | `/decision` | L'IA synthétise tout pour produire une recommandation finale : **Acheter**, **Négocier** ou **Refuser**, avec un prix cible et des arguments de négociation. |

### Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | **16.2.4** | Framework fullstack (App Router) |
| React | **19.2.4** | UI |
| TypeScript | **^5** | Typage |
| Tailwind CSS | **^4** | Styles |
| @anthropic-ai/sdk | **^0.91.1** | Appels Claude API |
| @supabase/supabase-js | **^2.105.1** | Base de données + auth future |
| jsPDF | **^4.2.1** | Génération de PDF |

> ⚠️ **Attention :** Next.js 16.x est une version post-15, avec des changements d'API importants. Lire `node_modules/next/dist/docs/` avant toute modification.

### URLs

| Environnement | URL |
|---------------|-----|
| Développement | `http://localhost:3000` |
| Production | À VÉRIFIER (Vercel, pas de vercel.json trouvé) |

### Compte GitHub

- Utilisateur git : **saadad**
- Email : saadad.yassine@gmail.com

---

## 2. Architecture technique

### Structure des dossiers

```
c:\Users\dell\autocheck\
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyse/
│   │   │   │   ├── route.ts               ← Analyse non-streaming (fallback)
│   │   │   │   └── stream/
│   │   │   │       └── route.ts           ← Analyse SSE (mode principal)
│   │   │   ├── contact/
│   │   │   │   └── route.ts               ← Questions + Verdict vendeur
│   │   │   ├── visite/
│   │   │   │   └── route.ts               ← Scénario + Photo + Checklist
│   │   │   ├── decision/
│   │   │   │   └── route.ts               ← Décision finale
│   │   │   ├── video-analyse/
│   │   │   │   └── route.ts               ← Analyse vidéo moteur
│   │   │   ├── visite-image/
│   │   │   │   └── route.ts               ← Google Image Search par étape
│   │   │   ├── bookmarklet-store/
│   │   │   │   └── route.ts               ← Stockage token bookmarklet
│   │   │   └── scrape/
│   │   │       └── route.ts               ← Scraping annonces web
│   │   ├── analyse/
│   │   │   └── page.tsx                   ← Étape 1
│   │   ├── contact/
│   │   │   └── page.tsx                   ← Étape 2
│   │   ├── visite/
│   │   │   └── page.tsx                   ← Étape 3
│   │   ├── decision/
│   │   │   └── page.tsx                   ← Étape 4
│   │   ├── historique/
│   │   │   └── page.tsx                   ← Liste des analyses passées
│   │   ├── bookmarklet/
│   │   │   └── page.tsx                   ← Instructions d'installation bookmarklet
│   │   ├── layout.tsx                     ← Layout racine
│   │   ├── page.tsx                       ← Redirection vers /analyse
│   │   └── globals.css
│   ├── components/
│   │   ├── analyse/                       ← Composants étape 1
│   │   ├── contact/                       ← Composants étape 2
│   │   ├── visite/                        ← Composants étape 3
│   │   ├── pdf/                           ← Bouton téléchargement PDF
│   │   └── ui/                            ← Composants génériques
│   ├── lib/
│   │   ├── claude.ts
│   │   ├── supabase.ts
│   │   ├── decisionCache.ts
│   │   ├── saveAnalysis.ts
│   │   ├── generatePDF.ts
│   │   ├── uiLabels.ts
│   │   └── prompts/
│   │       ├── analyse.ts
│   │       ├── contact.ts
│   │       ├── visite.ts
│   │       └── decision.ts
│   └── types/
│       └── index.ts                       ← Toutes les interfaces TypeScript
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
└── CLAUDE.md / AGENTS.md
```

### Pages — rôles et paramètres URL

| Page | Route | Paramètres URL | Rôle |
|------|-------|----------------|------|
| Racine | `/` | — | Redirection vers `/analyse` |
| Étape 1 | `/analyse` | `?id=<rowId>` `?token=<token>` `?incomplete=1` | Analyse de l'annonce, saisie texte/URL |
| Étape 2 | `/contact` | `?id=<rowId>` | Questions vendeur + analyse des réponses |
| Étape 3 | `/visite` | `?id=<rowId>` | Scénario d'inspection guidé |
| Étape 4 | `/decision` | `?id=<rowId>` | Recommandation finale |
| Historique | `/historique` | — | Liste des analyses passées |
| Bookmarklet | `/bookmarklet` | — | Instructions d'installation du bookmarklet |

### Routes API — input / output

#### `POST /api/analyse/stream`

Endpoint principal d'analyse. Utilise le **streaming SSE**.

**Input :**
```typescript
{
  annonce?: string,          // Texte de l'annonce
  type?: 'image',            // Si image
  imageData?: string,        // Base64
  mimeType?: string,
  historyData?: HistoryData, // Données Autoviza
  sourceUrl?: string         // URL d'origine
}
```

**Output (Server-Sent Events) :**
```
event: { type: 'chunk',      payload: string }       // Token brut Claude
event: { type: 'score',      payload: AnalysePartial } // Score + critères
event: { type: 'reputation', payload: ReputationResult } // Réputation modèle
event: { type: 'done' }
```

**Modèle :** `claude-sonnet-4-6` | **Tokens :** 4000 (analyse) + 2000 (réputation)

---

#### `POST /api/analyse` (fallback non-streaming)

**Input / Output :** Idem stream mais retourne un JSON `AnalyseResult` complet en une fois.

---

#### `POST /api/contact`

Deux actions sur le même endpoint.

**action = `'questions'`**

Input : `{ analyse: AnalyseResult, annonce?: string }`  
Output : `{ message: string, questions: string[] }` (4 questions max)  
Tokens : 1500

**action = `'analyse'`**

Input : `{ analyse, reponses: string, images?: Array<{data, mimeType}> }`  
Output :
```typescript
{
  scoreUpdate: number,      // -20 à +10
  scoreTotal: number,
  pointsPositifs: string[],
  alertes: string[],
  bilanFinancier: { item, estimation }[],
  argumentNegociation: string[],
  recommandation: string
}
```
Tokens : 2000

---

#### `POST /api/visite`

**action = `'scenario'`**

Input : `{ analyse: AnalyseResult }`  
Output : `{ steps: VisiteStep[] }` — scénario 2 niveaux (5-10 steps niveau 1 + 10-15 niveau 2)  
Tokens : 8000

**action = `'photo'`**

Input : `{ imageData: string, mimeType: string }`  
Output : `{ analysis: string }`  
Tokens : 400

**action = `'checklist'`** (legacy, rétrocompatibilité)

---

#### `POST /api/decision`

Input : `{ analyse: AnalyseResult, visite?: VisiteData, contactVerdict?: ContactVerdict }`

Output :
```typescript
{
  decision: 'acheter' | 'negocier' | 'refuser',
  scoreGlobal: number,
  titre: string,
  resume: string,
  pointsPositifs: string[],
  risques: string[],
  argumentsNegociation: string[],
  reductionTotale: number,
  prixCible: number,
  conclusion: string
}
```

**Règles :** acheter ≥ 75, négocier 45-74, refuser < 45  
Tokens : 2000

---

#### `POST /api/video-analyse`

Input : `{ frames: Array<{data, mediaType}>, audioDescription: string, langue: string }`

Output :
```typescript
{
  verdict_visuel: 'sain' | 'suspect' | 'critique',
  detail_visuel: string,
  verdict_sonore: 'sain' | 'suspect' | 'critique',
  detail_sonore: string,
  verdict_global: string,
  recommandations: string[],
  analyse_date: string
}
```

---

#### `GET /api/visite-image`

Input params : `?modele=&etape_id=&query=`  
Output : `{ image_url: string, legende: string }`  
Logique : Supabase cache (`etapes_images`) → miss → Google Custom Search API → mise en cache

---

#### `POST /api/bookmarklet-store` / `GET /api/bookmarklet-store`

**POST** — Stocke le contenu d'une annonce temporairement  
Input : `{ url?: string, text: string }` | Output : `{ token: string }` (8 chars, TTL 5 min)

**GET** — Récupère et **supprime** le contenu (usage unique)  
Input : `?token=` | Output : `{ url, text }`

**OPTIONS** — CORS preflight (bookmarklet cross-origin)

---

#### `POST /api/scrape`

Input : `{ url: string }`

Output :
```typescript
{
  text: string,            // Max 8000 chars
  hasHistory?: boolean,
  historyData?: HistoryData,
  historySource?: string,
  autovizaUrl?: string,
  lowConfidence?: boolean
}
```

**Sites supportés :** LeBonCoin (Browserless), La Centrale, AutoScout24, CarGurus, Mobile.de, Subito, Coches, Milanuncios  
**Sites bloqués :** Facebook Marketplace, CarMax (copy-paste manuel requis)  
**Auto-détection Autoviza :** Si un lien Autoviza est présent dans la page, le scraper le fetche et parse les données historiques.

---

### Schéma Supabase complet

#### Table `analyses`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | Identifiant de la ligne |
| `session_id` | string | UUID généré côté client |
| `created_at` | timestamp | Création |
| `updated_at` | timestamp | Dernière mise à jour |
| `marque` | string | Ex: "Peugeot" |
| `modele` | string | Ex: "308" |
| `annee` | string | Ex: "2019" |
| `prix` | numeric | Prix de l'annonce |
| `devise` | string | Ex: "EUR" |
| `symbole` | string | Ex: "€" |
| `langue` | string | Ex: "fr" |
| `pays` | string | Ex: "France" |
| `score` | int | Score global 0-100 |
| `verdict` | string | excellent / good / risky / avoid |
| `step_reached` | int | Dernière étape atteinte (1-4) |
| `url_annonce` | text | URL de l'annonce source |
| `is_complete` | boolean | Étape 4 complétée |
| `analysis_data` | jsonb | AnalyseResult complet |
| `reputation_data` | jsonb | ReputationResult |
| `finance_data` | jsonb | DepensesResult |
| `questions_data` | jsonb | ContactQuestionsResult |
| `contact_data` | jsonb | ContactVerdict |
| `contact_responses` | text | Réponses brutes du vendeur |
| `visit_data` | jsonb | VisiteData { steps[], videoAnalyse? } |
| `decision_data` | jsonb | DecisionFinale |
| `decision_input_hash` | string | Hash global (etape2 + etape3) |
| `decision_input_hash_etape2` | string | Hash des réponses contact |
| `decision_input_hash_etape3` | string | Hash des étapes de visite |
| `modifications_count_etape2` | int | Compteur modifs étape 2 (max 3) |
| `modifications_count_etape3` | int | Compteur modifs étape 3 (max 3) |

#### Table `reputation_cache`

| Colonne | Type | Description |
|---------|------|-------------|
| `cache_key` | string (PK) | `"marque_modele_version_annee_motorisation_boite_pays"` |
| `data` | jsonb | ReputationResult |
| `expires_at` | timestamp | TTL 30 jours |

#### Table `bookmarklet_tokens`

| Colonne | Type | Description |
|---------|------|-------------|
| `token` | string (PK) | 8 caractères aléatoires |
| `url` | text | URL de l'annonce |
| `text` | text | Contenu (max 15 000 chars) |
| `expires_at` | timestamp | TTL 5 minutes |

#### Table `etapes_images`

| Colonne | Type | Description |
|---------|------|-------------|
| `modele` | string (PK) | Modèle de véhicule |
| `etape_id` | string (PK) | Identifiant de l'étape |
| `image_url` | text | URL de l'image Google |
| `legende` | text | Texte descriptif |

---

## 3. Composants réutilisables

### `src/components/analyse/`

| Composant | Rôle | Props principales |
|-----------|------|-------------------|
| `AnnonceInput.tsx` | Saisie URL ou texte, avec scraping temps réel et détection de cache | `onSubmit`, `initialValue` |
| `StreamingDisplay.tsx` | Affiche les tokens bruts Claude en temps réel pendant le streaming | `tokens: string`, `isLoading: boolean` |
| `ScoreBlock.tsx` | Carte score avec grille de critères et points d'attention | `analyse: AnalyseResult` |
| `ReputationBlock.tsx` | Section réputation du modèle (points forts, problèmes connus, rappels) | `reputation: ReputationResult` |
| `DepensesBlock.tsx` | Tableau des coûts estimés (obligatoires, éventuelles, frais d'achat, totaux) | `finance: DepensesResult` |
| `HistoryBlock.tsx` | Résultats Autoviza (propriétaires, km relevés, cohérence, anomalies) | `history: HistoryData` |

### `src/components/contact/`

| Composant | Rôle | Props principales |
|-----------|------|-------------------|
| `QuestionsBlock.tsx` | Affiche le message + les 4 questions générées à envoyer au vendeur | `questions: ContactQuestionsResult` |
| `ReponsesForm.tsx` | Grande zone de texte pour les réponses vendeur + upload d'images (base64) | `onSubmit`, `onFileChange` |
| `VerdictBlock.tsx` | Résultats de l'analyse vendeur : mise à jour score, points, alertes, arguments | `verdict: ContactVerdict` |

### `src/components/visite/`

| Composant | Rôle | Props principales |
|-----------|------|-------------------|
| `ScenarioIntro.tsx` | Introduction du scénario à deux niveaux | `scenario: ScenarioResult` |
| `ScenarioStep.tsx` | Étape individuelle avec boutons OK/NOK/Passé, upload photo, commentaire | `step: VisiteStep`, `onUpdate` |
| `ScenarioRecap.tsx` | Tableau récapitulatif OK/NOK/Passés, problèmes détectés, modal vidéo moteur | `steps: VisiteStep[]` |
| `LevelTransition.tsx` | Écran de transition entre niveau 1 et niveau 2 | `onContinue` |
| `PhotoUpload.tsx` | Capture caméra ou sélection fichier | `onCapture`, `onFile` |
| `StepExempleModal.tsx` | Modal avec photo exemple pour l'étape en cours | `step: VisiteStep`, `modele` |
| `VideoMoteur.tsx` | Upload vidéo moteur, extraction audio, modal d'analyse | `analyse: AnalyseResult` |
| `VidéoUpload.tsx` | Composant d'upload de fichier vidéo | `onFile`, `onCapture` |
| `ChecklistBlock.tsx` | Checklist legacy (rétrocompatibilité) | `checklist: ChecklistGeneratedResult` |

### `src/components/pdf/`

| Composant | Rôle | Props principales |
|-----------|------|-------------------|
| `BoutonTelechargement.tsx` | Bouton de téléchargement PDF, appelle `generatePDF()` | `analyse`, `contactVerdict?`, `visite?`, `decision?` |

### `src/components/ui/`

| Composant | Rôle | Props principales |
|-----------|------|-------------------|
| `ScoreGauge.tsx` | Jauge circulaire 0-100 avec dégradé de couleur | `score: number`, `size?` |
| `Spinner.tsx` | Indicateur de chargement animé | `size?: 'sm' \| 'md' \| 'lg'` |
| `Badge.tsx` | Badge coloré de verdict (excellent/good/risky/avoid) | `verdict: string` |
| `ConfirmLeave.tsx` | Modal d'avertissement avant navigation avec changements non sauvegardés | `onConfirm`, `onCancel` |
| `DownloadPDFButton.tsx` | Bouton PDF présent dans le header de toutes les pages | Idem BoutonTelechargement |
| `StepNav.tsx` | Barre de progression des 4 étapes, lit l'étape courante via URL + localStorage | `currentStep?` |

---

## 4. Libs / Helpers

### `src/lib/claude.ts`

Wrapper autour du SDK Anthropic.

```typescript
callClaude(userMessage: string, systemMessage?: string, maxTokens?: number): Promise<string>
// → Appelle claude-sonnet-4-6, retourne le texte brut

callClaudeVision(imageBase64: string, mediaType: string, prompt: string, maxTokens?: number): Promise<string>
// → Analyse une seule image

callClaudeVisionMulti(images: Array<{data, mediaType}>, prompt: string, maxTokens?: number): Promise<string>
// → Analyse plusieurs images dans un seul appel (vidéo moteur)

extractJSON<T>(text: string): T
// → Parse JSON depuis du texte potentiellement entouré de ```json ... ```
```

---

### `src/lib/supabase.ts`

```typescript
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Client unique exporté, utilisé dans toutes les routes API et pages.

---

### `src/lib/decisionCache.ts`

Système de cache et de limite de modifications mis en place le **01/05/2026**.

```typescript
const MAX_MODIFS = 3

dbg(...args)
// → console.log si localStorage.DEBUG_AUTOCHECK === '1'

hashEtape2(contactResponses: string): string
// → Hash djb2 des réponses vendeur

hashEtape3(steps: VisiteStep[]): string
// → Hash djb2 des statuts des étapes de visite (ok/nok/passe)

hashGlobal(h2: string, h3: string): string
// → Concaténation des deux hashs
```

---

### `src/lib/saveAnalysis.ts`

Persistance Supabase centralisée.

```typescript
getOrCreateSessionId(): string
// → Lit ou crée un UUID dans localStorage('autocheck_session_id')

saveAnalysis(payload: Partial<AnalyseRow>): Promise<void>
// → Si rowId connu : UPDATE, sinon INSERT + setRowId()
// → Gère les colonnes : session_id, marque, modele, annee, prix, pays, devise,
//   langue, symbole, score, verdict, analysis_data, reputation_data, finance_data,
//   questions_data, contact_data, contact_responses, visit_data, decision_data,
//   decision_input_hash, decision_input_hash_etape2, decision_input_hash_etape3,
//   modifications_count_etape2, modifications_count_etape3,
//   step_reached, url_annonce, updated_at, is_complete

getRowId(): string | null       // localStorage('autocheck_row_id')
setRowId(id: string): void
clearRowId(): void
restoreRowId(id: string): void  // Remet l'id sans écraser l'existant
```

---

### `src/lib/generatePDF.ts`

Génère un PDF complet via jsPDF.

```typescript
generatePDF({ analyse, contactVerdict?, visite?, decision? }): void
// → Télécharge "autocheck-{marque}-{modele}-{annee}-{date}.pdf"
```

**Structure du PDF :**
1. En-tête (titre AutoCheck, date)
2. Infos véhicule (marque, modèle, année, km, prix, propriétaires)
3. Score (total/100, verdict, points d'attention)
4. Réputation (points forts, problèmes connus, rappels, analyse génération)
5. Dépenses (obligatoires, éventuelles, frais d'achat, totaux)
6. Verdict contact (mise à jour score, points, alertes, recommandation)
7. Visite guidée (récap OK/NOK/Passés, problèmes détectés)
8. Analyse vidéo moteur (verdicts visuel/sonore, détails, recommandations)
9. Décision finale (label, titre, résumé, points, risques, arguments, prix cible)
10. Pied de page (numéros de pages)

---

### `src/lib/uiLabels.ts`

Labels UI localisés.

```typescript
type UILabels = { analyser, continuer_vendeur, ... }

getLabels(pays: string): UILabels
// → Retourne les labels dans la langue du pays détecté
// Langues supportées : fr, en, es, de, it, pt, nl
```

---

### `src/lib/prompts/`

#### `analyse.ts`
- `ANALYSE_SYSTEM` — Prompt système avec règles de langue
- `buildAnalysePrompt(annonce, historyData?)` — Grille de score 100 pts, détection dépenses, règles métier
- `buildReputationPrompt(annonce)` — Points forts, problèmes connus, rappels, analyse de génération

#### `contact.ts`
- `CONTACT_SYSTEM` — Règles de langue
- `buildContactQuestionsPrompt(analyse, annonce?)` — 4 questions max, anti-redondance (ne pas demander si info déjà dans l'annonce)
- `buildContactAnalysePrompt(analyse, reponses)` — Logique scoreUpdate (-20 à +10), points financiers, arguments de négociation

#### `visite.ts`
- `VISITE_SYSTEM` — Règles de langue
- `buildChecklistPrompt(analyse)` — 5 catégories, 15-20 items (legacy)
- `buildPhotoPrompt()` — Instructions d'analyse photo
- `buildScenarioPrompt(analyse)` — Scénario 2 niveaux (niveau 1 = 5-10 vérifications rapides, niveau 2 = 10-15 vérifications détaillées)
- `buildVideoAnalysePrompt(audioDesc, langue, frameCount)` — Analyse vidéo moteur

#### `decision.ts`
- `DECISION_SYSTEM` — Règles de langue
- `buildDecisionPrompt(analyse, visite?, contactVerdict?)` — Synthèse finale, règles de seuils

---

## 5. Flux utilisateur détaillés

### Étape 1 — Analyse (`/analyse`)

**Point d'entrée :** Accès direct, ou depuis l'historique (`?id=<rowId>`), ou depuis le bookmarklet (`?token=<token>`).

**État initial lu :**
- `localStorage.autocheck_analyse` → si présent et récent, affiche directement les résultats
- `?id=` → charge depuis Supabase, restaure toutes les données de session
- `?token=` → appelle `GET /api/bookmarklet-store?token=` → récupère le texte et l'URL de l'annonce

**Actions utilisateur :**
1. Coller une URL → scraping automatique via `/api/scrape`
2. Coller un texte manuellement
3. Uploader une image d'annonce
4. Cliquer "Analyser"

**Appels API déclenchés :**
- `POST /api/scrape` (si URL)
- `POST /api/analyse/stream` (SSE)
- `POST /api/visite` action=scenario (pre-fetch du scénario en background)

**Persistance :**
- `localStorage.autocheck_analyse` ← AnalyseResult
- `localStorage.autocheck_annonce` ← texte brut
- `localStorage.autocheck_source_url` ← URL
- `localStorage.autocheck_row_id` ← ID Supabase
- Supabase `analyses` ← INSERT

**Sortie :** Bouton "Continuer → Étape Vendeur" → `/contact?id=<rowId>`

---

### Étape 2 — Contact vendeur (`/contact`)

**Point d'entrée :** `/contact?id=<rowId>`

**État initial lu :**
- `localStorage.autocheck_questions` → questions déjà générées
- `localStorage.autocheck_contact` → verdict déjà calculé
- Supabase `analyses` → `contact_data, questions_data, contact_responses, modifications_count_etape2`

**Actions utilisateur :**
1. Cliquer "Générer les questions" → appel API questions
2. Copier le message pour le vendeur
3. Coller les réponses + joindre des photos/documents
4. Cliquer "Analyser les réponses" → appel API analyse
5. Cliquer "Recalculer" (si résultat insatisfaisant, limité à 3 fois)

**Appels API déclenchés :**
- `POST /api/contact` action=questions
- `POST /api/contact` action=analyse

**Persistance :**
- `localStorage.autocheck_questions` ← ContactQuestionsResult
- `localStorage.autocheck_contact` ← ContactVerdict
- `localStorage.autocheck_contact_responses` ← texte réponses
- `localStorage.autocheck_modif_count2` ← compteur (0-3)
- Supabase UPDATE ← `questions_data, contact_data, contact_responses, modifications_count_etape2`

**Sortie :** Bouton "Continuer → Visite" → `/visite?id=<rowId>`

---

### Étape 3 — Visite guidée (`/visite`)

**Point d'entrée :** `/visite?id=<rowId>`

**État initial lu :**
- `localStorage.autocheck_visite` → scénario déjà généré + états des étapes
- Supabase `analyses` → `visit_data, modifications_count_etape3`

**Actions utilisateur :**
1. Parcourir les étapes du niveau 1 (vérifications rapides)
2. Marquer chaque étape OK / NOK / Passé
3. Prendre une photo à chaque étape (optionnel)
4. Passer au niveau 2 (vérifications détaillées)
5. Filmer le moteur et lancer l'analyse vidéo

**Appels API déclenchés :**
- `POST /api/visite` action=scenario (si pas encore en cache)
- `POST /api/visite` action=photo (pour chaque photo prise)
- `POST /api/video-analyse` (pour la vidéo moteur)
- `GET /api/visite-image` (images d'exemple pour chaque étape)

**Persistance :**
- `localStorage.autocheck_visite` ← VisiteData { steps[], videoAnalyse? }
- `localStorage.autocheck_modif_count3` ← compteur (0-3)
- Supabase UPDATE ← `visit_data, modifications_count_etape3`

**Sortie :** Bouton "Voir la décision finale" → `/decision?id=<rowId>`

---

### Étape 4 — Décision finale (`/decision`)

**Point d'entrée :** `/decision?id=<rowId>`

**État initial lu :**
- `localStorage.autocheck_decision` → décision déjà calculée
- `localStorage.autocheck_decision_hash` → hash de comparaison
- Supabase → `analysis_data, contact_data, visit_data, decision_data, decision_input_hash*`, `modifications_count_*`

**Actions utilisateur :**
1. Voir la recommandation finale
2. Cliquer "Recalculer" (si les données ont changé, limité par le système de cache)
3. Télécharger le PDF complet

**Appels API déclenchés :**
- `POST /api/decision` (si pas de cache valide)

**Persistance :**
- `localStorage.autocheck_decision` ← DecisionFinale
- `localStorage.autocheck_decision_hash` ← hashGlobal
- `localStorage.autocheck_decision_hash2` ← hashEtape2
- `localStorage.autocheck_decision_hash3` ← hashEtape3
- Supabase UPDATE ← `decision_data, decision_input_hash*, modifications_count*, is_complete=true`

**Sortie :** Fin du flux. Accès à l'historique via `/historique`.

---

## 6. Système de persistance / Cache

> Chantier mis en place le **01/05/2026** — commit `8295b6e`

### 8 nouvelles colonnes Supabase ajoutées

| Colonne | Type | Rôle |
|---------|------|------|
| `decision_input_hash` | string | Hash combiné (etape2 + etape3) |
| `decision_input_hash_etape2` | string | Hash des réponses vendeur |
| `decision_input_hash_etape3` | string | Hash des statuts de visite |
| `modifications_count_etape2` | int | Nombre de recalculs étape 2 |
| `modifications_count_etape3` | int | Nombre de recalculs étape 3 |
| + 3 autres colonnes | | À VÉRIFIER dans les migrations Supabase |

### Hashs de détection

```
hashEtape2  = djb2(contactResponses)
hashEtape3  = djb2(steps[].statut.join(','))
hashGlobal  = hashEtape2 + '|' + hashEtape3
```

Un hash différent = les données ont changé → la décision cachée est invalide.

### Compteurs de modifications (limite 3/étape)

- `MAX_MODIFS = 3` dans `decisionCache.ts`
- Chaque appel "Recalculer" incrémente le compteur
- À 3 : le bouton "Recalculer" est désactivé (anti-spam), la décision cachée est affichée telle quelle

### Flow des 3 cas A/B/C dans `decision/page.tsx`

| Cas | Condition | Action |
|-----|-----------|--------|
| **A** | Hash inchangé ET décision en cache | Affiche la décision sans appel Claude |
| **B** | Hash changé ET compteur < 3 | Appelle Claude, met à jour le cache |
| **C** | Hash changé MAIS compteur ≥ 3 | Affiche la décision cachée, désactive "Recalculer" |

### Anti-spam "Recalculer"

Bouton "Recalculer" dans l'UI des étapes 2, 3 et 4 :
- Désactivé si `modif_count >= MAX_MODIFS`
- Message explicatif affiché à l'utilisateur

### Reprise intelligente de l'étape 3

Si l'utilisateur revient sur `/visite` avec un `?id=` existant :
- Le scénario déjà généré est rechargé depuis `localStorage.autocheck_visite` ou Supabase
- Les statuts OK/NOK/Passé déjà cochés sont restaurés
- Pas de re-génération du scénario si `visit_data` existe

### Tableau complet des clés localStorage

| Clé | Type | Étape | Description |
|-----|------|-------|-------------|
| `autocheck_session_id` | string (UUID) | Global | Identifiant de session anonyme |
| `autocheck_row_id` | string (UUID) | Global | ID de la ligne Supabase |
| `autocheck_analyse` | JSON (AnalyseResult) | Étape 1 | Résultat complet de l'analyse |
| `autocheck_annonce` | string | Étape 1 | Texte brut de l'annonce |
| `autocheck_source_url` | string | Étape 1 | URL d'origine |
| `autocheck_from_history` | 'true' / null | Étape 1 | Chargé depuis l'historique |
| `autocheck_loaded_at` | ISO timestamp | Étape 1 | Horodatage du chargement |
| `autocheck_questions` | JSON (ContactQuestionsResult) | Étape 2 | Questions générées |
| `autocheck_contact` | JSON (ContactVerdict) | Étape 2 | Verdict de l'analyse vendeur |
| `autocheck_contact_responses` | string | Étape 2 | Réponses brutes du vendeur |
| `autocheck_contact_files` | JSON (UploadedFile[]) | Étape 2 | Images uploadées (base64) |
| `autocheck_modif_count2` | number (0-3) | Étape 2 | Compteur de modifications |
| `autocheck_visite` | JSON (VisiteData) | Étape 3 | Scénario + statuts des étapes |
| `autocheck_modif_count3` | number (0-3) | Étape 3 | Compteur de modifications |
| `autocheck_decision` | JSON (DecisionFinale) | Étape 4 | Décision finale |
| `autocheck_decision_hash` | string | Étape 4 | Hash global pour détection de changement |
| `autocheck_decision_hash2` | string | Étape 4 | Hash étape 2 |
| `autocheck_decision_hash3` | string | Étape 4 | Hash étape 3 |
| `DEBUG_AUTOCHECK` | '1' | Debug | Active les logs de debug |

---

## 7. Flags et modes de debug

### `DEBUG_AUTOCHECK`

**Activation :** Dans la console du navigateur :
```javascript
localStorage.setItem('DEBUG_AUTOCHECK', '1')
// Puis recharger la page
```

**Désactivation :**
```javascript
localStorage.removeItem('DEBUG_AUTOCHECK')
```

**Ce qui s'affiche :**
- Hits/misses du cache de décision
- Valeurs des compteurs de modifications
- Comparaisons de hashs (ancien vs nouveau)
- Flux des cas A/B/C dans `decisionCache.ts`

**Implémentation :** La fonction `dbg()` dans `decisionCache.ts` vérifie `localStorage.DEBUG_AUTOCHECK === '1'` avant chaque `console.log`.

### Variables d'environnement (`.env.local`)

```bash
# === OBLIGATOIRES ===
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # Pour bypasser RLS sur bookmarklet_tokens
BROWSERLESS_API_KEY=...                  # Scraping JS-heavy (LeBonCoin, CarGurus)
GOOGLE_SEARCH_KEY=AIzaSy...              # Google Custom Search API
GOOGLE_SEARCH_CX=...                     # ID du moteur de recherche Google

# === FUTURES PHASES ===
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
```

---

## 8. Dépendances externes

### API Anthropic Claude

| Paramètre | Valeur |
|-----------|--------|
| Modèle utilisé | `claude-sonnet-4-6` (toutes les routes) |
| SDK | `@anthropic-ai/sdk ^0.91.1` |
| Max tokens par route | Analyse: 4000 / Contact questions: 1500 / Contact analyse: 2000 / Scénario visite: 8000 / Photo: 400 / Vidéo: 1500 / Décision: 2000 |
| Streaming | Oui, sur `/api/analyse/stream` via SSE natif |

### Supabase

| Paramètre | Valeur |
|-----------|--------|
| SDK | `@supabase/supabase-js ^2.105.1` |
| URL projet | `NEXT_PUBLIC_SUPABASE_URL` (non exposée ici) |
| Tables | `analyses`, `reputation_cache`, `bookmarklet_tokens`, `etapes_images` |
| RLS | À VÉRIFIER (service_role_key utilisé pour bookmarklet = contournement RLS) |

### Cloudflare R2

**Non utilisé actuellement.** Variables d'environnement prévues mais non intégrées. Migration planifiée pour stocker les photos de visite (étape 3).

### Stripe

**Non configuré.** Planifié pour le Chantier 5 (pricing & quotas).

### Twilio

**Non configuré.** Planifié pour le Chantier 2 (auth SMS Verify + RGPD).

### Browserless.io

Utilisé dans `/api/scrape` pour les sites JS-heavy (LeBonCoin, CarGurus). Requiert `BROWSERLESS_API_KEY`.

### Google Custom Search API

Utilisé dans `/api/visite-image` pour trouver des images d'exemple par étape d'inspection. Requiert `GOOGLE_SEARCH_KEY` + `GOOGLE_SEARCH_CX`.

### Vercel

Déploiement standard Next.js. Pas de `vercel.json` trouvé — configuration par défaut Vercel (toutes les routes API = Edge/Node serverless functions).

---

## 9. Chantiers récents — Historique Git

### 15 derniers commits

| Hash | Date | Message |
|------|------|---------|
| `8295b6e` | **01/05/2026** ⭐ | `feat: cache multi-niveaux, reprise intelligente et limite de 3 modifications` |
| `0c89e55` | 01/05/2026 ⭐ | `fix: guard null reputation across all steps and block CTA until complete` |
| `348e8f3` | 01/05/2026 ⭐ | `fix: replace raw JSON streaming display and unblock CTA during reputation load` |
| `eeb5314` | 01/05/2026 | `feat: progressive streaming — forward Claude tokens as chunk events to client` |
| `7573376` | 01/05/2026 | `fix: StepNav reads id from URL + localStorage, analyse useEffect else-branch for localStorage` |
| `b22e164` | 01/05/2026 | `fix: prevent duplicate ?id= in contact navigate, restore analyse from localStorage` |
| `bc5b8fe` | 01/05/2026 | `fix: StepNav Annonce step now carries ?id=, /analyse?id= shows results directly` |
| `88a6d8c` | 01/05/2026 | `fix: show empty-text error and char counter on Texte de l'annonce tab` |
| `40a9f16` | 01/05/2026 | `fix: restore session from Supabase when navigating directly to /contact, /visite, /decision` |
| `63c3164` | 01/05/2026 | `fix: await Supabase save before routing + strip photos from decision POST` |
| `97d2678` | 01/05/2026 | `debug: add inline error display and console logs to extension popup` |
| `691d895` | 01/05/2026 | `fix: migrate bookmarklet token store from in-memory Map to Supabase` |
| `3426624` | 01/05/2026 | `fix: replace URL params with server-side token to avoid Chrome URL length limit` |
| `118ae16` | 01/05/2026 | `feat: add Chrome extension for one-click listing analysis` |
| `5f90d93` | 01/05/2026 | `fix: replace window.open with window.location.href in bookmarklet` |

### Commits majeurs identifiés

**`8295b6e` — Cache multi-niveaux (01/05/2026)**
> Introduction du système complet de cache : hashs djb2 pour étapes 2 et 3, compteurs de modifications (MAX_MODIFS=3), 8 nouvelles colonnes Supabase, flux A/B/C dans decision/page.tsx, reprise intelligente de l'étape 3.

**`348e8f3` — Fix streaming (01/05/2026)**
> Remplacement de l'affichage brut du JSON Claude par le `StreamingDisplay` propre. Déblocage du CTA pendant le chargement de la réputation.

**`0c89e55` — Fix null reputation (01/05/2026)**
> Guard `null` sur l'objet réputation dans toutes les étapes. Le CTA (bouton "Continuer") est bloqué tant que la réputation n'est pas chargée.

**`eeb5314` — Progressive streaming (01/05/2026)**
> La route `/api/analyse/stream` forward désormais les tokens bruts de Claude vers le client au fur et à mesure (Server-Sent Events), permettant un affichage progressif.

**`691d895` — Migration bookmarklet (01/05/2026)**
> Migration du stockage des tokens de bookmarklet d'un `Map` in-memory (perdu au redémarrage du serveur) vers Supabase, avec TTL et nettoyage automatique.

---

## 10. Limitations connues / TODO

### Mentions TODO/FIXME/HACK dans le code

À VÉRIFIER directement avec `grep -r "TODO\|FIXME\|HACK\|V2" src/` — aucune mention explicite n'a été remontée lors de l'exploration du code, ce qui peut signifier soit qu'il n'y en a pas, soit qu'elles sont formulées différemment.

### Fonctionnalités partiellement implémentées

| Fonctionnalité | État | Fichier/Note |
|----------------|------|--------------|
| Cloudflare R2 (stockage photos) | Variables prévues, non intégrées | `.env.local` contient les clés R2 mais aucun appel R2 dans le code |
| Auth utilisateur | Non implémentée | Supabase RLS non activé pour `analyses` |
| Stripe (paiement) | Non implémenté | Pas de code Stripe trouvé |
| Twilio SMS | Non implémenté | Pas de code Twilio trouvé |
| Extension Chrome | Implémentée (commit `118ae16`) | Via bookmarklet token Supabase |
| Profil utilisateur | Non implémenté | Prévu Chantier 3 |

### Limitations techniques identifiées

1. **Stockage base64 dans localStorage** : Les photos de visite (étape 3) sont stockées en base64 dans `autocheck_contact_files`. Peut atteindre la limite de 5-10 Mo de localStorage sur mobile.

2. **Pas de gestion d'erreur réseau sur le streaming SSE** : Si la connexion coupe pendant le streaming `/api/analyse/stream`, le comportement de reprise n'est pas documenté.

3. **Service role key exposée côté serveur uniquement** : `SUPABASE_SERVICE_ROLE_KEY` est utilisée dans `/api/bookmarklet-store` pour bypasser RLS — ne doit jamais se retrouver dans un composant client.

4. **RLS Supabase** : La table `analyses` n'a pas de RLS activé (À VÉRIFIER), ce qui signifie que n'importe quel utilisateur connaissant un `row_id` pourrait lire les données d'un autre.

5. **Modèle Claude** : Toutes les routes utilisent `claude-sonnet-4-6`. En cas de changement de modèle, mettre à jour `src/lib/claude.ts` et vérifier les token budgets.

---

## 11. Prochains chantiers planifiés

| Chantier | Titre | Description |
|----------|-------|-------------|
| **2** | Auth SMS Twilio Verify + RGPD basique | Authentification par SMS (Twilio Verify). Consentement RGPD minimal. |
| **3** | Profil utilisateur | 6 champs de profil utilisateur (À VÉRIFIER : quels champs exactement). |
| **4** | Intégration profil dans IA étapes 2/3/4 | Injecter le profil utilisateur dans les prompts Claude des étapes 2, 3 et 4 pour personnaliser les recommandations. |
| **5** | Pricing & quotas Stripe | Modèle freemium + abonnement. Tarifs : 1€ inscription / 4,99€ (À VÉRIFIER) / 19,99€ / 15,99€ abonnement. |
| **-** | Migration Cloudflare R2 | Stocker les photos de visite (étape 3) sur R2 plutôt qu'en base64 dans localStorage/Supabase. |

---

## 12. Comment lancer le projet en local

### Prérequis

- Node.js ≥ 18
- npm ou yarn
- Compte Supabase (projet configuré avec les 4 tables)
- Clé API Anthropic
- (Optionnel) Clé Browserless.io pour le scraping JS-heavy
- (Optionnel) Google Custom Search API pour les images d'étapes

### 1. Cloner le repo

```bash
git clone <url-du-repo>
cd autocheck
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer le `.env.local`

Créer un fichier `.env.local` à la racine :

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Scraping (optionnel)
BROWSERLESS_API_KEY=...

# Images étapes (optionnel)
GOOGLE_SEARCH_KEY=AIzaSy...
GOOGLE_SEARCH_CX=...
```

### 4. Créer les tables Supabase

Dans l'éditeur SQL de Supabase, créer les tables `analyses`, `reputation_cache`, `bookmarklet_tokens`, `etapes_images` avec le schéma décrit en section 2.

> À VÉRIFIER : existence de migrations SQL dans le repo (dossier `supabase/migrations/` ou `sql/`).

### 5. Lancer en développement

```bash
npm run dev
# → http://localhost:3000
```

### 6. Builder pour la production

```bash
npm run build
npm run start
# ou déployer directement sur Vercel via git push
```

### 7. Déploiement Vercel

```bash
vercel deploy
# ou : pousser sur la branche main si Vercel est connecté au repo GitHub
```

---

## 13. Anomalies détectées pendant l'audit

### ⚠️ ANOMALIE 1 — Next.js version inhabituelle (16.2.4)

La version de Next.js dans `package.json` est **16.2.4**, qui est une version **significativement supérieure** à la série 15.x connue. Il s'agit probablement d'une version pré-release ou une version majeure future avec des breaking changes non documentés dans le code source habituel. **Lire absolument `node_modules/next/dist/docs/` avant toute modification des routes ou du layout.**

### ⚠️ ANOMALIE 2 — Photos stockées en base64 dans localStorage

Les fichiers uploadés à l'étape 2 (`autocheck_contact_files`) sont stockés en JSON/base64 dans localStorage. Avec plusieurs images de haute résolution, cela peut facilement dépasser 5 Mo et provoquer des `QuotaExceededError` silencieux. La migration vers R2 (prévue) est importante.

### ⚠️ ANOMALIE 3 — RLS Supabase non confirmé

La table `analyses` stocke des données potentiellement sensibles (annonces, réponses vendeur, photos). L'utilisation de `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique) sans Row Level Security confirmée signifie que n'importe qui avec l'URL Supabase et un `id` valide pourrait lire des données. À vérifier et corriger avant de rendre l'app publique (Chantier 2 — auth).

### ⚠️ ANOMALIE 4 — Pas de `vercel.json` / timeout potentiel

La route `/api/visite` avec `action=scenario` utilise **8 000 tokens** max et peut prendre 15-30 secondes. Sans configuration explicite du timeout dans `vercel.json`, la limite par défaut des fonctions serverless Vercel est de **10 secondes** sur le plan gratuit. À vérifier ou configurer `maxDuration` dans la config Next.js route handler.

### ⚠️ ANOMALIE 5 — Streaming SSE et timeout Vercel

La route `/api/analyse/stream` est un stream SSE long. Sur Vercel, les fonctions Edge supportent les streams, mais les fonctions Node.js serverless ont une limite de durée. Vérifier que cette route utilise bien le runtime Edge (`export const runtime = 'edge'`) ou un `maxDuration` suffisant.

### ℹ️ NOTE — Extension Chrome présente mais non documentée

Commit `118ae16` ajoute une extension Chrome. Il doit exister un dossier `extension/` ou similaire à la racine du projet, non exploré dans cet audit. À documenter séparément.

---

*Document généré le **2026-05-02** par exploration automatisée du code source du projet AutoCheck.*  
*Pour signaler une erreur ou une mise à jour, éditer directement ce fichier ou régénérer via une nouvelle session.*
