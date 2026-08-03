// lib/mentor.ts — Assemblage dynamique du prompt système du mentor + état de la chaîne.
// À chaque appel : socle fixe (différent selon plateforme — JAMAIS mélangé) + connaissances
// (globales + spécifiques à la chaîne active) + état actuel (stats, checklist, alertes).
// Budget ~3000 tokens : si dépassé, on garde les 15 entrées les plus récentes par catégorie.

import { prisma } from './prisma'
import { YPP_TIERS, TIKTOK_TIERS } from './alerts'

export const MENTOR_TOKEN_BUDGET = 3000
const APPROX_TOKENS_PER_CHAR = 4

// ─── Socles fixes (un par plateforme — on ne mélange jamais les logiques) ──

const SOCLE_YOUTUBE = `Tu es YT Mentor, un mentor IA professionnel pour le développement de chaînes YouTube
dans la niche "IA appliquée à l'automatisation et au business", ciblant les pays Tier 1 anglophones
(et le Golfe + diaspora pour la chaîne arabe).

Règles NON NÉGOCIABLES :
1. JAMAIS halluciner de chiffres. Si une stat n'est pas fournie dans le contexte, dis clairement
   que tu n'as pas l'information plutôt que d'inventer.
2. Donne TOUJOURS une action concrète prioritaire (prochaine étape faisable aujourd'hui).
3. Réponds en français par défaut. Si la chaîne est AR et que l'utilisateur écrit en arabe,
   réponds en arabe (avec la translittération utile).
4. Ton : mentor exigeant mais bienveillant. Direct, sans bla-bla.
5. Utilise les règles de la base de connaissances et l'état réel de la chaîne ci-dessous.
6. TU PARLES UNIQUEMENT DE LA PLATEFORME YOUTUBE. N'applique JAMAIS les logiques TikTok ici.

Seuils officiels YPP (YouTube Partner Program) :
- Palier 1 : ${YPP_TIERS.tier1.subscribers} abonnés + ${YPP_TIERS.tier1.watchHours}h de visionnage (12 mois)
  OU 3M vues Shorts (90 jours), et 3 vidéos publiques.
- Palier 2 : ${YPP_TIERS.tier2.subscribers} abonnés + ${YPP_TIERS.tier2.watchHours}h (12 mois)
  OU 10M vues Shorts (90 jours).
- Trajectoire attendue : ~1500-2000h de visionnage au mois 6.

Cibles pays :
- Chaîne EN : Tier 1 = US/UK/CA/AU/NZ (RPM 3-5x supérieur). Tier 2 = DE/FR/NL/SE/NO/CH.
- Chaîne AR : Golfe (SA/AE/QA/OM/KW) + diaspora arabe US/UK.`

// Socle TikTok (Module 8) — règles fixes propres à TikTok. Utilisé UNIQUEMENT pour les chaînes
// platform=tiktok. Ne jamais le fusionner avec le socle YouTube dans un même appel.
const SOCLE_TIKTOK = `Tu es YT Mentor, un mentor IA professionnel pour le développement de comptes TikTok
dans la niche "IA appliquée à l'automatisation et au business".

Règles NON NÉGOCIABLES :
1. JAMAIS halluciner de chiffres. Si une stat n'est pas fournie dans le contexte, dis clairement
   que tu n'as pas l'information plutôt que d'inventer.
2. Donne TOUJOURS une action concrète prioritaire (prochaine étape faisable aujourd'hui).
3. Réponds en français par défaut. Si la chaîne est AR et que l'utilisateur écrit en arabe,
   réponds en arabe (avec la translittération utile).
4. Ton : mentor exigeant mais bienveillant. Direct, sans bla-bla.
5. Utilise les règles de la base de connaissances et l'état réel de la chaîne ci-dessous.
6. TU PARLES UNIQUEMENT DE TIKTOK. N'applique JAMAIS les logiques YPP/YouTube ici.

Règles spécifiques TikTok (2026) :
- Présence humaine réelle obligatoire (voix authentique ou visage) : le contenu 100% généré par
  IA est pénalisé par l'algorithme.
- Format favorisé : 60-180 secondes, sous-titres systématiques, hook dans la 1ère seconde.
- Cadence : 3-5 vidéos de qualité par semaine (pas de sur-publication quotidienne faible).
- Rester strictement dans la niche (dévier = ~45% de portée en moins).
- 3-5 hashtags pertinents max, jamais #fyp/#foryou.

Seuils d'atteinte TikTok :
- TikTok Shop Affiliate : ${TIKTOK_TIERS.shopAffiliate.minSubscribers}-${TIKTOK_TIERS.shopAffiliate.maxSubscribers} abonnés
  (objectif à COURT TERME, atteignable avant le Creator Rewards Program).
- Creator Rewards Program : ${TIKTOK_TIERS.creatorRewards.subscribers.toLocaleString('en')} abonnés +
  ${TIKTOK_TIERS.creatorRewards.views30d.toLocaleString('en')} vues / 30 jours (objectif à MOYEN TERME).
- Repurposing cross-plateforme : chaque contenu TikTok peut être adapté en version YouTube Shorts.`

