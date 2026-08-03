// lib/llm.ts — Client LLM du mentor.
// Modèle principal : GLM-5.2 via Cloudflare Workers AI (round-robin sticky sur 6 comptes),
// fallback MiniMax M2.7 via Dahl quand tous les comptes CF échouent.
// Réplique la logique de ~/.claude/scripts/orchestra/orchestra.py (mêmes variables d'env).

const CF_API_URL = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`
const CF_MODEL = '@cf/zai-org/glm-5.2'
const DAHL_URL = 'https://inference.dahl.global/v1/chat/completions'
const DAHL_MODEL = 'MiniMaxAI/MiniMax-M2.7'

// Timeouts différenciés (review Nemotron) : CF a un cold start 5-15s,
// MiniMax est plus lent mais plus fiable. Fail fast sur CF pour passer au suivant.
const CF_TIMEOUT_MS = 20_000
const DAHL_TIMEOUT_MS = 30_000

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmResult {
  text: string
  model: string // ex: "GLM-5.2 (cf-2)" | "MiniMax M2.7" | "aucun"
  error?: string
}

interface CfAccount {
  id: string
  accountId: string
  token: string
}

// Lit les 6 comptes Cloudflare depuis l'environnement (ne renvoie que les comptes complets).
function getCfAccounts(): CfAccount[] {
  const accounts: CfAccount[] = []
  for (let i = 1; i <= 6; i++) {
    const accountId = process.env[`CF_ACCOUNT_${i}_ID`]
    const token = process.env[`CF_ACCOUNT_${i}_TOKEN`]
    if (accountId && token) accounts.push({ id: `cf-${i}`, accountId, token })
  }
  return accounts
}

// Index round-robin sticky. En serverless il peut réinitialiser à un cold start,
// mais c'est acceptable : on repart sur le premier compte et on passe au suivant si échec.
let rrIndex = 0

async function callCf(account: CfAccount, messages: LlmMessage[], maxTokens: number): Promise<string> {
  const res = await fetch(CF_API_URL(account.accountId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${account.token}`,
      'User-Agent': 'yt-mentor/1.0',
    },
    body: JSON.stringify({ model: CF_MODEL, messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(CF_TIMEOUT_MS),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`CF HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  // Le wrapper "result" est présent selon la version de l'API CF — on gère les deux cas.
  const root = data?.result ?? data
  const message = root?.choices?.[0]?.message
  const content: string | undefined = message?.content ?? message?.reasoning_content
  if (!content) throw new Error('Réponse vide de GLM-5.2')
  return content.trim()
}

async function callMiniMax(messages: LlmMessage[], maxTokens: number): Promise<string> {
  const key = process.env.DAHL_API_KEY
  if (!key) throw new Error('DAHL_API_KEY manquante')
  const res = await fetch(DAHL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: DAHL_MODEL, messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(DAHL_TIMEOUT_MS),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Dahl HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const content: string | undefined =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message?.reasoning
  if (!content) throw new Error('Réponse vide de MiniMax')
  return content.trim()
}

// Point d'entrée principal : GLM-5.2 (round-robin) → fallback MiniMax → erreur claire.
export async function chatLLM(
  messages: LlmMessage[],
  opts: { maxTokens?: number; model?: 'glm' | 'minimax' } = {},
): Promise<LlmResult> {
  const maxTokens = opts.maxTokens ?? 2048

  // Forçage explicite vers MiniMax (utile pour les tâches de debug).
  if (opts.model === 'minimax') {
    try {
      return { text: await callMiniMax(messages, maxTokens), model: 'MiniMax M2.7' }
    } catch (e) {
      return { text: '', model: 'MiniMax M2.7', error: e instanceof Error ? e.message : 'Erreur' }
    }
  }

  const accounts = getCfAccounts()
  if (accounts.length > 0) {
    for (let offset = 0; offset < accounts.length; offset++) {
      const account = accounts[(rrIndex + offset) % accounts.length]
      try {
        const text = await callCf(account, messages, maxTokens)
        rrIndex = (rrIndex + offset + 1) % accounts.length
        return { text, model: `GLM-5.2 (${account.id})` }
      } catch {
        continue // compte suivant (429 / quota / erreur réseau)
      }
    }
  }

  // Fallback MiniMax.
  try {
    const text = await callMiniMax(messages, maxTokens)
    return { text, model: 'MiniMax M2.7 (fallback)' }
  } catch (e) {
    return {
      text: '',
      model: 'aucun',
      error: e instanceof Error ? e.message : 'Aucun modèle LLM disponible',
    }
  }
}
