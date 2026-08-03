import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Route /api/knowledge/resolve-conflict — décision après détection de conflit.
// Corps : { action: 'keep_both' | 'replace', targetId?, entry: {title, category, content, channelId} }
//  - keep_both : crée la nouvelle entrée, laisse l'ancienne.
//  - replace   : archive l'ancienne, crée la nouvelle.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'keep_both' | 'replace'
    targetId?: string
    entry?: { title?: string; category?: string; content?: string; channelId?: string | null }
  }

  const entry = body.entry
  if (!body.action || !entry?.title || !entry.content) {
    return NextResponse.json({ error: 'action et entry requis' }, { status: 400 })
  }

  // Si un channelId est fourni, il doit appartenir à l'utilisateur.
  if (entry.channelId) {
    const ch = await prisma.channel.findFirst({
      where: { id: entry.channelId, userId: session.user.id },
      select: { id: true },
    })
    if (!ch) {
      return NextResponse.json({ error: 'Chaîne introuvable' }, { status: 403 })
    }
  }

  if (body.action === 'replace' && body.targetId) {
    // Vérifie que la cible appartient à l'utilisateur puis l'archive.
    const target = await prisma.knowledgeEntry.findFirst({
      where: { id: body.targetId, userId: session.user.id },
      select: { id: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'Entrée cible introuvable' }, { status: 403 })
    }
    await prisma.knowledgeEntry.update({
      where: { id: body.targetId },
      data: { status: 'archived' },
    })
  }

  const created = await prisma.knowledgeEntry.create({
    data: {
      userId: session.user.id,
      channelId: entry.channelId ?? null,
      title: entry.title,
      category: entry.category || 'autre',
      content: entry.content,
      source: 'llm',
    },
  })

  return NextResponse.json({ success: true, entry: created })
}
