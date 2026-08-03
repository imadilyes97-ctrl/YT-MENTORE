# Guide — Créer les clés Google OAuth pour YT Mentor

> Prérequis : un compte Google (celui qui possède les chaînes YouTube à suivre).
> Temps : ~10 minutes. Une seule fois.

## 1. Créer le projet

1. Va sur **https://console.cloud.google.com/**
2. Clique sur le sélecteur de projet (en haut à gauche) → **Nouveau projet**
3. Nom : `yt-mentor` → **Créer**
4. (Après création, sélectionne-le dans le menu déroulant)

## 2. Activer les 2 API nécessaires

Dans le projet sélectionné, ouvre le menu ☰ → **APIs & Services → Bibliothèque** :

- Recherche **YouTube Data API v3** → **Activer**
- Recherche **YouTube Analytics API** → **Activer**

> Les deux sont requises (stats + analytics). Sans l'une d'elles, la sync échoue.

## 3. Écran de consentement OAuth

Menu ☰ → **APIs & Services → Écran de consentement** :

1. **User Type** : choisir **Externe** (même si c'est pour toi seul) → **Créer**
2. Remplis uniquement :
   - **Nom de l'app** : `YT Mentor`
   - **Email d'assistance** : ton email
   - **Email de contact développeur** : ton email
   - (le reste peut rester vide)
3. **Enregistrer**
4. Dans la section **Audience de test** : ajoute ton email Google comme *Utilisateur de test*
   (important : tant que l'app n'est pas publiée, seul ce compte peut se connecter)
5. Section **Données sensibles (Scopes)** :
   - **Ajouter ou supprimer des autorisations** :
     - `.../auth/youtube.readonly`
     - `.../auth/yt-analytics.readonly`
   - → **Enregistrer**

## 4. Créer les identifiants OAuth

Menu ☰ → **APIs & Services → Identifiants** :

1. **+ Créer des identifiants → ID de client OAuth**
2. **Type d'application** : **Application Web**
3. **Nom** : `yt-mentor-web`
4. **URI de redirection autorisés** — ajouter les DEUX :
   - `http://localhost:3000/api/youtube/callback`
   - `https://<TON-DOMAINE-VERCEL>/api/youtube/callback` *(à remplir après le déploiement)*
5. **Créer**

Une fenêtre s'ouvre avec le **Client ID** et le **Client Secret**. Copie-les (ne les partage jamais).

## 5. Mettre les clés dans le projet

Ouvre `~/Documents/yt-mentor/.env` et remplis :

```
GOOGLE_CLIENT_ID="colle-le-client-id-ici"
GOOGLE_CLIENT_SECRET="colle-le-client-secret-ici"
```

## 6. Tester

```bash
cd ~/Documents/yt-mentor
NODE_OPTIONS="--openssl-legacy-provider" npm run dev
```

→ Ouvre http://localhost:3000 → **Se connecter avec Google** → connecte ta chaîne YouTube.

---

## Notes importantes

- **Audience de test** : si tu vois « erreur 403 access_denied », c'est que ton email n'est pas
  dans les *Utilisateurs de test* de l'écran de consentement (étape 3.4).
- **Refresh token** : le code force `prompt=consent` → Google renvoie un refresh_token à chaque
  connexion. Si tu te connectes une 2e fois, les tokens sont mis à jour.
- **Brand Account** : si ta chaîne est un compte de marque, elle apparaît quand même dans la liste
  au connect (Cas B gère ça).
- **Pour la production** : pense à passer l'écran de consentement en **Publié** et à ajouter ton
  domaine Vercel dans les redirect URIs.
