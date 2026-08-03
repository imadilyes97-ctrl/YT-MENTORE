import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseCount, clampCount, parseString } from '@/lib/validate'

// Route /api/tracker/add — enregistre une entrée de suivi manuelle pour une chaîne.
// Corps : { channelId, subscribers, watchHours, views, date? } — source = 'manual'.
// Garde-fous : nombres bornés (pas d'overflow), channelId validé.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    channelId?: string
    subscribers?: number
    watchHours?: number
    views?: number
    date?: string
  }

  const channelId = parseString(body.channelId, '', 64)
  if (!channelId) {
    return NextResponse.json({ error: 'channelId requis' }, { status: 400 })
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
    select: { id: true },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
  }

  // Bornes : 1M abonnés / 100k heures / 1Md vues — larges pour un usage réel.
  const subscribers = clampCount(parseCount(body.subscribers), 0, 1_000_000)
  const watchHours = clampCount(parseCount(body.watchHours), 0, 100_000)
  const views = clampCount(parseCount(body.views), 0, 1_000_000_000)

  const date = parseString(body.date, '', 40)
  const entry = await prisma.trackerEntry.create({
    data: {
      channelId,
      subscribers,
      watchHours,
      views,
      source: 'manual',
      ...(date && !Number.isNaN(Date.parse(date)) ? { date: new Date(date) } : {}),
    },
  })

  return NextResponse.json({ success: true, entry })
}
