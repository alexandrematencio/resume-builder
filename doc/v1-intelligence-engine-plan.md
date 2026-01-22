# Spécifications Techniques : Job Tracker Intelligence Engine

## 🏗 Architecture Cible (Next.js 14/15)
- **Framework :** Next.js App Router.
- **Data Fetching :** React Server Components (RSC) pour le filtrage lourd.
- **Interactions :** Server Actions pour le feedback adaptatif.
- **AI :** Vercel AI SDK pour le streaming des conseils de candidature.
- **Database :** Prisma / PostgreSQL (Logique de scoring et filtrage).

---

## 🎯 Le Prompt Maître pour Implémentation

> **Persona :** Tu es un Senior AI Architect. Tu dois implémenter la fonctionnalité "Intelligence Engine" de Job Tracker.
>
> ### 1. Entrées de Données (Sourcing Option B)
> L'application traite des objets `JobOffer` bruts injectés via API. 
> - **Core Profile :** Données utilisateur (Pays, Villes, Salaire Min, Heures/Semaine).
> - **Role Profile :** Cibles spécifiques (Remote preference, Required Skills).
>
> ### 2. Logique de Filtrage Hybride (Le "Moteur")
> Implémenter un service TypeScript `JobFilterService` qui exécute :
>
> **A. Hard Blockers (Logiciel de filtrage strict) :**
> - Rejeter si : `Salary < UserMin`, `Location` hors liste, ou `HoursPerWeek` hors fourchette.
> - Gestion stricte du type de présentiel (Full Remote, Hybrid, On-site).
>
> **B. Scoring Sémantique (Option A & C) :**
> - **Skills Match :** Calculer un ratio (Seuil de pertinence : 65%). Utiliser une comparaison sémantique (pas seulement des mots-clés).
> - **Perks Match :** Identifier les avantages (Swile, Mutuelle, etc.) et compter ceux qui matchent avec les `PreferredPerks` de l'utilisateur.
>
> ### 3. Composants UI (Tailwind CSS)
> - **Settings Dashboard :** Sliders de pondération (Poids Salaire vs Skills) + Multi-select Avantages.
> - **Listing Card :** Affichage synthétique. Règle : Si donnée absente (ex: Salaire), le composant est masqué (Zéro N/A).
> - **Intelligence View :** Page de détail avec l'offre originale transcriptée, les insights AI (Points forts, Gap critique de skill) et les conseils stratégiques.
>
> ### 4. Livrables Techniques
> 1. **Schema Prisma :** Modèles `User`, `JobOffer`, `Preference` (avec poids des sliders), et `Feedback`.
> 2. **Server Action `analyzeJobAction` :** Logique de scoring et appel AI.
> 3. **Interface React :** Composants `JobCard` et `FilterSettings`.
>
> **Action attendue :** Présente d'abord le plan de la Phase 1 (Architecture & Schéma de données) avant de générer le code.