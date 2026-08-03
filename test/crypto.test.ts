import { test } from 'node:test'
import assert from 'node:assert'
import { encryptToken, decryptToken } from '../lib/crypto'

// Clé de test : 32 octets, base64 (même format que TOKEN_ENCRYPTION_KEY).
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

test('round-trip encrypt then decrypt restores the token', () => {
  const plain = 'ya29.refresh-token-example-123'
  const enc = encryptToken(plain)
  assert.notStrictEqual(enc, plain, 'ciphertext should differ from plaintext')
  assert.strictEqual(decryptToken(enc), plain)
})

test('same value encrypted twice yields different ciphertexts (random IV)', () => {
  const a = encryptToken('same')
  const b = encryptToken('same')
  assert.notStrictEqual(a, b)
})

test('tampered ciphertext throws', () => {
  const enc = encryptToken('secret')
  const parts = enc.split(':')
  assert.throws(() => decryptToken(`${parts[0]}:${parts[1]}:AAAA`))
})

test('malformed payload throws', () => {
  assert.throws(() => decryptToken('garbage'))
  assert.throws(() => decryptToken('a:b')) // 2 segments au lieu de 3
})
