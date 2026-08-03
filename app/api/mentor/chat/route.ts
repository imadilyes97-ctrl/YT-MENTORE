import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildMentorSystemPrompt, buildAbsenceSummary } from '@/lib/mentor'
import { chatLLM } from '@/lib/llm'
import { parseString } from '@/lib/validate'

// Route /api/mentor/chat — conversation avec le mentor, contextualisée à la chaîne active.
// - Historique stocké en base (ChatMessage), renvoyé à chaque appel.
// - Accueil automatique : résumé + 1 action prioritaire (si pas encore de message).
// - Résumé d'absence si lastVisitAt > 7 jours.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    channelId?: string
    message?: string
  }
  const channelId = parseString(body.channelId, '', 64)
  const message = parseString(body.message, '', 2000) // borné : pas de prompt démesuré
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

    // Historique récent (les 20 derniers messages).
    const history = await prisma.chatMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    history.reverse()

    const llmMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: system },
    ]
    for (const m of history) {
      llmMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })
    }

    // Accueil automatique : si aucun message, générer le message d'ouverture du mentor.
    if (!message && history.length === 0) {
      const lastVisit = channel.user.lastVisitAt
      const daysAway = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        : 0
      const absence =
        daysAway > 7
          ? await buildAbsenceSummary(channelId, daysAway)
          : ''

      llmMessages.push({
        role: 'user',
        content:
          'Accueille-moi pour notre première conversation. Donne un état de la chaîne en 2-3 phrases et 1 action concrète prioritaire.' +
          (absence ? `\n\n${absence}` : ''),
      })
    } else if (message) {
      await prisma.chatMessage.create({
        data: { channelId, role: 'user', content: message },
      })
      llmMessages.push({ role: 'user', content: message })
    }

    const { text, model } = await chatLLM(llmMessages, { maxTokens: 900 })

    if (text) {
      await prisma.chatMessage.create({
        data: { channelId, role: 'assistant', content: text },
      })
    }

    return NextResponse.json({
      reply: text,
      model,
      messageCount: (await prisma.chatMessage.count({ where: { channelId } })),
    })
  } catch (e) {
    return NextResponse.json(
      { reply: null, error: e instanceof Error ? e.message : 'Erreur' },
      { status: 200 },
    )
  }
}

// GET : renvoie l'historique des messages d'une chaîne.
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
    select: { id: true },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
  }

  const messages = await prisma.chatMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ messages })
}
