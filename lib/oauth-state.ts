// lib/oauth-state.ts — State OAuth YouTube signé (HMAC-SHA256) pour empêcher le CSRF/IDOR.
// Fix review GLM-5.2 : le state n'était qu'un base64url non signé → un attaquant pouvait
// forger un userId victime et attacher une chaîne à un autre compte.

import crypto from 'crypto'

interface OAuthStatePayload {
  userId: string
  type?: string
  iat: number // timestamp (anti-rejeu / expiration)
}

const TTL_MS = 10 * 60 * 1000 // 10 minutes, le temps du consentement Google

function key(): string {
  // NEXTAUTH_SECRET est toujours présent en prod ; fallback dev explicite.
  return process.env.NEXTAUTH_SECRET || 'dev-oauth-state-key'
}

// Signe le payload → "body.signature" (les deux en base64url).
export function signOAuthState(userId: string, type: string): string {
  const payload: OAuthStatePayload = { userId, type, iat: Date.now() }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto
    .createHmac('sha256', key())
    .update(body)
    .digest('base64url')
  return `${body}.${sig}`
}

// Vérifie la signature + expiration, retourne le payload ou null.
export function verifyOAuthState(stateRaw: string): OAuthStatePayload | null {
  const [body, sig] = stateRaw.split('.')
  if (!body || !sig) return null

  const expected = crypto
    .createHmac('sha256', key())
    .update(body)
    .digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  // timingSafeEqual exige des buffers de même longueur.
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload
    if (!payload.userId) return null
    if (payload.iat && Date.now() - payload.iat > TTL_MS) return null
    return payload
  } catch {
    return null
  }
}
