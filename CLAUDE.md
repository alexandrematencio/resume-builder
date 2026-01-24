---
# Claude Code Project Instructions
# This file MUST NOT be deleted or have sections removed
# Only additions and updates are allowed
version: "2.0"
project: resume-builder
architecture: "agentic-v2"
last_updated: 2026-01-22
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# PART 1: AGENT ROUTING SYSTEM

## 🚨 RÈGLE FONDAMENTALE

**AUCUNE tâche ne doit être exécutée sans passer par le système de routing.**

Avant de répondre à TOUTE demande :
1. Identifier le TYPE de tâche (voir §Routing Matrix)
2. Invoquer les agents REQUIS selon la matrice
3. Exécuter les CHECKLISTS obligatoires (voir AGENTS.md)
4. Passer par le GATE final approprié (voir GATES.md)

---

## 🤔 PROTOCOLE DE CLARIFICATION

### Quand demander une clarification

AVANT d'exécuter une tâche, vérifier si la demande est ambiguë :

| Signal d'ambiguïté | Exemple | Action |
|-------------------|---------|--------|
| Scope non défini | "Améliore le design" | Demander : "Quel écran/composant ?" |
| Plusieurs interprétations | "Fixe le bouton" | Demander : "Le style, le comportement, ou le bug ?" |
| Impact inconnu | "Refactor le code" | Demander : "Quel périmètre ? Quels fichiers ?" |
| Contradictions potentielles | "Ajoute plus d'options" | Alerter : "Cela contredit la règle anti-fatigue (max 3 choix)" |
| Données sensibles impliquées | "Ajoute un log pour debug" | Demander : "Quelles données ? PII possible ?" |

### Format de question de clarification

```markdown
## ❓ Clarification requise

Avant de procéder, j'ai besoin de préciser :

1. **[Question 1]** : [Options A / B / C]
2. **[Question 2]** : [Options ou texte libre]

Une fois clarifié, je pourrai :
- [Action prévue 1]
- [Action prévue 2]
```

### Limites

- Maximum **3 questions** de clarification par demande
- Si plus de 3 ambiguïtés → demander à l'humain de reformuler entièrement
- Ne jamais deviner si risque de sécurité ou impact majeur

---

## 🛑 CHECKPOINTS DE CONSENTEMENT HUMAIN

### Actions nécessitant approbation EXPLICITE

| Catégorie | Action | Niveau |
|-----------|--------|--------|
| **Code destructif** | Suppression de fichiers, refactor majeur | 🔴 STOP - Demander |
| **Données sensibles** | Modification auth, profile, PII | 🔴 STOP - Demander |
| **Scope étendu** | Modifier plus de 5 fichiers | 🟠 PAUSE - Confirmer |
| **Architecture** | Nouveau pattern, nouvelle dépendance | 🟠 PAUSE - Confirmer |
| **UI majeure** | Nouveau composant, nouvelle page | 🟡 INFO - Valider le plan |
| **Bug fix simple** | Correction isolée, 1-2 fichiers | ✅ AUTO - Procéder |

### Format de demande d'approbation

```markdown
## 🛑 Approbation requise

### Action prévue
[Description de ce que je vais faire]

### Fichiers impactés
- [fichier 1] : [type de modification]
- [fichier 2] : [type de modification]

### Risques identifiés
- [Risque 1] : [mitigation]

### Alternatives considérées
- [Alternative A] : [pourquoi non retenue]

---

**Confirmer pour procéder** : Réponds "OK" ou "Procède" pour valider.
**Modifier** : Indique ce que tu veux changer.
**Annuler** : Réponds "Stop" ou "Annule".
```

### Règles d'autonomie

| Situation | Autonomie |
|-----------|-----------|
| Tâche claire + scope limité + pas de PII | ✅ Procéder avec rapport |
| Tâche claire + scope moyen | 🟡 Présenter le plan, puis procéder |
| Tâche ambiguë | ❓ Clarifier d'abord |
| Impact majeur ou PII | 🔴 Attendre approbation explicite |

