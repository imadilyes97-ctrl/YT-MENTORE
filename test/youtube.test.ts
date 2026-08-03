import { test } from 'node:test'
import assert from 'node:assert'
import { getRedirectUri, getGoogleAuthUrl } from '../lib/youtube'

// Environnement de test pour les helpers d'URL.
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GOOGLE_CLIENT_ID = 'test-client-id'

test('getRedirectUri points to the callback route', () => {
  assert.strictEqual(getRedirectUri(), 'http://localhost:3000/api/youtube/callback')
})

test('getGoogleAuthUrl builds a valid OAuth authorize URL', () => {
  const url = getGoogleAuthUrl('state-123')
  assert.ok(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'))
  assert.ok(url.includes('client_id=test-client-id'))
  assert.ok(url.includes('response_type=code'))
  assert.ok(url.includes('access_type=offline'))
  assert.ok(url.includes('prompt=consent'))
  assert.ok(url.includes('state=state-123'))
  assert.ok(url.includes('scope='))
  assert.ok(url.includes('redirect_uri='))
  // Le scope doit contenir les deux API YouTube.
  assert.ok(url.includes('youtube.readonly'))
  assert.ok(url.includes('yt-analytics.readonly'))
})
