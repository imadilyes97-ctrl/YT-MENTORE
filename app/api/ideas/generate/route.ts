import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildMentorSystemPrompt } from '@/lib/mentor'
import { chatLLM } from '@/lib/llm'
import { parseString } from '@/lib/validate'

// Route /api/ideas/generate — 5 titres SEO à partir d'un pilier, pour la chaîne active.
// Corps : { channelId, pillar, shorts? } — contexte mentor (connaissances + état), langue et
// plateforme de la chaîne. Option shorts=true → chaque idée inclut son adaptation YouTube Shorts
// (repurposing cross-plateforme, Module 8).

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    channelId?: string
    pillar?: string
    shorts?: boolean
  }
  const channelId = parseString(body.channelId, '', 64)
  const pillar = parseString(body.pillar, '', 120)
  const shorts = body.shorts === true
  if (!channelId || !pillar) {
    return NextResponse.json({ error: 'channelId et pillar requis' }, { status: 400 })
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
    select: { id: true, name: true, language: true, platform: true },
  })
  if (!channel) {
    return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
  }

  const isTikTok = channel.platform === 'tiktok'
  const platformLabel = isTikTok ? 'TikTok' : 'YouTube'
  const targetLang = channel.language === 'ar' ? 'arabe (Golfe/diaspora)' : 'anglais (Tier 1)'

  try {
    const system = await buildMentorSystemPrompt(channelId)
    // Repurposing : pour TikTok, chaque idée est adaptable en YouTube Shorts (et inversement).
    const shortsLine = isTikTok
      ? `Chaque idée doit aussi préciser son adaptation en version YouTube Shorts (repurposing cross-plateforme).`
      : shorts
        ? `Chaque idée doit aussi préciser son adaptation en version YouTube Shorts.`
        : ''

    const { text, model } = await chatLLM(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            `Pilier de contenu choisi : "${pillar}".\n` +
            `Propose 5 idées de contenu optimisées pour une chaîne ${platformLabel} (cible ${targetLang}).\n` +
            `Pour chaque idée : donne le titre/accroche, puis entre parenthèses le hook (1ère seconde) et le CTA final.\n` +
            (shortsLine ? `${shortsLine}\n` : '') +
            `Format, ligne par ligne :\n1. TITRE — hook: ... | CTA: ...\n` +
            `Les idées doivent viser des recherches/attentes réelles (intent), pas du clickbait vide.`,
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
