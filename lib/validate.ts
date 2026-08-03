// lib/validate.ts — Validation minimale des entrées (review Nemotron : validation d'entrée).
// Garde-fous : nombres bornés, texte borné, channelId formaté.

export function parseCount(value: unknown, fallback = 0): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function clampCount(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function parseString(value: unknown, fallback = '', maxLen: number): string {
  if (typeof value !== 'string') return fallback
  const s = value.trim()
  return s.length > maxLen ? s.slice(0, maxLen) : s
}
