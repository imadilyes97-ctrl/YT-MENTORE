import crypto from 'crypto'

// Chiffrement AES-256-GCM des refresh tokens YouTube.
// Clé : TOKEN_ENCRYPTION_KEY (base64, 32 octets) — générer avec `openssl rand -base64 32`.

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || ''
  if (!raw) {
    throw new Error('TOKEN_ENCRYPTION_KEY est manquante — voir .env.example')
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY doit être une clé base64 de 32 octets')
  }
  return buf
}

// Chiffre une valeur : format "iv:authTag:ciphertext" en base64.
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

// Déchiffre une valeur chiffrée par encryptToken.
export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Token chiffré invalide')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