---

## 📋 Routing Matrix

### Triggers automatiques par mots-clés

| Si la demande contient... | Invoquer OBLIGATOIREMENT | Ordre |
|---------------------------|-------------------------|-------|
| `implement`, `code`, `add`, `create`, `build` | Dev → Security (post) | 1→2 |
| `design`, `UI`, `component`, `button`, `card`, `modal` | UX → Brand → Dev → Security | 1→2→3→4 |
| `harmonize`, `unify`, `consistent`, `align` | UX (inventaire) → Brand → Dev | 1→2→3 |
| `fix`, `bug`, `error`, `debug` | Dev → Security (audit code touché) | 1→2 |
| `user data`, `profile`, `CV`, `email`, `PII` | Security (pré-analyse) → Dev | 1→2 |
| `API`, `endpoint`, `route`, `fetch` | Dev → Security (obligatoire) | 1→2 |
| `log`, `console`, `debug`, `print` | Security (BLOQUANT si PII possible) | 1 |
| `feature`, `story`, `epic`, `PRD` | PRD → UX → Brand | 1→2→3 |
| `refactor`, `clean`, `optimize` | Dev → Security → UX (si UI) | 1→2→3 |
| `style`, `color`, `font`, `spacing`, `animation` | Brand → Dev | 1→2 |
| `form`, `input`, `validation` | UX → Dev → Security | 1→2→3 |
| `export`, `download`, `PDF`, `file` | Security (pré) → Dev → Security (post) | 1→2→3 |

### Triggers par type de fichier modifié

| Si le code touche... | Invoquer OBLIGATOIREMENT |
|---------------------|-------------------------|
| `*.tsx` (composants) | UX checklist + Security audit |
| `*/api/*` (routes API) | Security audit BLOQUANT |
| `*Context*.tsx` | Security + UX |
| `lib/*-db.ts` | Security audit BLOQUANT |
| `console.log` ajouté | Security BLOQUANT - vérifier PII |
| Tout fichier avec `user`, `profile`, `auth` | Security pré + post |

---

## 🔄 Protocole de coordination

### Format de réponse obligatoire

Toute réponse impliquant du code ou du design DOIT inclure :

```markdown
## Routing Report
- Agents invoqués : [liste]
- Checklists complétées : [✅/❌ par agent]
- Gate final : [PASS/FAIL + motif si fail]

## [Contenu de la réponse]

## Conformité
| Critère | Status |
|---------|--------|
| Security audit | ✅/❌ |
| UX states couverts | ✅/❌ |
| Brand alignment | ✅/❌ |
| PII check | ✅/❌ |
```

---

## 🚫 HARD BLOCKS

Ces situations BLOQUENT toute progression jusqu'à résolution :

| Situation | Action |
|-----------|--------|
| `console.log` avec données user possibles | STOP → Security audit avant merge |
| Composant UI sans liste d'états | STOP → UX doit lister tous les états |
| API route sans validation input | STOP → Security doit valider |
| Modification auth/profile sans Security | STOP → Security pré-requis |
| "Harmoniser" sans inventaire préalable | STOP → UX doit scanner tous les composants similaires |

---

## 📁 Fichiers de référence agents

Lire OBLIGATOIREMENT avant toute tâche :
- `AGENTS.md` - Définitions agents + checklists
- `GATES.md` - Protocoles de validation finale
- `PRD.md` - Vision produit et priorités
- `DESIGN-SYSTEM.md` - Priorités UX et standards composants
- `BRAND-IDENTITY.md` - Identité visuelle et ton

**Note** : Ne pas confondre DESIGN-SYSTEM.md (UX) et BRAND-IDENTITY.md (visuel).

---

## 🎯 Priorités du projet

### UX (ordre strict)
1. Fiabilité & professionnalisme (5 premières secondes)
2. Anti-fatigue décisionnelle & anti-regret
3. Empowerment & contrôle utilisateur
4. Inclusivité & accessibilité
5. Anti-addiction & anti-manipulation

