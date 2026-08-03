// Test d'intégration DB : crée des données de test dans la vraie base Neon,
// vérifie la logique métier (runAlertsForChannel), puis nettoie tout.
// Exécution : npm run test:integration
// SÉCURITÉ : ne charge PAS RESEND_API_KEY (aucun email réel n'est envoyé).

import fs from 'node:fs'
import path from 'node:path'

// 1) Charge .env manuellement (tsx ne le fait pas), mais force RESEND off.
const envPath = path.join(process.cwd(), '.env')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (t && !t.startsWith('#') && t.includes('=')) {
    const idx = t.indexOf('=')
    process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^"|"$/g, '')
  }
}
process.env.RESEND_API_KEY = '' // jamais d'email réel pendant un test

async function main() {
  // 2) Imports après config env (ESM dynamique pour éviter le hoisting).
  const { prisma } = await import('../lib/prisma')
  const { runAlertsForChannel } = await import('../lib/alerts')
  const { buildMentorSystemPrompt } = await import('../lib/mentor')

  let userId: string | null = null
  let channelId: string | null = null

  async function cleanup() {
    const del = async (fn: () => Promise<unknown>, label: string) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await fn()
          return
        } catch (e) {
          console.warn(`    [cleanup ${label}] tentative ${attempt} échouée: ${(e as Error).message}`)
          await new Promise((r) => setTimeout(r, 300))
        }
      }
    }
    if (channelId) await del(() => prisma.channel.delete({ where: { id: channelId! } }), 'channel')
    if (userId) await del(() => prisma.user.delete({ where: { id: userId! } }), 'user')
    userId = null
    channelId = null
  }

  const DAY = 24 * 60 * 60 * 1000

  async function makeChannel(language: 'en' | 'ar') {
    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}@yt-mentor.local`, name: 'Test' },
    })
    userId = user.id
    const channel = await prisma.channel.create({
      data: {
        userId: user.id,
        name: 'Test Channel',
        language,
        youtubeChannelId: `yt-test-${Date.now()}`,
      },
    })
    channelId = channel.id
    return channel
  }

  // 3) Scénario A — YPP Palier 1 proche (400 abonnés / 2400h) → alerte ypp_close.
  {
    const ch = await makeChannel('en')
    const base = Date.now() - 2 * DAY
    await prisma.trackerEntry.createMany({
      data: [
        { channelId: ch.id, date: new Date(base), subscribers: 300, watchHours: 2000, views: 10000, videoCount: 2, topCountries: [{ country: 'US', views: 100 }] },
        { channelId: ch.id, date: new Date(base + DAY), subscribers: 350, watchHours: 2200, views: 12000, videoCount: 3, topCountries: [{ country: 'US', views: 120 }] },
        { channelId: ch.id, date: new Date(base + 2 * DAY), subscribers: 400, watchHours: 2400, views: 14000, videoCount: 3, topCountries: [{ country: 'US', views: 140 }] },
      ],
    })
    const r = await runAlertsForChannel(ch.id)
    const types = r.details.join(' ')
    const hasClose = types.includes('Proche du palier 1 YPP')
    console.log(`[A] ypp_close détectée : ${hasClose ? '✅' : '❌'}`)
    console.log(`    alertes: ${r.triggered} | ${types.slice(0, 120)}`)
    if (!hasClose) throw new Error('Scénario A échoué : alerte ypp_close attendue')
    await cleanup()
  }

  // 4) Scénario B — YPP Palier 1 atteint (600 abonnés / 3200h) → alerte ypp_reached.
  {
    const ch = await makeChannel('en')
    const base = Date.now() - 2 * DAY
    await prisma.trackerEntry.createMany({
      data: [
        { channelId: ch.id, date: new Date(base), subscribers: 500, watchHours: 2800, views: 10000, videoCount: 3, topCountries: [{ country: 'US', views: 100 }] },
        { channelId: ch.id, date: new Date(base + DAY), subscribers: 550, watchHours: 3000, views: 12000, videoCount: 3, topCountries: [{ country: 'US', views: 120 }] },
        { channelId: ch.id, date: new Date(base + 2 * DAY), subscribers: 600, watchHours: 3200, views: 14000, videoCount: 4, topCountries: [{ country: 'US', views: 140 }] },
      ],
    })
    const r = await runAlertsForChannel(ch.id)
    const types = r.details.join(' ')
    const hasReached = types.includes('Félicitations')
    console.log(`[B] ypp_reached détectée : ${hasReached ? '✅' : '❌'}`)
    console.log(`    alertes: ${r.triggered} | ${types.slice(0, 120)}`)
    if (!hasReached) throw new Error('Scénario B échoué : alerte ypp_reached attendue')
    await cleanup()
  }

  // 5) Scénario C — prompt système mentor construit sans erreur sur la DB réelle.
  {
    const ch = await makeChannel('ar')
    const prompt = await buildMentorSystemPrompt(ch.id)
    const ok = prompt.includes('YT Mentor') && prompt.includes('ÉTAT ACTUEL') && prompt.includes(ch.name)
    console.log(`[C] buildMentorSystemPrompt : ${ok ? '✅' : '❌'} (${prompt.length} chars)`)
    if (!ok) throw new Error('Scénario C échoué : prompt mentor mal construit')
    await cleanup()
  }

  // 6) Nettoyage final — la base doit être vide de données de test.
  const leftover = await prisma.channel.count({ where: { name: 'Test Channel' } })
  console.log(`[✓] Nettoyage : ${leftover === 0 ? '✅ base propre' : '❌ ' + leftover + ' chaîne(s) restante(s)'}`)
  if (leftover > 0) throw new Error('Nettoyage incomplet')

  console.log('\n✅ Tests d’intégration DB PASSENT')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('\n❌ TEST INTÉGRATION ÉCHOUÉ:', e.message)
  process.exit(1)
})
