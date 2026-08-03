import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGoogleAuthUrl } from '@/lib/youtube'
import crypto from 'crypto'

// Route /api/youtube/connect — démarre le flux OAuth YouTube (Cas B : rejouable).
// 1. Vérifie la session (route protégée par le middleware).
// 2. Génère un state (CSRF) qui lie la connexion à l'utilisateur + type de compte.
// 3. Redirige vers l'écran de consentement Google.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // GoogleAccountType : 'same' (même compte que la session) ou 'separate' (compte séparé).
  const accountType = req.nextUrl.searchParams.get('type') || 'same'

  // State signé pour éviter le CSRF et relier le callback à ce user + type.
  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, type: accountType }),
  ).toString('base64url')

  const authUrl = getGoogleAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
