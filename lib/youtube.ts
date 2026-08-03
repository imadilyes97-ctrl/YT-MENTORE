import { prisma } from './prisma'
import { encryptToken, decryptToken } from './crypto'

// ─── Config OAuth Google ─────────────────────────────────────────

const GOOGLE_AUTH_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_SCOPES = process.env.YOUTUBE_SCOPES
  || 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'

// URL de callback OAuth. En dev : http://localhost:3000/api/youtube/callback
export function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/youtube/callback`
}

// Génère l'URL de redirection OAuth vers Google (Cas B : bouton "Connecter une chaîne" rejouable).
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent', // force un refresh_token à chaque connexion
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// ─── Échange du code → tokens ────────────────────────────────────

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
  })

  const res = await fetch(GOOGLE_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = (await res.json()) as TokenResponse
  if (!res.ok) {
    throw new Error(`Échange de code OAuth échoué: ${data.error_description || data.error || res.status}`)
  }
  return data
}

// Rafraîchit un access_token Google (expire après 60 min) via le refresh_token.
// Retourne aussi un éventuel nouveau refresh_token (rotation rare chez Google, fix review GLM-5.2).
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
  refreshToken?: string
}> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch(GOOGLE_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = (await res.json()) as TokenResponse
  if (!res.ok || !data.access_token) {
    throw new Error(`Refresh du token échoué: ${data.error_description || data.error || res.status}`)
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
  }
}

// ─── Récupération d'un access token valide (avec refresh si nécessaire) ──

export interface ChannelAccess {
  accessToken: string
}

// Retourne un access_token valide pour une chaîne, en le rafraîchissant si expiré.
// Les access tokens sont stockés chiffrés (cohérence crypto, fix review GLM-5.2).
export async function getValidAccessToken(channelId: string): Promise<ChannelAccess> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!channel) throw new Error('Chaîne introuvable')

  const refreshToken = channel.refreshToken ? decryptToken(channel.refreshToken) : null
  if (!refreshToken) throw new Error('Aucun refresh token pour cette chaîne — reconnecter')

  // Si l'access token chiffré est encore valide (> 2 min de marge), on le déchiffre et réutilise.
  if (channel.accessToken && channel.tokenExpiresAt && channel.tokenExpiresAt.getTime() > Date.now() + 120_000) {
    try {
      return { accessToken: decryptToken(channel.accessToken) }
    } catch {
      // Token illisible → on retombe sur un refresh propre.
    }
  }

  // Sinon refresh (gère aussi la rotation du refresh token).
  const { accessToken, expiresIn, refreshToken: newRefresh } = await refreshAccessToken(refreshToken)
  await prisma.channel.update({
    where: { id: channelId },
    data: {
      accessToken: encryptToken(accessToken),
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      ...(newRefresh ? { refreshToken: encryptToken(newRefresh) } : {}),
    },
  })
  return { accessToken }
}

// ─── Appels API YouTube ──────────────────────────────────────────

const YT_DATA_BASE = 'https://www.googleapis.com/youtube/v3'
const YT_ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2'

export interface ChannelStats {
  youtubeChannelId: string
  name: string
  subscribers: number
  totalViews: number
  videoCount: number
  // Analytics 12 mois
  watchHours: number
  views12m: number
  topCountries: { country: string; views: number }[]
}

// Requête générique avec token + gestion d'erreur.
async function googleGet(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API Google ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

// YouTube Data API v3 — channels.list (infos de base).
async function fetchChannelInfo(accessToken: string, youtubeChannelId: string) {
  const data = await googleGet(
    `${YT_DATA_BASE}/channels?part=snippet,statistics&mine=true&fields=items(id,snippet(title),statistics(subscriberCount,viewCount,videoCount))`,
    accessToken,
  )
  const item = (data.items || []).find((c: { id: string }) => c.id === youtubeChannelId)
  return item ? {
    name: item.snippet?.title || youtubeChannelId,
    subscribers: Number(item.statistics?.subscriberCount || 0),
    totalViews: Number(item.statistics?.viewCount || 0),
    videoCount: Number(item.statistics?.videoCount || 0),
  } : null
}

// YouTube Analytics API — reports.query (12 mois, top pays).
async function fetchAnalytics(accessToken: string, youtubeChannelId: string) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 1)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const ids = `channel==${youtubeChannelId}`
  const url = `${YT_ANALYTICS_BASE}/reports?ids=${encodeURIComponent(ids)}`
    + `&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}`
    + `&metrics=views,estimatedMinutesWatched`
    + `&dimensions=country`
    + `&sort=-views`
    + `&maxResults=10`

  const data = await googleGet(url, accessToken)
  const rows: (string | number)[][] = data.rows || []
  const headers: string[] = data.columnHeaders?.map((h: { name: string }) => h.name) || []
  const iViews = headers.indexOf('views')
  const iWatch = headers.indexOf('estimatedMinutesWatched')

  let watchMinutes = 0
  const topCountries: { country: string; views: number }[] = []
  for (const row of rows) {
    watchMinutes += Number(row[iWatch] || 0)
    topCountries.push({ country: String(row[0]), views: Number(row[iViews] || 0) })
  }

  return {
    watchHours: Math.round(watchMinutes / 60),
    views12m: rows.reduce((acc, r) => acc + Number(r[iViews] || 0), 0),
    topCountries,
  }
}

// Sync complète d'une chaîne : infos + analytics, enregistre un TrackerEntry.
export async function syncChannel(youtubeChannelId: string): Promise<ChannelStats> {
  const channel = await prisma.channel.findUnique({ where: { youtubeChannelId } })
  if (!channel) throw new Error(`Chaîne inconnue: ${youtubeChannelId}`)

  const { accessToken } = await getValidAccessToken(channel.id)

  const info = await fetchChannelInfo(accessToken, youtubeChannelId)
  if (!info) throw new Error('Channels.list n\'a pas retourné cette chaîne — vérifier les scopes')

  const analytics = await fetchAnalytics(accessToken, youtubeChannelId)

  // Transaction : l'entrée d'historique et la mise à jour du nom sont atomiques
  // (fix review GLM-5.2 — pas de commit partiel).
  await prisma.$transaction([
    prisma.trackerEntry.create({
      data: {
        channelId: channel.id,
        subscribers: info.subscribers,
        watchHours: analytics.watchHours,
        views: info.totalViews,
        videoCount: info.videoCount,
        topCountries: analytics.topCountries,
        source: 'auto',
      },
    }),
    ...(info.name !== channel.name
      ? [prisma.channel.update({ where: { id: channel.id }, data: { name: info.name } })]
      : []),
  ])

  // info contient name/subscribers/totalViews/videoCount ; analytics watchHours/views12m/topCountries.
  return { youtubeChannelId, ...info, ...analytics }
}

// Liste toutes les chaînes accessibles via le compte OAuth (pour la sélection au connect).
export async function listAccessibleChannels(accessToken: string) {
  const data = await googleGet(
    `${YT_DATA_BASE}/channels?part=snippet&mine=true&fields=items(id,snippet(title),snippet(thumbnails(default(url))))`,
    accessToken,
  )
  return (data.items || []).map((c: any) => ({
    id: c.id,
    title: c.snippet?.title || c.id,
    thumbnail: c.snippet?.thumbnails?.default?.url || null,
  }))
}
