import { test } from 'node:test'
import assert from 'node:assert'
import { YPP_TIERS, tier1Share } from '../lib/alerts'

test('YPP_TIERS official thresholds', () => {
  assert.deepStrictEqual(YPP_TIERS.tier1, {
    subscribers: 500,
    watchHours: 3000,
    shortsViews: 3_000_000,
    videos: 3,
  })
  assert.deepStrictEqual(YPP_TIERS.tier2, {
    subscribers: 1000,
    watchHours: 4000,
    shortsViews: 10_000_000,
  })
})

test('tier1Share computes the correct percentage', () => {
  const countries = [
    { country: 'US', views: 700 },
    { country: 'DE', views: 300 },
  ]
  // 700 / 1000 = 70%
  assert.strictEqual(tier1Share(countries, ['US']), 70)
})

test('tier1Share is 0 on empty input', () => {
  assert.strictEqual(tier1Share([], ['US']), 0)
  assert.strictEqual(tier1Share([{ country: 'DE', views: 100 }], ['US']), 0)
})

test('tier1Share handles a fully Tier-1 audience', () => {
  const countries = [
    { country: 'US', views: 500 },
    { country: 'GB', views: 500 },
  ]
  assert.strictEqual(tier1Share(countries, ['US', 'GB', 'CA', 'AU', 'NZ']), 100)
})
