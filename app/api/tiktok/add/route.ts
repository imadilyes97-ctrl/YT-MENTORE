import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseString } from '@/lib/validate'
import { instantiateChecklist, ensurePlatformKnowledge } from '@/lib/seeds'

// Route /api/tiktok/add — crée une chaîne TikTok (Module 8).
// Saisie MANUELLE : TikTok n'a pas d'API analytics → pas d'OAuth, pas de sync auto.
// Corps : { name, tiktokHandle, language, niche? }
// - Vérifie la session + le handle (format @handle, pas de doublon pour cet utilisateur).
// - Crée un Channel platform=tiktok avec autoSyncEnabled=false.
// - Instancie la checklist TikTok (7 étapes) + les règles connaissances TikTok.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    tiktokHandle?: string
    language?: 'en' | 'ar'
    niche?: string
  }

  const name = parseString(body.name, '', 80)
  const tiktokHandle = parseString(body.tiktokHandle, '', 30).replace(/^@/, '').trim()
  const niche = parseString(body.niche, '', 120)
  const language: 'en' | 'ar' = body.language === 'ar' ? 'ar' : 'en'

  if (!name) {
    return NextResponse.json({ error: 'name requis' }, { status: 400 })
  }
  if (!tiktokHandle) {
    return NextResponse.json({ error: 'tiktokHandle requis (ex: @moncompte)' }, { status: 400 })
  }
  // Garde-fou : handle TikTok = alphanum + underscores + points, 2-24 chars.
  if (!/^[a-zA-Z0-9_.]{2,24}$/.test(tiktokHandle)) {
    return NextResponse.json({ error: 'Handle TikTok invalide (2-24 caractères, lettres/chiffres/_/.)' }, { status: 400 })
  }

  // Pas de doublon de handle pour CET utilisateur (les handles sont uniques sur TikTok).
  const existing = await prisma.channel.findFirst({
    where: { userId: session.user.id, tiktokHandle },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ce handle TikTok est déjà suivi par un de tes comptes.' }, { status: 409 })
  }

  const created = await prisma.channel.create({
    data: {
      userId: session.user.id,
      platform: 'tiktok',
      name,
      tiktokHandle,
      language,
      niche: niche || null,
      autoSyncEnabled: false, // TikTok : saisie manuelle (pas d'API analytics)
    },
  })

  // Checklist TikTok (7 étapes réordonnées selon les vrais seuils) + règles connaissances.
  await instantiateChecklist(created.id, 'tiktok')
  await ensurePlatformKnowledge(session.user.id, created.id, 'tiktok')

  return NextResponse.json({ success: true, channel: created })
}
