import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildMentorSystemPrompt } from '@/lib/mentor'
import { chatLLM } from '@/lib/llm'

// Route /api/mentor/brief — "Brief du jour" pour une chaîne.
// - Résume l'état + donne 1 action prioritaire (prompt mentor).
// - Si l'utilisateur a été absent > 7 jours, le brief commence par un résumé d'absence.
// - Le modèle LLM peut ne pas être configuré → repli propre côté client.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const channelId = req.nextUrl.searchParams.get('channelId')
  if (!channelId) {
    return NextResponse.json({ error: 'channelId requis' }, { status: 400 })
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
    select: { id: true, name: true, user: { select: { lastVisitAt: true } } },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
  }

  try {
    const system = await buildMentorSystemPrompt(channelId)

    // Résumé d'absence si lastVisitAt > 7 jours.
    const lastVisit = channel.user.lastVisitAt
    const daysAway = lastVisit
      ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    const absenceNote =
      daysAway > 7
        ? `\n\nL'utilisateur était absent ${daysAway} jours — commence ton brief par un résumé de ce qui s'est passé pendant son absence, puis donne l'action prioritaire du jour.`
        : ''

    const { text, model } = await chatLLM(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            'Génère le "brief du jour" : état de la chaîne en 2-3 phrases + 1 action concrète prioritaire à faire aujourd\'hui. Format court, sans titre.',
        },
      ],
      { maxTokens: 500 },
    )

    if (!text) {
      return NextResponse.json({ content: null, model, error: 'Modèle indisponible' })
    }

    return NextResponse.json({ content: text, model, absenceDays: daysAway > 7 ? daysAway : undefined })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur'
    return NextResponse.json({ content: null, model: 'aucun', error: msg }, { status: 200 })
  }
}