### Brand (ordre strict)
1. Moderne
2. Professionnel
3. Minimaliste
4. Calme
5. Raffiné
6. Premium
7. Bienveillant

### Security (non-négociables)
- GDPR compliance
- Zero PII dans logs/console
- RLS sur toutes les tables Supabase
- Validation input sur toutes les API routes
- Consent explicite pour traitement AI

---

# PART 2: PROJECT DOCUMENTATION

## Commands

```bash
npm run dev      # Start development server (Turbopack disabled due to Tailwind issues)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture

This is a **Job Application Management** app built with Next.js 16 (App Router), React 19, Supabase, and Tailwind CSS. Users can track job applications, generate AI-powered CVs/cover letters, and manage their professional profile with role-specific customizations.

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 3.4
- **Backend**: Supabase (PostgreSQL + Auth), Anthropic Claude API
- **Libraries**: React Hook Form + Zod (validation), React Dropzone (file uploads), pdf-parse (PDF extraction), html2canvas + jsPDF (CV export)

---

## Core Data Model

All types are defined in `app/types.ts`:

### Application Types
- **Application**: Main entity with company, role, job description, status, and nested:
  - `cvVersions: CVVersion[]` - Generated or manual CV versions
  - `coverLetters: CoverLetter[]` - With styles: french_formal, french_modern, american_standard, american_creative
  - `statusHistory: StatusChange[]` - Timeline of status changes
  - `tracking: ApplicationTracking` - Sent date, interview info, outcome

- **ApplicationStatus**: draft | sent | waiting | interview | offer | rejected | closed

### User Profile Types
- **UserProfile**: Central user identity with personal info, professional summary, and arrays:
  - `education: Education[]`
  - `workExperience: WorkExperience[]`
  - `skills: Skill[]` (with category: technical/soft/language/tool and proficiency levels)
  - `certifications: Certification[]`
  - `languages: Language[]`
  - `portfolioLinks: PortfolioLink[]`

- **RoleProfile**: Job-specific CV variations with:
  - Custom summary per role
  - Selected experiences, skills, education to highlight
  - Custom achievements per experience
  - Icon and color customization

---

## Database Layer

Supabase with Row Level Security (RLS) for user data isolation.

### Database Files
- `lib/supabase-browser.ts` - Client-side Supabase client
- `lib/supabase-server.ts` - Server-side Supabase client for SSR/API routes
- `lib/supabase-db.ts` - Application CRUD (applications, templates, CV versions, cover letters)
- `lib/profile-db.ts` - Profile CRUD (user profiles, role profiles, completeness calculation)

### Tables (defined in `supabase-schema.sql`)
- **templates** - CV templates
- **applications** - Job applications
- **cv_versions** - Versioned CV content
- **cover_letters** - Versioned cover letters
- **status_history** - Timeline of status changes
- **application_tracking** - Interview scheduling, outcomes
- **user_profiles** - User profile data (JSONB for nested arrays)
- **role_profiles** - Role-based CV customizations

---

## Authentication

Supabase Auth with email/password:
- `app/contexts/AuthContext.tsx` - Provides `useAuth()` hook with `user`, `signIn`, `signUp`, `signOut`
- `middleware.ts` - Route protection: redirects unauthenticated users to `/login`
- **Public routes**: `/login`, `/signup`, `/auth/callback`, `/landing`
- **Protected routes**: `/` (Applications), `/jobs` (Matching), `/jobs/[id]` (Job detail), `/account`

---

## Context Providers

### AuthContext (`app/contexts/AuthContext.tsx`)
Manages authentication state and Supabase session.

### ProfileContext (`app/contexts/ProfileContext.tsx`)
Manages user profile and role profiles:
```typescript
const { profile, updateProfile, roleProfiles, saveRoleProfile } = useProfile();
```
- Auto-loads profile when user authenticates
- Creates empty profile on first login
- Tracks profile completeness percentage

### JobIntelligenceContext (`app/contexts/JobIntelligenceContext.tsx`)
Manages job intelligence state (preferences, job offers, analysis):
```typescript
const { preferences, updatePreferences, jobOffers, analyzeJob, importJob } = useJobIntelligence();
```
- Manages job preferences (salary, location, remote, perks, scoring weights)
- CRUD for imported job offers
- Triggers AI analysis (match scoring, blockers, insights)
- Stores analysis results per job

---

## API Routes

### `/api/generate-resume` - CV Generation
Calls Claude API to generate tailored CV content.

### `/api/generate-cover-letter` - Cover Letter Generation
Calls Claude API to generate cover letters with style options.

### `/api/parse-cv-section` - AI-Powered CV Parsing
Parses CV text into structured data for bulk import:
```typescript
POST /api/parse-cv-section
{
  section: 'education' | 'experience' | 'skills' | 'personal',
  content: string
}
// Returns structured data + uncertainty flags for fields AI wasn't sure about
```

### `/api/parse-job-description` - Job Description Parsing
Parses job posting text into structured JobOffer data (title, company, location, salary, skills, perks, contract type, etc.).

### `/api/analyze-job` - Job-Profile Match Analysis
Performs full match analysis:
- Hard blockers (salary, location, remote policy)
- Skills match % (including cross-language matching: French ↔ English)
- Perks match count
- Overall weighted score (0-100)
- AI insights (strengths, gaps, strategic advice, culture fit, growth potential, red flags)

### `/api/fetch-job-url` - Job URL Content Fetcher
Fetches page content from a job posting URL for parsing.

### `/api/extract-pdf-text` - PDF Text Extraction
Extracts text from uploaded PDF files:
- Uses `pdf-parse` v2 (class-based API: `new PDFParse({ data })`)
- Validates PDF magic bytes (%PDF)
- Max file size: 8MB
- Handles password-protected and image-based PDFs with appropriate errors

---

## Account Management System

Located in `app/account/` with 8 tabs:

1. **Core Info** (`PersonalInfoForm.tsx`) - Name, email, phone, location
2. **Education** (`EducationForm.tsx`) - Degrees with import support
3. **Experience** (`WorkExperienceForm.tsx`) - Work history with achievements
4. **Skills** (`SkillsForm.tsx`) - Skills with category and proficiency
5. **Certifications** (`CertificationsForm.tsx`) - Professional certifications
6. **Languages** (`LanguagesForm.tsx`) - Language proficiencies
7. **Links** (`LinksForm.tsx`) - Portfolio, GitHub, LinkedIn, etc.
8. **Role Profiles** (`RoleProfilesTab.tsx`) - Job-specific CV variations

### CV Import Feature
- `CVImportSection.tsx` - PDF upload or text paste interface
- `ImportPreviewModal.tsx` - Review and edit parsed data before saving
- Supports "Add" (append) or "Replace" (overwrite) modes

---

## Key Components

### Navigation Structure

The app has 3 main sections accessible via a bottom nav bar:
1. **Applications** (`/`) - Application pipeline tracking
2. **Matching** (`/jobs`) - Job intelligence and matching
3. **Account** (`/account`) - Profile management

### Landing Page (`app/landing/page.tsx`)
- Public marketing page for unauthenticated users
- Hero: "Know which jobs fit you before you apply."
- Features grid, core feature highlight, how-it-works, CTA

### Applications Dashboard (`app/page.tsx`)
- Application list with status filtering (all, draft, sent, waiting, interview, offer, rejected)
- KPI dashboard (counts by status)
- Interview tracking (excludes offer/rejected/closed from interview filter)

### Modals
- `CVDetailModal.tsx` - View/edit application details, CV versions, cover letters
- `NewApplicationModal.tsx` - Create new applications
- `CoverLetterModal.tsx` - Cover letter generation and editing

### Editors
- `CVEditor.tsx` - CV content editing
- `CoverLetterEditor.tsx` - Cover letter editing
- `CVRenderer.tsx` - CV preview rendering

### Matching / Job Intelligence (`app/jobs/`)
- `app/jobs/page.tsx` - Main matching page with job list, stats, preferences tab
- `app/jobs/[id]/page.tsx` - Job detail page with full analysis view
- `app/components/jobs/JobOfferCard.tsx` - Job card with score badge, meta info, actions (analyze, save, dismiss)
- `app/components/jobs/JobOffersList.tsx` - Paginated job list with filters
- `app/components/jobs/JobImportModal.tsx` - Import job via paste or URL
- `app/components/jobs/JobIntelligenceView.tsx` - Full match analysis display (score, skills, insights)
- `app/components/jobs/JobPreferencesForm.tsx` - User preferences (salary, location, remote, perks, weights)

### Services
- `lib/job-filter-service.ts` - Scoring algorithm, hard blocker detection, weight calculation
- `lib/job-intelligence-db.ts` - Supabase CRUD for job_offers, job_preferences, job_analysis_feedback

---

## Key Data Flows

### CV Import Flow
```
User uploads PDF → /api/extract-pdf-text → text extraction
                                         ↓
                  /api/parse-cv-section ← text content
                                         ↓
