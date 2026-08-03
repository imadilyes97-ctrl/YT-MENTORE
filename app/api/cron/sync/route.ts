import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncChannel, type ChannelStats } from '@/lib/youtube'
import { runAlertsForChannel } from '@/lib/alerts'

// Route /api/cron/sync — appelée par Vercel Cron (vercel.json : "0 8 * * *").
// - Authentifiée par le header `Authorization: Bearer ${CRON_SECRET}` (jamais par session).
// - Itère sur TOUTES les chaînes :
//     YouTube → sync + alertes (données réelles via API).
//     TikTok  → PAS de sync (saisie manuelle) mais alertes de rappel (7j) + seuils.
// - Retourne un résumé JSON (statut, chaînes OK/échouées, alertes déclenchées).

interface ChannelSummary {
  channelId: string
  platform: 'youtube' | 'tiktok'
  ok: boolean
  stats?: ChannelStats
  alerts?: { triggered: number; details: string[] }
  error?: string
}

export async function GET(req: NextRequest) {
  // Sécurité : seul Vercel Cron (ou un client avec le secret) peut appeler cette route.
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const channels = await prisma.channel.findMany({
    select: { id: true, youtubeChannelId: true, platform: true },
  })

  const results: ChannelSummary[] = []
  let okCount = 0
  let alertCount = 0

  for (const ch of channels) {
    try {
      // TikTok : pas d'API → pas de sync, uniquement les alertes (rappel hebdo + seuils).
      if (ch.platform === 'tiktok') {
        const alerts = await runAlertsForChannel(ch.id)
        results.push({ channelId: ch.id, platform: 'tiktok', ok: true, alerts })
        okCount++
        alertCount += alerts.triggered
        continue
      }

      // YouTube : sync réelle + alertes.
      if (!ch.youtubeChannelId) {
        results.push({
          channelId: ch.id,
          platform: 'youtube',
          ok: false,
          error: 'youtubeChannelId manquant',
        })
        continue
      }
      const stats = await syncChannel(ch.youtubeChannelId)
      const alerts = await runAlertsForChannel(ch.id)
      results.push({ channelId: ch.id, platform: 'youtube', ok: true, stats, alerts })
      okCount++
      alertCount += alerts.triggered
    } catch (e: unknown) {
      // Une chaîne qui échoue ne bloque pas les autres : on continue le tour.
      results.push({
        channelId: ch.id,
        platform: ch.platform,
        ok: false,
        error: e instanceof Error ? e.message : 'Erreur de sync',
      })
    }
  }

  return NextResponse.json({
    success: true,
    total: channels.length,
    ok: okCount,
    failed: channels.length - okCount,
    alertsTriggered: alertCount,
    results,
  })
}
