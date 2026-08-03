import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, listAccessibleChannels } from '@/lib/youtube'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/crypto'
import { instantiateChecklist } from '@/lib/seeds'

// Route /api/youtube/callback — rappelé par Google après consentement.
// 1. Vérifie le state (CSRF + userId + type).
// 2. Échange le code → tokens.
// 3. Récupère les chaînes accessibles, crée/update une Channel par chaîne.
// 4. Instancie la checklist 7 étapes. Redirige vers le dashboard.

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

  // Décode le state (base64url JSON).
  let state: { userId?: string; type?: string }
  try {
    state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
  } catch {
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
            accessToken: tokens.access_token,
            tokenExpiresAt: expiresAt,
            // Le refresh token est écrasé uniquement si Google en a renvoyé un.
            ...(refreshTokenEnc ? { refreshToken: refreshTokenEnc } : {}),
            googleAccountType: state.type || 'same',
          },
        })
      } else {
        // Nouvelle chaîne : crée la Channel + sa checklist.
        await prisma.channel.create({
          data: {
            userId: state.userId!,
            name: ch.title,
            youtubeChannelId: ch.id,
            accessToken: tokens.access_token,
            tokenExpiresAt: expiresAt,
            refreshToken: refreshTokenEnc,
            googleAccountType: state.type || 'same',
            language: 'en', // défini par défaut, ajustable dans le dashboard
          },
        })
        const created = await prisma.channel.findUnique({
          where: { youtubeChannelId: ch.id },
        })
        if (created) {
          await instantiateChecklist(created.id)
          createdCount++
        }
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
