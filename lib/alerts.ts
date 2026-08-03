import { prisma } from './prisma'
import { Resend } from 'resend'

// ─── Config ───────────────────────────────────────────────────────

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const ALERT_FROM = process.env.ALERT_FROM_EMAIL || 'alerts@example.com'

// Pays Tier 1 pour la chaîne EN (US/UK/CA/AU/NZ) — Golfe + diaspora pour la AR.
const TIER1_EN = ['US', 'GB', 'CA', 'AU', 'NZ']
const TIER1_AR = ['SA', 'AE', 'QA', 'OM', 'KW', 'US', 'GB']

// Seuils YPP officiels.
export const YPP_TIERS = {
  tier1: { subscribers: 500, watchHours: 3000, shortsViews: 3_000_000, videos: 3 },
  tier2: { subscribers: 1000, watchHours: 4000, shortsViews: 10_000_000 },
}

// Seuils d'atteinte TikTok (Module 8) — réordonnés selon les vrais seuils :
// Shop Affiliate (court terme) avant Creator Rewards (moyen terme).
export const TIKTOK_TIERS = {
  shopAffiliate: { minSubscribers: 1000, maxSubscribers: 5000 },
  creatorRewards: { subscribers: 10_000, views30d: 100_000 },
}

// Trajectoire attendue des heures de visionnage (mois 6 : 1500-2000h).
const TRAJECTORY_MONTH6 = { min: 1500, max: 2000 }

// ─── Helpers ──────────────────────────────────────────────────────

// Cooldown par type d'alerte (heures) — anti-spam : chaque sync ne re-crée pas
// la même alerte (fix review GLM-5.2).
const COOLDOWN_HOURS: Record<string, number> = {
  tier1_drop: 7 * 24,
  no_video_7d: 7 * 24,
  ypp_reached_tier1: 90 * 24, // une fois le palier atteint, pas de rappel pendant 90 jours
  ypp_reached_tier2: 90 * 24,
  ypp_close_tier1: 7 * 24,
  ypp_close_tier2: 7 * 24,
  trajectory_low: 7 * 24,
  // TikTok (Module 8)
  tiktok_no_entry_7d: 7 * 24,
  tiktok_shop_reached: 90 * 24,
  tiktok_shop_close: 7 * 24,
  tiktok_creator_rewards_reached: 90 * 24,
  tiktok_creator_rewards_close: 7 * 24,
}

// Crée l'alerte uniquement si aucune alerte du même type n'existe depuis le cooldown.
// Retourne true si l'alerte a été créée.
async function createAlertDedup(channelId: string, type: string, message: string): Promise<boolean> {
  const since = new Date(Date.now() - (COOLDOWN_HOURS[type] ?? 24) * 3_600_000)
  const recent = await prisma.alert.count({
    where: { channelId, type, createdAt: { gt: since } },
  })
  if (recent > 0) return false
  await prisma.alert.create({ data: { channelId, type, message } })
  return true
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) return false
  try {
    await resend.emails.send({ from: ALERT_FROM, to, subject, html })
    return true
  } catch (e) {
    console.error('[alerts] Email Resend échoué:', e instanceof Error ? e.message : e)
    return false
  }
}

export function tier1Share(countries: { country: string; views: number }[], set: string[]): number {
  const total = countries.reduce((acc, c) => acc + c.views, 0)
  if (total === 0) return 0
  const tier1 = countries
    .filter((c) => set.includes(c.country))
    .reduce((acc, c) => acc + c.views, 0)
  return Math.round((tier1 / total) * 1000) / 10 // pourcentage, 1 décimale
}

// ─── Alertes TikTok (Module 8) ────────────────────────────────────
// TikTok n'a pas d'API analytics : saisie hebdomadaire manuelle. Les alertes sont donc :
// 1) Rappel automatique si aucune entrée depuis 7 jours.
// 2) Seuil TikTok Shop Affiliate (1000-5000 abonnés, objectif court terme).
// 3) Seuil Creator Rewards Program (10K abonnés + 100K vues/30j, objectif moyen terme).