// ─── État de la chaîne ───────────────────────────────────────────

export interface MentorChecklistItem {
  stepNumber: number
  title: string
  status: 'todo' | 'in_progress' | 'done'
  subtasks: string[]
}

export interface MentorAlert {
  type: string
  message: string
  createdAt: Date
  resolved: boolean
}

export interface MentorKnowledge {
  category: string
  title: string
  content: string
}

export interface MentorState {
  channelName: string
  platform: 'youtube' | 'tiktok'
  tiktokHandle: string | null
  language: 'en' | 'ar'
  stats: {
    subscribers: number
    watchHours: number
    views: number
    videoCount: number
    topCountries: { country: string; views: number }[]
    creatorRewards: number | null
    shopCommissions: number | null
    date: Date
  } | null
  checklist: MentorChecklistItem[]
  alerts: MentorAlert[]
  knowledge: MentorKnowledge[]
}

export async function loadMentorState(channelId: string): Promise<MentorState> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      user: true,
      checklistSteps: { orderBy: { stepNumber: 'asc' } },
      alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
      trackerEntries: { orderBy: { date: 'desc' }, take: 1 },
    },
  })
  if (!channel) throw new Error('Chaîne introuvable')

  const last = channel.trackerEntries[0] ?? null

  // Connaissances : globales (channelId null) + spécifiques à CETTE chaîne.
  const knowledgeRows = await prisma.knowledgeEntry.findMany({
    where: {
      userId: channel.userId,
      status: 'active',
      OR: [{ channelId: null }, { channelId }],
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    channelName: channel.name,
    platform: channel.platform,
    tiktokHandle: channel.tiktokHandle,
    language: channel.language,
    stats: last
      ? {
          subscribers: last.subscribers,
          watchHours: last.watchHours,
          views: last.views,
          videoCount: last.videoCount,
          topCountries: (last.topCountries as { country: string; views: number }[]) || [],
          creatorRewards: last.creatorRewards,
          shopCommissions: last.shopCommissions,
          date: last.date,
        }
      : null,
    checklist: channel.checklistSteps.map((s) => ({
      stepNumber: s.stepNumber,
      title: s.title,
      status: s.status,
      subtasks: (s.subtasks as string[]) || [],
    })),
    alerts: channel.alerts.map((a) => ({
      type: a.type,
      message: a.message,
      createdAt: a.createdAt,
      resolved: a.resolved,
    })),
    knowledge: knowledgeRows.map((k) => ({
      category: k.category,
      title: k.title,
      content: k.content,
    })),
  }
}

// Rend l'état sous forme de bloc texte injecté dans le prompt (adapté à la plateforme).
function renderChannelState(s: MentorState): string {
  const lines: string[] = []
  const platformLabel = s.platform === 'tiktok' ? 'TikTok' : 'YouTube'
  lines.push(
    `Chaîne : ${s.channelName} (${platformLabel} — langue : ${s.language === 'ar' ? 'arabe' : 'anglais'})` +
      (s.platform === 'tiktok' && s.tiktokHandle ? ` · @${s.tiktokHandle}` : ''),
  )

  if (s.stats) {
    if (s.platform === 'tiktok') {
      // TikTok : saisie hebdomadaire manuelle (pas d'API analytics).
      lines.push(
        `Dernière entrée (${s.stats.date.toISOString().slice(0, 10)}) : ` +
          `${s.stats.subscribers} abonnés · ${s.stats.views} vues (30 derniers jours) · ` +
          (s.stats.creatorRewards != null ? `${s.stats.creatorRewards.toLocaleString('fr')} € Creator Rewards estimés` : 'Creator Rewards : non renseigné') +
          ' · ' +
          (s.stats.shopCommissions != null ? `${s.stats.shopCommissions.toLocaleString('fr')} € commissions TikTok Shop` : 'TikTok Shop : non renseigné') +
          '.',
      )
    } else {
      lines.push(
        `Dernière sync (${s.stats.date.toISOString().slice(0, 10)}) : ` +
          `${s.stats.subscribers} abonnés · ${s.stats.watchHours}h visionnage (12 mois) · ` +
          `${s.stats.views} vues · ${s.stats.videoCount} vidéos.`,
      )
      if (s.stats.topCountries.length > 0) {
        const top = s.stats.topCountries
          .slice(0, 5)
          .map((c) => `${c.country} (${c.views.toLocaleString('en')} vues)`)
          .join(', ')
        lines.push(`Top pays : ${top}.`)
      }
    }
  } else {
    lines.push(
      s.platform === 'tiktok'
        ? 'Aucune entrée hebdomadaire enregistrée pour ce compte TikTok pour le moment.'
        : 'Aucune sync enregistrée pour cette chaîne pour le moment.',
    )
  }

  const done = s.checklist.filter((c) => c.status === 'done').length
  const inProgress = s.checklist.filter((c) => c.status === 'in_progress').length
  lines.push(
    `Checklist stratégie : ${done}/7 étapes faites, ${inProgress} en cours.` +
      (done < 7 ? ` Prochaine étape non terminée : ${s.checklist.find((c) => c.status !== 'done')?.title ?? '—'}.` : ''),
  )

  const activeAlerts = s.alerts.filter((a) => !a.resolved)
  if (activeAlerts.length > 0) {
    lines.push('Alertes actives :')
    for (const a of activeAlerts.slice(0, 5)) lines.push(`- ${a.message}`)
  }

  return lines.join('\n')
}

// Rend les connaissances avec budget tokens : si trop volumineux, ne garde que
// les 15 entrées les plus récentes par catégorie.
function renderKnowledge(s: MentorState): string {
  const estimatedTokens = (t: string) => Math.ceil(t.length / APPROX_TOKENS_PER_CHAR)

  const format = (k: MentorKnowledge) =>
    `[${k.category}] ${k.title} — ${k.content}`
  let entries = s.knowledge

  if (estimatedTokens(entries.map(format).join('\n')) > MENTOR_TOKEN_BUDGET) {
    // Rétention : 15 plus récentes par catégorie.
    const byCat = new Map<string, MentorKnowledge[]>()
    for (const k of entries) {
      const list = byCat.get(k.category) ?? []
      list.push(k)
      byCat.set(k.category, list)
    }
    entries = [...byCat.values()].flatMap((list) => list.slice(0, 15))
  }

  if (entries.length === 0) return 'Aucune règle de connaissance enregistrée.'
  return entries.map(format).join('\n')
}

// Assemble le prompt système complet pour une chaîne.
// Le socle est choisi selon la plateforme (YouTube OU TikTok — jamais les deux dans un même appel).
export async function buildMentorSystemPrompt(channelId: string): Promise<string> {
  const state = await loadMentorState(channelId)
  const socle = state.platform === 'tiktok' ? SOCLE_TIKTOK : SOCLE_YOUTUBE
  return [
    socle,
    '',
    '=== ÉTAT ACTUEL DE LA CHAÎNE ===',
    renderChannelState(state),
    '',
    '=== RÈGLES DE CONNAISSANCE (utilise-les pour tes conseils) ===',
    renderKnowledge(state),
  ].join('\n')
}

// Résumé d'absence : ce qui s'est passé pendant qu'Ilyes n'a pas visité le dashboard.
export async function buildAbsenceSummary(channelId: string, daysAway: number): Promise<string> {
  const state = await loadMentorState(channelId)
  return [
    `L'utilisateur était absent ${daysAway} jours. Voici ce qui s'est passé depuis :`,
    renderChannelState(state),
    activeAlertsFor(state),
  ].join('\n')
}

function activeAlertsFor(s: MentorState): string {
  const active = s.alerts.filter((a) => !a.resolved)
  if (active.length === 0) return 'Aucune alerte active.'
  return 'Alertes en attente :\n' + active.slice(0, 5).map((a) => `- ${a.message}`).join('\n')
}
