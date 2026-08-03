import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Route /api/knowledge/archive — archive une entrée de connaissance (status → archived).
// Corps : { entryId }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { entryId?: string }
  const { entryId } = body
  if (!entryId) {
    return NextResponse.json({ error: 'entryId requis' }, { status: 400 })
  }

  const entry = await prisma.knowledgeEntry.findFirst({
    where: { id: entryId, userId: session.user.id },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 403 })
  }

  await prisma.knowledgeEntry.update({
    where: { id: entryId },
    data: { status: 'archived' },
  })

  return NextResponse.json({ success: true })
}