ImportPreviewModal shows parsed data with uncertainty highlighting
                                         ↓
User edits and confirms → saveUserProfile() → Supabase
```

### Application Workflow
```
Create Application → Track status (draft → sent → interview → offer)
                   → Generate/upload CV versions
                   → Generate/upload cover letters
                   → Schedule interviews → Record outcomes
```

### Job Matching Flow
```
User imports job (paste/URL) → /api/parse-job-description → structured JobOffer
                                                           ↓
                              /api/analyze-job ← JobOffer + UserProfile + Preferences
                                                           ↓
JobIntelligenceView shows: match score, skills %, blockers, AI insights
                                                           ↓
User decides: Save / Dismiss / Create Application
```

---

## External Integrations

| Tool | Mapping | Notes |
|------|---------|-------|
| **Notion** | Teamspace "JOB TRACKER" = this app (resume-builder) | MCP via `@notionhq/notion-mcp-server`, config in `.mcp.json` |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
NOTION_API_KEY=              # Notion integration "Claude-CareerTech" (read/write/insert)
```

---

## Development Notes

### pdf-parse v2 API
The project uses `pdf-parse` v2.4.5 which has a different API than v1:
```typescript
// v2 API (current)
import { PDFParse } from 'pdf-parse';
const pdfParser = new PDFParse({ data: uint8Array });
const result = await pdfParser.getText();
await pdfParser.destroy(); // cleanup

// NOT v1 API (old style)
// const pdfParse = require('pdf-parse');
// const data = await pdfParse(buffer);
```

### Turbopack
Turbopack is disabled in dev script due to Tailwind CSS compatibility issues. The workaround is in `package.json`:
```json
"dev": "NEXT_PRIVATE_TURBOPACK=0 next dev"
```

### Profile Completeness
Calculated in `lib/profile-db.ts` with weighted scoring:
- Work Experience: 20 points
- Professional Summary: 15 points
- Skills: 15 points
- Education: 15 points
- Portfolio Links: 10 points
- Other fields: 5 points each
- Complete threshold: 80%

---

## Implementation Status

### Completed Features
- ✅ Resume Builder & CV Management (Phase 1)
- ✅ Cover Letter System (Phase 1)
- ✅ Application Tracking Pipeline (Phase 1)
- ✅ Role Profiles (Phase 1)
- ✅ Job Intelligence Engine (Phase 2) — matching, scoring, blockers, AI insights, preferences

### Future Roadmap
1. **Job Scraping Integration** - Auto-import from LinkedIn, Indeed, etc.
2. **Data Portability** - Export all user data (GDPR compliance)
3. **Rate Limiting** - Protect AI endpoints
4. **Audit Logging** - Track data access for compliance
5. **Accessibility Audit** - Screen reader testing

---

*Last updated: 2026-01-24*
