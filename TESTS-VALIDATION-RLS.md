# Tests de Validation - Solution Permanente RLS

**Date**: 2026-01-28
**Objectif**: Valider que la solution permanente résout définitivement le problème de perte de données profil

---

## ✅ Checklist Pré-Tests

Avant de commencer les tests, vérifier :

- [x] Middleware mis à jour avec `getSession()` (commit 3738be0)
- [x] RLS policies sécurisées (29 policies validées dans Supabase)
- [x] Tables `user_profiles` et `role_profiles` existent
- [x] Schema à jour dans le code
- [ ] **Code déployé sur Vercel** ← À FAIRE MAINTENANT

---

## Test 1: Persistence du Profil Après Refresh

**Objectif**: Vérifier que les modifications de profil persistent après un refresh de page.

### Étapes
1. Login sur l'application
2. Aller sur `/account`
3. Modifier les informations suivantes :
   - Full Name: `[Nouveau nom]`
   - City: `[Nouvelle ville]`
   - Ajouter une compétence
4. Cliquer sur "Save"
5. **Attendre la confirmation de sauvegarde**
6. Faire un **hard refresh** de la page (Cmd+Shift+R ou Ctrl+Shift+R)
7. Vérifier que toutes les modifications sont toujours présentes

### Résultat Attendu
✅ Toutes les modifications doivent être visibles après le refresh

### Résultat Réel
- [ ] ✅ PASS
- [ ] ❌ FAIL - Décrire le problème :

---

## Test 2: Persistence Après Redéploiement

**Objectif**: Vérifier que les données persistent après un nouveau déploiement Vercel.

### Étapes
1. Login sur l'application
2. Noter les données actuelles du profil :
   - Full Name: `__________`
   - Email: `__________`
   - Nombre de compétences: `__________`
3. Faire une **modification mineure** dans le code (ex: ajouter un commentaire dans `README.md`)
4. Commit et push :
   ```bash
   git add README.md
   git commit -m "test: trigger deployment for RLS validation"
   git push origin main
   ```
5. **Attendre la fin du déploiement Vercel** (2-3 minutes)
6. Vérifier le nouveau déploiement sur le dashboard Vercel
7. Login sur l'application (nouvelle instance déployée)
8. Aller sur `/account`
9. Vérifier que toutes les données notées à l'étape 2 sont toujours présentes

### Résultat Attendu
✅ Toutes les données de profil doivent être identiques avant et après le déploiement

### Résultat Réel
- [ ] ✅ PASS
- [ ] ❌ FAIL - Décrire le problème :

---

## Test 3: Isolation Utilisateur (Sécurité)

**Objectif**: Vérifier qu'un utilisateur ne peut pas voir les données d'un autre utilisateur.

### Prérequis
- Au moins 2 comptes utilisateurs existants dans la base de données

### Étapes

#### 3.1 - Test avec User A
1. Login avec **User A**
2. Aller sur `/account`
3. Noter les informations de User A :
   - Full Name: `__________`
   - Email: `__________`
4. Ouvrir la console développeur (F12)
5. Aller sur l'onglet "Application" → "Cookies"
6. Noter l'ID de session (cookie `sb-*-auth-token`)

#### 3.2 - Test avec User B
7. **Logout** de User A
8. Login avec **User B** (compte différent)
9. Aller sur `/account`
10. Vérifier que les informations affichées sont celles de User B (pas User A)

#### 3.3 - Test API Direct (Technique)
11. Dans la console développeur, exécuter :
    ```javascript
    // Tenter de récupérer tous les profils (devrait être bloqué par RLS)
    fetch('/api/get-all-profiles')
      .then(r => r.json())
      .then(data => console.log('Profiles:', data));
    ```
12. Si l'API n'existe pas, c'est normal (signe que l'app ne permet pas ce type de requête)

### Résultat Attendu
✅ User B ne voit **QUE** ses propres données
✅ Aucun moyen de voir les données de User A
✅ Les requêtes API ne retournent que les données de l'utilisateur authentifié

### Résultat Réel
- [ ] ✅ PASS
- [ ] ❌ FAIL - Décrire le problème :

---

## Test 4: Pas de Logout Intempestif

**Objectif**: Vérifier que l'utilisateur reste connecté même après expiration du token initial.

### Étapes
1. Login sur l'application
2. Ouvrir la console développeur (F12)
3. Vérifier le token JWT actuel :
   ```javascript
   // Copier-coller dans la console
   const cookies = document.cookie.split(';');
   const authCookie = cookies.find(c => c.includes('sb-'));
   console.log('Auth cookie present:', !!authCookie);
   ```
