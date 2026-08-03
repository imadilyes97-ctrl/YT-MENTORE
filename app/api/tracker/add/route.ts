import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseCount, clampCount, parseString } from '@/lib/validate'

// Route /api/tracker/add — enregistre une entrée de suivi manuelle pour une chaîne.
// Corps : { channelId, subscribers, watchHours, views, creatorRewards?, shopCommissions?, date? }
// source = 'manual'. Les champs TikTok (creatorRewards, shopCommissions) sont ignorés si la
// chaîne n'est pas TikTok.
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
    creatorRewards?: number
    shopCommissions?: number
    date?: string
  }

  const channelId = parseString(body.channelId, '', 64)
  if (!channelId) {
    return NextResponse.json({ error: 'channelId requis' }, { status: 400 })
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
    select: { id: true, platform: true },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
  }

  // Bornes : 1M abonnés / 100k heures / 1Md vues — larges pour un usage réel.
  const subscribers = clampCount(parseCount(body.subscribers), 0, 1_000_000)
  const watchHours = clampCount(parseCount(body.watchHours), 0, 100_000)
  const views = clampCount(parseCount(body.views), 0, 1_000_000_000)

  // Champs TikTok : montants estimés (€), bornés, uniquement si la chaîne est TikTok.
  const isTikTok = channel.platform === 'tiktok'
  const creatorRewards = isTikTok
    ? clampFloat(Number(body.creatorRewards), 1_000_000)
    : null
  const shopCommissions = isTikTok
    ? clampFloat(Number(body.shopCommissions), 1_000_000)
    : null

  const date = parseString(body.date, '', 40)
  const entry = await prisma.trackerEntry.create({
    data: {
      channelId,
      subscribers,
      watchHours,
      views,
      creatorRewards,
      shopCommissions,
      source: 'manual',
      ...(date && !Number.isNaN(Date.parse(date)) ? { date: new Date(date) } : {}),
    },
  })

  return NextResponse.json({ success: true, entry })
}

// Montant borné (€ estimés) — NaN/négatif → null ; sinon clamp [0, max].
function clampFloat(value: number, max: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null
  return Math.min(max, Math.round(value * 100) / 100)
}
