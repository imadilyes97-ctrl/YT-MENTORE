import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatLLM } from '@/lib/llm'
import { parseString } from '@/lib/validate'

// Route /api/knowledge/add — ajoute une connaissance : texte brut → résumé 3-5 points + catégorie.
// Corps : { text, channelId? } — channelId null = règle globale.
// - Détection de conflit (titre similaire existant) : retourne les candidats pour décision.
// - En l'absence de LLM, stocke le texte brut avec catégorie "autre".

const CATEGORIES = ['positionnement', 'format', 'monétisation', 'pays-ciblage', 'contenu', 'autre']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    text?: string
    channelId?: string | null
    title?: string
    category?: string
    force?: boolean // true = remplacer le conflit détecté
  }

  const text = parseString(body.text, '', 40_000) // borné : pas de DoS via texte infini
  if (!text) {
    return NextResponse.json({ error: 'text requis' }, { status: 400 })
  }
  const channelId = body.channelId ? parseString(body.channelId, '', 64) : null

  // Si un channelId est fourni, il doit appartenir à l'utilisateur.
  if (channelId) {
    const ch = await prisma.channel.findFirst({
      where: { id: channelId, userId: session.user.id },
      select: { id: true },
    })
    if (!ch) {
      return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
    }
  }

  // Résumé + catégorie via le modèle (si configuré).
  let summary = text
  let category = 'autre'
  let llmModel: string | undefined

  const { text: llmText, model } = await chatLLM(
    [
      {
        role: 'system',
        content:
          'Tu résumes un extrait en 3-5 points actionnables et tu classes en une catégorie. ' +
          `Réponds EXACTEMENT au format :\nCATEGORIE: ${CATEGORIES.join('|')}\nRÉSUMÉ:\n- point 1\n- point 2...`,
      },
      { role: 'user', content: text.slice(0, 4000) },
    ],
    { maxTokens: 600 },
  )

  if (llmText) {
    llmModel = model
    const catMatch = llmText.match(/CATEGORIE:\s*(\w+)/i)
    if (catMatch && CATEGORIES.includes(catMatch[1].toLowerCase())) {
      category = catMatch[1].toLowerCase()
    }
    const sumMatch = llmText.match(/RÉSUMÉ:\s*([\s\S]*)$/)
    if (sumMatch) summary = sumMatch[1].trim()
  }

  const title = parseString(body.title, '', 120) || text.split('\n')[0].slice(0, 80)

  // Détection de conflit : entrée active avec un titre ou contenu proche.
  if (!body.force) {
    const conflicts = await prisma.knowledgeEntry.findMany({
      where: {
        userId: session.user.id,
        status: 'active',
        OR: [
          { title: { contains: title, mode: 'insensitive' } },
          { content: { contains: text.slice(0, 60), mode: 'insensitive' } },
        ],
      },
      take: 3,
    })
    if (conflicts.length > 0) {
      return NextResponse.json({
        conflict: true,
        conflicts: conflicts.map((c) => ({ id: c.id, title: c.title, category: c.category })),
        proposed: { title, category, summary, channelId, llmModel },
      })
    }
  }

  const entry = await prisma.knowledgeEntry.create({
    data: {
      userId: session.user.id,
      channelId,
      title,
      category,
      content: summary,
      source: llmModel ? `llm:${llmModel}` : 'manual',
    },
  })

  return NextResponse.json({ success: true, entry, llmModel })
}
