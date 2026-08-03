import { test } from 'node:test'
import assert from 'node:assert'
import { parseCount, clampCount, parseString } from '../lib/validate'

test('parseCount parses valid numbers', () => {
  assert.strictEqual(parseCount(10), 10)
  assert.strictEqual(parseCount('42'), 42)
  assert.strictEqual(parseCount(0), 0)
})

test('parseCount rejects invalid / negative / non-finite', () => {
  assert.strictEqual(parseCount(-5), 0)
  assert.strictEqual(parseCount('abc'), 0)
  assert.strictEqual(parseCount(undefined), 0)
  assert.strictEqual(parseCount(Infinity), 0)
  assert.strictEqual(parseCount(NaN), 0)
})

test('clampCount bounds the value', () => {
  assert.strictEqual(clampCount(5, 0, 10), 5)
  assert.strictEqual(clampCount(-1, 0, 10), 0)
  assert.strictEqual(clampCount(11, 0, 10), 10)
})

test('parseString trims and truncates', () => {
  assert.strictEqual(parseString('  hello  ', 'x', 100), 'hello')
  assert.strictEqual(parseString(undefined, 'x', 100), 'x')
  assert.strictEqual(parseString(null, 'x', 100), 'x') // non-string → fallback
  assert.strictEqual(parseString('a'.repeat(200), 'x', 100), 'a'.repeat(100))
  // Une string vide reste une string vide (les callers vérifient `if (!x)`).
  assert.strictEqual(parseString('', 'x', 100), '')
})