async function runTikTokAlerts(channel: any): Promise<{ triggered: number; details: string[] }> {
  const entries = channel.trackerEntries
  const details: string[] = []
  let triggered = 0

  const userEmail = channel.user.email
  const emailBase = userEmail ? { to: userEmail } : null
  const lastEntry = entries[entries.length - 1]

  // 1) Rappel hebdomadaire : aucune entrée depuis 7 jours.
  if (!lastEntry || Date.now() - lastEntry.date.getTime() > 7 * 24 * 60 * 60 * 1000) {
    const days = lastEntry
      ? Math.round((Date.now() - lastEntry.date.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    const msg = days === 0
      ? `📝 TikTok : aucune entrée hebdomadaire enregistrée pour le moment. Pense à saisir tes stats (abonnés, vues 30j, revenus).`
      : `📝 TikTok : aucune entrée depuis ${days} jours. Saisis tes stats hebdomadaires (abonnés, vues 30j, revenus).`
    if (await createAlertDedup(channel.id, 'tiktok_no_entry_7d', msg)) {
      details.push(msg)
      triggered++
      if (emailBase) {
        await sendEmail(emailBase.to, `[YT Mentor] ${channel.name} — rappel saisie hebdomadaire`, `<p>${msg}</p>`)
      }
    }
  }

  if (!lastEntry) return { triggered, details }

  const subPct = Math.round((lastEntry.subscribers / TIKTOK_TIERS.creatorRewards.subscribers) * 100)
  const viewsPct = Math.round((lastEntry.views / TIKTOK_TIERS.creatorRewards.views30d) * 100)

  // 2) TikTok Shop Affiliate — objectif court terme (1000-5000 abonnés).
  if (lastEntry.subscribers >= TIKTOK_TIERS.shopAffiliate.minSubscribers) {
    const msg = `🛍️ TikTok Shop Affiliate atteint ! ${lastEntry.subscribers} abonnés (seuil ${TIKTOK_TIERS.shopAffiliate.minSubscribers}). Active le programme et commence les commissions.`
    if (await createAlertDedup(channel.id, 'tiktok_shop_reached', msg)) {
      details.push(msg)
      triggered++
      if (emailBase) await sendEmail(emailBase.to, `[YT Mentor] 🛍️ ${channel.name} — TikTok Shop Affiliate atteint !`, `<p>${msg}</p>`)
    }
  } else if (lastEntry.subscribers >= TIKTOK_TIERS.shopAffiliate.minSubscribers * 0.8) {
    const msg = `🛍️ Proche du TikTok Shop Affiliate : ${lastEntry.subscribers}/${TIKTOK_TIERS.shopAffiliate.minSubscribers} abonnés.`
    if (await createAlertDedup(channel.id, 'tiktok_shop_close', msg)) {
      details.push(msg)
      triggered++
    }
  }

  // 3) Creator Rewards Program — objectif moyen terme (10K abonnés + 100K vues/30j).
  const crReached =
    lastEntry.subscribers >= TIKTOK_TIERS.creatorRewards.subscribers &&
    lastEntry.views >= TIKTOK_TIERS.creatorRewards.views30d
  if (crReached) {
    const msg = `🎉 Creator Rewards Program atteint ! ${lastEntry.subscribers.toLocaleString('en')} abonnés + ${lastEntry.views.toLocaleString('en')} vues/30j. Active le programme.`
    if (await createAlertDedup(channel.id, 'tiktok_creator_rewards_reached', msg)) {
      details.push(msg)
      triggered++
      if (emailBase) await sendEmail(emailBase.to, `[YT Mentor] 🎉 ${channel.name} — Creator Rewards atteint !`, `<p>${msg}</p>`)
    }
  } else if (subPct >= 80 || viewsPct >= 80) {
    const msg = `🚀 Proche du Creator Rewards : ${subPct}% abonnés, ${viewsPct}% vues/30j.`
    if (await createAlertDedup(channel.id, 'tiktok_creator_rewards_close', msg)) {
      details.push(msg)
      triggered++
    }
  }

  return { triggered, details }
}

// ─── Logique principale (appelée à chaque sync pour YouTube, chaque vérif pour TikTok) ──

export async function runAlertsForChannel(channelId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { user: true, trackerEntries: { orderBy: { date: 'asc' } } },
  })
  if (!channel) return { triggered: 0, details: [] }

  // TikTok : logique dédiée (rappel hebdomadaire + seuils Shop/Creator Rewards).
  if (channel.platform === 'tiktok') {
    return runTikTokAlerts(channel)
  }

  const entries = channel.trackerEntries
  const details: string[] = []
  let triggered = 0

  const userEmail = channel.user.email
  const emailBase = userEmail ? { to: userEmail } : null
  const langSet = channel.language === 'ar' ? TIER1_AR : TIER1_EN
  const lastEntry = entries[entries.length - 1]

  // 1) % Tier1 en baisse sur 2 syncs consécutives.
  const recent = entries.slice(-3) // besoin de 2 deltas consécutifs
  if (recent.length >= 3) {
    const shares = recent.map((e) => tier1Share((e.topCountries as any) || [], langSet))
    const [s1, s2, s3] = shares
    if (s2 < s1 && s3 < s2) {
      const msg = `⚠️ Audience ${channel.language === 'ar' ? 'Golfe/diaspora' : 'Tier 1'} en baisse sur 2 syncs : ${s1}% → ${s2}% → ${s3}%.`
      if (await createAlertDedup(channelId, 'tier1_drop', msg)) {
        details.push(msg)
        triggered++
        if (emailBase) {
          await sendEmail(emailBase.to, `[YT Mentor] ${channel.name} — audience en baisse`, `<p>${msg}</p>`)
        }
      }
    }
  }

  // 2) Aucune nouvelle vidéo publiée depuis 7 jours.
  //    Détection : le videoCount de la dernière sync == celui de la précédente
  //    ET 7+ jours écoulés entre les deux syncs.
  const prevEntry = entries[entries.length - 2]
  if (lastEntry && prevEntry && lastEntry.videoCount > 0) {
    const daysSincePrev = (lastEntry.date.getTime() - prevEntry.date.getTime()) / (1000 * 60 * 60 * 24)
    const noNewVideo = lastEntry.videoCount === prevEntry.videoCount
    if (noNewVideo && daysSincePrev >= 7) {
      const msg = `📭 Aucune nouvelle vidéo publiée depuis ${Math.round(daysSincePrev)} jours (${lastEntry.videoCount} vidéos au total). Pense à publier.`
      if (await createAlertDedup(channelId, 'no_video_7d', msg)) {
        details.push(msg)
        triggered++
        if (emailBase) await sendEmail(emailBase.to, `[YT Mentor] ${channel.name} — aucune vidéo depuis 7j`, `<p>${msg}</p>`)
      }
    }
  }

  // 3) Seuils YPP atteints ou proches.
  if (lastEntry) {
    const subPct1 = Math.round((lastEntry.subscribers / YPP_TIERS.tier1.subscribers) * 100)
    const hoursPct1 = Math.round((lastEntry.watchHours / YPP_TIERS.tier1.watchHours) * 100)
    const subPct2 = Math.round((lastEntry.subscribers / YPP_TIERS.tier2.subscribers) * 100)
    const hoursPct2 = Math.round((lastEntry.watchHours / YPP_TIERS.tier2.watchHours) * 100)

    // Palier 1 : 500 abonnés + 3000h ET 3 vidéos publiques (fix review GLM-5.2 — videoCount était ignoré).
    const ypp1Reached =
      lastEntry.subscribers >= YPP_TIERS.tier1.subscribers &&
      lastEntry.watchHours >= YPP_TIERS.tier1.watchHours &&
      lastEntry.videoCount >= YPP_TIERS.tier1.videos
    const ypp2Reached = lastEntry.subscribers >= 1000 && lastEntry.watchHours >= 4000

    if (ypp1Reached) {
      const msg = `🎉 Félicitations ! Palier 1 YPP atteint (${lastEntry.subscribers} abonnés, ${lastEntry.watchHours}h, ${lastEntry.videoCount} vidéos).`
      if (await createAlertDedup(channelId, 'ypp_reached_tier1', msg)) {
        details.push(msg)
        triggered++
        if (emailBase) await sendEmail(emailBase.to, `[YT Mentor] 🎉 Palier 1 YPP atteint !`, `<p>${msg}</p>`)
      }
    } else if (subPct1 >= 80 || hoursPct1 >= 80) {
      const msg = `📈 Proche du palier 1 YPP : ${subPct1}% abonnés, ${hoursPct1}% heures.`
      if (await createAlertDedup(channelId, 'ypp_close_tier1', msg)) {
        details.push(msg)
        triggered++
      }
    }

    if (ypp2Reached) {
      const msg = `🏆 Palier 2 YPP atteint (${lastEntry.subscribers} abonnés, ${lastEntry.watchHours}h).`
      if (await createAlertDedup(channelId, 'ypp_reached_tier2', msg)) {
        details.push(msg)
        triggered++
        if (emailBase) await sendEmail(emailBase.to, `[YT Mentor] 🏆 Palier 2 YPP atteint !`, `<p>${msg}</p>`)
      }
    } else if (subPct2 >= 80 || hoursPct2 >= 80) {
      const msg = `🚀 Proche du palier 2 YPP : ${subPct2}% abonnés, ${hoursPct2}% heures.`
      if (await createAlertDedup(channelId, 'ypp_close_tier2', msg)) {
        details.push(msg)
        triggered++
      }
    }

    // 4) Croissance des heures sous trajectoire attendue.
    const channelAgeDays = entries.length > 1
      ? Math.max(1, Math.round((entries[entries.length - 1].date.getTime() - entries[0].date.getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const channelAgeMonths = channelAgeDays / 30
    const expectedHoursAt = Math.min(TRAJECTORY_MONTH6.max, (TRAJECTORY_MONTH6.min / 6) * channelAgeMonths)
    if (channelAgeMonths >= 1 && lastEntry.watchHours < expectedHoursAt) {
      const msg = `⏳ Heures de visionnage sous trajectoire : ${lastEntry.watchHours}h (attendu ~${Math.round(expectedHoursAt)}h à ${channelAgeMonths.toFixed(1)} mois).`
      if (await createAlertDedup(channelId, 'trajectory_low', msg)) {
        details.push(msg)
        triggered++
      }
    }
  }

  return { triggered, details }
}

// Vérifie si une chaîne est inexploitée (pas de sync depuis longtemps) — pour le cron.
export async function getStaleChannels(days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return prisma.channel.findMany({
    where: {
      trackerEntries: {
        none: { date: { gt: cutoff } },
      },
    },
  })
}