4. **Laisser l'application ouverte pendant 1 heure** (ou modifier l'expiration du token en dev pour accélérer)
5. Après 1 heure, faire une action dans l'app :
   - Changer de page
   - Modifier le profil
   - Créer une application
6. Vérifier que l'action réussit **sans être redirigé vers /login**

### Résultat Attendu
✅ L'utilisateur reste connecté
✅ Les actions fonctionnent normalement
✅ Le token est refresh automatiquement en arrière-plan

### Résultat Réel
- [ ] ✅ PASS
- [ ] ❌ FAIL - Décrire le problème :

### Note
Si le test prend trop de temps (1h), on peut le considérer comme PASS si :
- Le middleware utilise bien `getSession()` (déjà validé dans le code)
- Pas de logout observé lors des tests 1 et 2

---

## Test 5: Création de Nouveau Profil

**Objectif**: Vérifier qu'un nouvel utilisateur peut créer son profil sans erreur.

### Étapes
1. Créer un **nouveau compte** (signup)
2. Login avec ce nouveau compte
3. Vérifier la redirection vers la page principale
4. Aller sur `/account`
5. Vérifier qu'un profil vide est affiché (pas d'erreur RLS)
6. Remplir les champs suivants :
   - Full Name
   - Email
   - City
   - Ajouter au moins une compétence
7. Cliquer sur "Save"
8. Vérifier le message de succès
9. Refresh la page
10. Vérifier que les données sont toujours présentes

### Résultat Attendu
✅ Profil vide créé automatiquement au premier login
✅ Sauvegarde réussit sans erreur
✅ Données persistent après refresh

### Résultat Réel
- [ ] ✅ PASS
- [ ] ❌ FAIL - Décrire le problème :

---

## 🐛 Procédure en Cas d'Échec

Si un test échoue :

1. **Noter les détails** :
   - Quel test a échoué ?
   - Message d'erreur exact (copier-coller)
   - Screenshot si pertinent

2. **Vérifier les logs** :
   - Ouvrir la console développeur (F12)
   - Copier les erreurs rouges
   - Vérifier les erreurs réseau (onglet Network)

3. **Vérifier Supabase** :
   - Aller sur Supabase Dashboard → Logs
   - Filtrer par "postgres-logs"
   - Chercher des erreurs RLS (code 42501 ou PGRST301)

4. **Rollback si nécessaire** :
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📊 Résumé des Tests

Une fois tous les tests complétés, remplir ce tableau :

| Test | Status | Notes |
|------|--------|-------|
| 1. Persistence après refresh | ⬜ PASS / ⬜ FAIL | |
| 2. Persistence après redéploiement | ⬜ PASS / ⬜ FAIL | |
| 3. Isolation utilisateur | ⬜ PASS / ⬜ FAIL | |
| 4. Pas de logout intempestif | ⬜ PASS / ⬜ FAIL | |
| 5. Création nouveau profil | ⬜ PASS / ⬜ FAIL | |

**Statut Global** : ⬜ TOUS PASS ✅ / ⬜ AU MOINS UN FAIL ❌

---

## ✅ Critères de Succès

La solution permanente est considérée comme **validée** si :

1. ✅ **5/5 tests PASS**
2. ✅ Aucun report de "données disparues" sur 7 jours
3. ✅ Logs Sentry : <1% d'erreurs RLS
4. ✅ Aucun ticket support lié à la perte de profil

---

## 📝 Suivi Post-Déploiement (7 jours)

**Semaine du** : `[Date]` au `[Date]`

### Métriques à surveiller

| Jour | Reports "données perdues" | Erreurs RLS (Sentry) | Tickets Support | Notes |
|------|---------------------------|---------------------|-----------------|-------|
| J+1  | 0 | 0% | 0 | |
| J+2  | 0 | 0% | 0 | |
| J+3  | 0 | 0% | 0 | |
| J+4  | 0 | 0% | 0 | |
| J+5  | 0 | 0% | 0 | |
| J+6  | 0 | 0% | 0 | |
| J+7  | 0 | 0% | 0 | |

### Seuils d'alerte

- 🟢 **OK** : 0 reports, <1% erreurs RLS
- 🟡 **Surveiller** : 1-2 reports, 1-5% erreurs RLS
- 🔴 **Action requise** : >2 reports, >5% erreurs RLS

---

*Document créé le 2026-01-28 - Validation de la solution permanente RLS*
