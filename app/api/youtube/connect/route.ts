import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGoogleAuthUrl } from '@/lib/youtube'
import { signOAuthState } from '@/lib/oauth-state'

// Route /api/youtube/connect — démarre le flux OAuth YouTube (Cas B : rejouable).
// 1. Vérifie la session (route protégée par le middleware).
// 2. Génère un state HMAC-signé qui lie la connexion à l'utilisateur + type de compte.
// 3. Redirige vers l'écran de consentement Google.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // GoogleAccountType : 'same' (même compte que la session) ou 'separate' (compte séparé).
  const accountType = req.nextUrl.searchParams.get('type') || 'same'

  // State HMAC-signé (anti-CSRF/IDOR) — vérifié au callback par verifyOAuthState.
  const state = signOAuthState(session.user.id, accountType)

  const authUrl = getGoogleAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
