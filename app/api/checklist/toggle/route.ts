import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Route /api/checklist/toggle — bascule le statut d'une étape de la checklist.
// Corps : { stepId } — cycles todo → in_progress → done → todo.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { stepId?: string }
  const { stepId } = body
  if (!stepId) {
    return NextResponse.json({ error: 'stepId requis' }, { status: 400 })
  }

  // Vérifie que l'étape appartient bien à une chaîne de l'utilisateur.
  const step = await prisma.checklistStep.findFirst({
    where: {
      id: stepId,
      channel: { userId: session.user.id },
    },
    include: { channel: { select: { id: true } } },
  })
  if (!step) {
    return NextResponse.json({ error: 'Étape introuvable' }, { status: 403 })
  }

  const next: 'todo' | 'in_progress' | 'done' =
    step.status === 'todo' ? 'in_progress' : step.status === 'in_progress' ? 'done' : 'todo'

  const updated = await prisma.checklistStep.update({
    where: { id: stepId },
    data: { status: next },
  })

  return NextResponse.json({ success: true, step: updated })
}
