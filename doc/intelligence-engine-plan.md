# 🧠 Specifications: Job Tracker Intelligence Engine

## 📌 Vision du Produit
Le "Intelligence Engine" est un agent de chasse de tête automatisé. Il ne se contente pas de filtrer des bases de données : il explore activement le marché (scraping), analyse la sémantique des offres et propose des opportunités "hors-piste" basées sur le profil psychographique et technique de l'utilisateur.

---

## 🏗️ Architecture & Flux de Données

### 1. Ingestion Automatisée (Scraping)
* **Source :** Extraction de données depuis `fr.indeed.com`.
* **Mode d'acquisition :** Scraping automatisé (toutes les 6 heures via Cron Job).
* **Stratégie de recherche :** * Cibles directes (basées sur le `Role Profile`).
    * Opportunités atypiques : L'IA identifie des ponts de carrière (ex: un Directeur Artistique vers un poste de Responsable d'Atelier d'impression : moins de stress, cadre différent, même si salaire < 2x, si le profil utilisateur suggère une recherche de qualité de vie).

### 2. Moteur de Scoring (Logiciel & Sémantique)
Le service `JobFilterService` exécute une logique hybride :
* **Hard Blockers :** Filtrage strict sur la Localisation, le Salaire Min, et le Type de contrat.
* **Analyse de Contenu :** * Identification des **3 Skills prioritaires** de l'offre.
    * Extraction des **Avantages (Perks)** : Swile, Mutuelle, RTT, etc.
* **Match Visuel :** Comparaison sémantique entre les `MainSkills` de l'utilisateur et les besoins critiques de l'offre.

---

## 🛠️ Spécifications UI (Tailwind CSS)

### 1. Dashboard de Listing (`/jobs`)
Affichage sous forme de liste ultra-lisible. Chaque ligne représente une offre :
* **Éléments Clés :** Nom Compagnie, Intitulé du Poste, Salaire, Horaires, Localisation.
* **Intelligence Visuelle :** * Badge de match : Un indicateur visuel (cue) apparaît si les compétences prioritaires de l'offre correspondent aux compétences clés de l'utilisateur.
    * Zéro "N/A" : Si une information (ex: Salaire) est absente de l'offre, le champ est masqué pour garder l'interface propre.

### 2. Settings du Moteur (Modal/Section)
Contrôle du comportement de l'IA :
* **Toggle Scraping :** Arrêt/Démarrage du worker automatique.
* **Scheduling :** Durée de la mission de recherche (Options : 1j, 7j, 2 sem, 1 mois, 3 mois, 6 mois, 12 mois max).
* **Skill Focus :** Sélection manuelle des compétences que l'utilisateur souhaite prioriser pour le matching visuel.

---

## 💾 Livrables Techniques

### A. Schéma Prisma
Modèles requis :
* `User` & `Profile` (Core + Role).
* `JobOffer` (Contenu scrapé, metadata, score de match).
* `ScrapingConfig` (Statut, Date de fin de mission, Fréquence).

### B. Server Action `processJobIntelligence`
* Logique de déclenchement du scraper.
* Appel au SDK Vercel AI pour le résumé et le scoring sémantique.
* Mise à jour de la DB.

---

## 🤖 Prompt de Contexte pour Développement (Claude Code)
> "Implémente la fonctionnalité détaillée dans `docs/intelligence-engine-specs.md`. Priorise le schéma Prisma et la logique de filtrage hybride. Pour le scraping Indeed, crée une interface de service `ScraperService` avec une implémentation mockée prête pour une intégration Puppeteer/Playwright. Assure-toi que l'UI de la liste est dense mais élégante avec Tailwind."