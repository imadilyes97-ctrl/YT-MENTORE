import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncChannel, type ChannelStats } from '@/lib/youtube'
import { runAlertsForChannel } from '@/lib/alerts'

// Route /api/cron/sync — appelée par Vercel Cron (vercel.json : "0 8 * * *").
// - Authentifiée par le header `Authorization: Bearer ${CRON_SECRET}` (jamais par session).
// - Itère sur TOUTES les chaînes, sync + alertes pour chacune.
// - Retourne un résumé JSON (statut, chaînes OK/échouées, alertes déclenchées).

interface ChannelSummary {
  channelId: string
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
    select: { id: true, youtubeChannelId: true },
  })

  const results: ChannelSummary[] = []
  let okCount = 0
  let alertCount = 0

  for (const ch of channels) {
    try {
      const stats = await syncChannel(ch.youtubeChannelId)
      const alerts = await runAlertsForChannel(ch.id)
      results.push({ channelId: ch.id, ok: true, stats, alerts })
      okCount++
      alertCount += alerts.triggered
    } catch (e: unknown) {
      // Une chaîne qui échoue ne bloque pas les autres : on continue le tour.
      results.push({
        channelId: ch.id,
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
