# YT Mentor — État de session (handoff)

> Dernière mise à jour : 2026-08-03
> Projet : `~/Documents/yt-mentor`

## 📍 Où on en est

**Projet presque complet.** Spec complète dans
`~/Desktop/Nouveau document texte (4).txt`. Phases 1-9 construites, build vert (17 routes).

## ✅ Fait (Phases 1-9)

| Phase | État | Détail |
|-------|------|--------|
| 1 — Scaffold | ✅ Build vert | Next 15.5.22, TS, Tailwind 4, Prisma 6.19.3 + adaptateur Neon, schéma complet, lib/prisma.ts, lib/seeds.ts (checklist 7 étapes + 6 seeds) |
| 2 — NextAuth | ✅ Build vert | lib/auth.ts (Google, scopes YouTube, prisma adapter, seed au login), /api/auth/[...nextauth], middleware, /login |
| 3 — OAuth + sync | ✅ Build vert | lib/crypto.ts (AES-256-GCM), lib/youtube.ts (OAuth, refresh, Data v3 + Analytics, syncChannel), lib/alerts.ts (Tier1%, 7j, YPP, trajectoire), routes connect/callback/sync |
| 4 — Multi-chaînes | ✅ Build vert | channel-selector.tsx, dashboard-nav.tsx, layout dashboard (sélecteur + tabs) |
| 5 — Cron | ✅ FAIT le 03-08 | app/api/cron/sync/route.ts (Bearer CRON_SECRET, itère toutes les chaînes, sync + alertes, résumé JSON). vercel.json "0 8 * * *" |
| 6 — Dashboard + Checklist | ✅ FAIT le 03-08 | Stats réelles, 2 barres YPP (ypp-bars.tsx), graph recharts (stats-chart.tsx), top pays, alertes, brief du jour (channel-brief.tsx + /api/mentor/brief), lastVisitAt. Checklist /dashboard/checklist + /api/checklist/toggle (cycle todo→in_progress→done) |
| 7 — Tracker + Idées | ✅ FAIT le 03-08 | /dashboard/tracker (graph + entrée manuelle /api/tracker/add source=manual), /dashboard/ideas (générateur 5 titres SEO /api/ideas/generate, pilier → hook/CTA) |
| 8 — Connaissances | ✅ FAIT le 03-08 | /dashboard/knowledge, /api/knowledge/add (résumé LLM 3-5 points + catégorie, scope global/channel), détection conflit + /api/knowledge/resolve-conflict (garder/remplacer/les deux), /api/knowledge/archive |
| 9 — Mentor chat + brief | ✅ FAIT le 03-08 | lib/llm.ts (GLM-5.2 CF round-robin 6 comptes, fallback MiniMax Dahl), lib/mentor.ts (prompt dynamique + budget 3000 tokens, 15/catégorie), /api/mentor/chat (historique ChatMessage, accueil auto, résumé d'absence >7j), /dashboard/chat (mentor-chat.tsx) |

## 🆕 Nouveautés de la session 03-08

- **lib/llm.ts** — client GLM-5.2 CF (`@cf/zai-org/glm-5.2`), round-robin sticky sur CF_ACCOUNT_1..6, fallback MiniMax Dahl. Réplique orchestra.py. Fonction `chatLLM(messages, {maxTokens, model})`.
- **lib/mentor.ts** — `buildMentorSystemPrompt(channelId)` : socle fixe (YPP, anti-hallucination) + connaissances globales + chaîne + état (stats, checklist, alertes). `loadMentorState`, `buildAbsenceSummary`.
- **lib/active-channel.ts** — helper partagé : résout la chaîne active depuis `?channel=` (défaut 1re chaîne), session requise.
- **Direction visuelle** : « Studio de Contrôle Nuit » (dark, high contrast, oklch, chiffres tabulaires, graph Area gradient discret). Design recu de GLM-5.2-Design (fallback Nemotron).
- **1 fix build** : recharts nécessitait `react-is` (peer dep) → installé.

## 🔑 Env configuré le 03-08 (secrets jamais commités)

- **DATABASE_URL** → **base Neon dédiée `yt_mentor`** créée sur le projet Neon d'agence-pro (`ep-shy-wind-aymlh5ju...`). Connexion validée par `prisma db push` (tables en sync). ⚠️ Base dédiée volontairement (ne pas utiliser la base `neondb` d'agence-pro → collision tables User/Account).
- **RESEND_API_KEY** → copiée depuis `JDIDK/.env` (clé Resend réelle, préfixe `re_`).
- **CF_ACCOUNT_1..6_ID/TOKEN + DAHL_API_KEY** → copiées depuis `~/.claude/scripts/orchestra/.env` (6 comptes CF pour GLM-5.2 + fallback MiniMax).
- **Reste VIDE :** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (bloquant pour OAuth).

## ⏭️ Prochaine étape (test réel)

- **Clés Google (GOOGLE_CLIENT_ID/SECRET) pas encore créées** → test OAuth + sync réelle bloqué. Suivre le guide Google Cloud (voir session 03-08) pour créer le projet + credentials.
- Une fois les clés ajoutées : `npm run dev` → login Google → connecter une chaîne → sync.

## 🔧 Décisions techniques verrouillées

- **Neon** Postgres via `@prisma/adapter-neon` + `@neondatabase/serverless`
- **Modèle IA mentor : GLM-5.2** via Cloudflare Workers AI directe (round-robin 6 comptes). **Pas de clé Anthropic.**
- **Cas B multi-chaînes** : bouton "Connecter une chaîne" rejouable, chaque Channel a son refresh_token.
- **Sécurité** : zéro secret en dur, refresh tokens chiffrés AES-256-GCM, cron protégé par Bearer CRON_SECRET, routes API protégées par session.
- **Fix SSL Node 24** : `NODE_OPTIONS="--openssl-legacy-provider"`.

## 🚀 Pour reprendre

```bash
cd ~/Documents/yt-mentor
NODE_OPTIONS="--openssl-legacy-provider" npm run dev
```
Prérequis : `DATABASE_URL` Neon réelle + clés Google pour OAuth.
Sans DB connectée, le build passe mais le runtime (session, dashboard) nécessite la DB.
