import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncChannel } from '@/lib/youtube'
import { runAlertsForChannel } from '@/lib/alerts'

// Route /api/youtube/sync — synchronise les stats d'une chaîne (session requise).
// Paramètre : ?channelId=...
// Utilisée : bouton "Synchroniser" dans le dashboard + appel manuel.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { channelId?: string }
  const channelId = body.channelId

  if (!channelId) {
    return NextResponse.json({ error: 'channelId requis' }, { status: 400 })
  }

  // Vérifie que la chaîne appartient bien à l'utilisateur.
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable ou non autorisée' }, { status: 403 })
  }

  try {
    const stats = await syncChannel(channel.youtubeChannelId)
    // Déclenche les alertes (Tier1%, 7j, YPP, trajectoire) + emails Resend.
    const alerts = await runAlertsForChannel(channel.id)
    return NextResponse.json({ success: true, stats, alertsTriggered: alerts })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur de sync'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET : sync d'une chaîne via query param (pratique pour tester au navigateur).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const channelId = req.nextUrl.searchParams.get('channelId')
  if (!channelId) {
    return NextResponse.json({ error: 'channelId requis (?channelId=...)' }, { status: 400 })
  }
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
  }
  try {
    const stats = await syncChannel(channel.youtubeChannelId)
    const alerts = await runAlertsForChannel(channel.id)
    return NextResponse.json({ success: true, stats, alertsTriggered: alerts })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur de sync' },
      { status: 500 },
    )
  }
}
