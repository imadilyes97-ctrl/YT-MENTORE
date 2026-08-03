import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildMentorSystemPrompt } from '@/lib/mentor'
import { chatLLM } from '@/lib/llm'
import { parseString } from '@/lib/validate'

// Route /api/ideas/generate — 5 titres SEO à partir d'un pilier, pour la chaîne active.
// Corps : { channelId, pillar } — contexte mentor (connaissances + état) + langue de la chaîne.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { channelId?: string; pillar?: string }
  const channelId = parseString(body.channelId, '', 64)
  const pillar = parseString(body.pillar, '', 120)
  if (!channelId || !pillar) {
    return NextResponse.json({ error: 'channelId et pillar requis' }, { status: 400 })
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
    select: { id: true, name: true, language: true },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
  }

  try {
    const system = await buildMentorSystemPrompt(channelId)
    const targetLang = channel.language === 'ar' ? 'arabe (Golfe/diaspora)' : 'anglais (Tier 1)'
    const { text, model } = await chatLLM(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            `Pilier de contenu choisi : "${pillar}".\n` +
            `Propose 5 titres de vidéo optimisés SEO pour une chaîne ${targetLang}.\n` +
            `Pour chaque titre : donne le titre exact, puis entre parenthèses le hook (1ère seconde) et le CTA final.\n` +
            `Format, ligne par ligne :\n1. TITRE — hook: ... | CTA: ...\n` +
            `Les titres doivent viser des recherches réelles (intent), pas du clickbait vide.`,
        },
      ],
      { maxTokens: 700 },
    )

    return NextResponse.json({ ideas: text, model })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur' },
      { status: 200 },
    )
  }
}
