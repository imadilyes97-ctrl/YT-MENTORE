import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, listAccessibleChannels } from '@/lib/youtube'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/crypto'
import { instantiateChecklist, ensureLanguageKnowledge } from '@/lib/seeds'
import { verifyOAuthState } from '@/lib/oauth-state'

// Route /api/youtube/callback — rappelé par Google après consentement.
// 1. Vérifie le state signé (HMAC, anti-CSRF/IDOR) + userId présent.
// 2. Échange le code → tokens.
// 3. Récupère les chaînes accessibles, crée/update une Channel par chaîne.
// 4. Instancie la checklist 7 étapes + seeds langue. Redirige vers le dashboard.

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(`OAuth refusé: ${error}`)}`, req.nextUrl.origin),
    )
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(
      new URL('/dashboard?error=callback_incomplet', req.nextUrl.origin),
    )
  }

  // Vérifie la signature HMAC + expiration du state (anti-CSRF/IDOR).
  const state = verifyOAuthState(stateRaw)
  if (!state?.userId) {
    return NextResponse.redirect(
      new URL('/dashboard?error=state_invalide', req.nextUrl.origin),
    )
  }

  try {
    // Échange le code d'autorisation contre des tokens.
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.access_token) {
      throw new Error('Aucun access_token dans la réponse OAuth')
    }

    // Récupère toutes les chaînes accessibles (mine=true).
    const channels = await listAccessibleChannels(tokens.access_token)
    if (channels.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard?error=aucune_chaines_trouvees', req.nextUrl.origin),
      )
    }

    const refreshTokenEnc = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null
    // L'access token (60 min) est chiffré comme le refresh token (cohérence crypto, fix review GLM-5.2).
    const accessTokenEnc = tokens.access_token ? encryptToken(tokens.access_token) : null
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null

    // Crée/update une Channel pour chaque chaîne accessible du compte connecté.
    let createdCount = 0
    for (const ch of channels) {
      const existing = await prisma.channel.findUnique({
        where: { youtubeChannelId: ch.id },
      })

      if (existing) {
        // Chaîne déjà connue : met à jour les tokens (nouvelle connexion).
        await prisma.channel.update({
          where: { id: existing.id },
          data: {
            platform: 'youtube',
            autoSyncEnabled: true,
            accessToken: accessTokenEnc,
            tokenExpiresAt: expiresAt,
            // Le refresh token est écrasé uniquement si Google en a renvoyé un.
            ...(refreshTokenEnc ? { refreshToken: refreshTokenEnc } : {}),
            googleAccountType: state.type || 'same',
          },
        })
      } else {
        // Nouvelle chaîne : crée la Channel + sa checklist (create retourne déjà l'entité).
        const created = await prisma.channel.create({
          data: {
            userId: state.userId,
            platform: 'youtube',
            name: ch.title,
            youtubeChannelId: ch.id,
            autoSyncEnabled: true,
            accessToken: accessTokenEnc,
            tokenExpiresAt: expiresAt,
            refreshToken: refreshTokenEnc,
            googleAccountType: state.type || 'same',
            language: 'en', // défini par défaut, ajustable dans le dashboard
          },
        })
        await instantiateChecklist(created.id, 'youtube')
        // Seeds de la langue de la chaîne (EN par défaut), liées à CETTE chaîne.
        await ensureLanguageKnowledge(state.userId, created.id, created.language)
        createdCount++
      }
    }

    const summary = encodeURIComponent(`${channels.length} chaîne(s) importée(s), ${createdCount} nouvelle(s)`)
    return NextResponse.redirect(
      new URL(`/dashboard?success=${summary}`, req.nextUrl.origin),
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(msg)}`, req.nextUrl.origin),
    )
  }
}
