// Pure-Node tests for preference coercion. Run with: node --test
//
// A minimal in-memory localStorage shim is installed first so the storage
// wrapper behaves like a browser (and can be made to "fail" to simulate
// storage-unavailable / quota scenarios).

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

function installStorage({ failSet = false } = {}) {
  const map = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => {
        if (failSet) throw new Error('quota')
        map.set(k, String(v))
      },
      removeItem: (k) => { map.delete(k) },
      clear: () => { map.clear() }
    }
  })
  return map
}
function breakStorage() {
  // Access itself throws (e.g. SecurityError in some embedders).
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('blocked') }
  })
}

let prefs
beforeEach(async () => {
  installStorage()
  prefs = await import(`../src/lib/preferences.js?t=${Date.now()}-${Math.random()}`)
})

test('sanitize: undefined / null / primitives fall back to all defaults', () => {
  for (const raw of [undefined, null, 42, 'oops', true, []]) {
    const { value } = prefs.sanitizePrefs(raw)
    assert.deepEqual(value, { ...prefs.DEFAULT_PREFS })
  }
})

test('sanitize: empty object yields defaults (all keys unknown/missing)', () => {
  const { value } = prefs.sanitizePrefs({})
  assert.deepEqual(value, { ...prefs.DEFAULT_PREFS })
})

test('sanitize: valid values pass through unchanged', () => {
  const input = { fontSize: 20, lineWidth: 600, theme: 'dark', autosave: true }
  const { value, issues } = prefs.sanitizePrefs(input)
  assert.deepEqual(value, input)
  assert.equal(issues.length, 0)
})

test('sanitize: extreme numeric values are clamped to endpoints', () => {
  const { value: hi } = prefs.sanitizePrefs({ fontSize: 9999, lineWidth: 100000 })
  assert.equal(hi.fontSize, 32)
  assert.equal(hi.lineWidth, 1100)

  const { value: lo } = prefs.sanitizePrefs({ fontSize: -50, lineWidth: 0 })
  assert.equal(lo.fontSize, 12)
  assert.equal(lo.lineWidth, 480)
})

test('sanitize: garbage numbers / types fall back to the safe default', () => {
  const { value, issues } = prefs.sanitizePrefs({
    fontSize: NaN,
    lineWidth: Infinity,
    theme: 'matrix',
    autosave: 'yes'
  })
  assert.equal(value.fontSize, 16)
  assert.equal(value.lineWidth, 720)
  assert.equal(value.theme, 'light')
  assert.equal(value.autosave, false)
  assert.ok(issues.includes('prefs:bad-fontSize'))
  assert.ok(issues.includes('prefs:bad-lineWidth'))
  assert.ok(issues.includes('prefs:bad-theme'))
  assert.ok(issues.includes('prefs:bad-autosave'))
})

test('sanitize: one bad field does not invalidate the others', () => {
  const { value } = prefs.sanitizePrefs({ fontSize: 'abc', lineWidth: 640, theme: 'sepia' })
  assert.equal(value.fontSize, 16) // default
  assert.equal(value.lineWidth, 640) // kept
  assert.equal(value.theme, 'sepia') // kept
  assert.equal(value.autosave, false) // missing -> default
})

test('sanitize: unknown keys are ignored (forward compatibility)', () => {
  const { value } = prefs.sanitizePrefs({ fontSize: 18, futureFlag: { x: 1 } })
  assert.equal(value.fontSize, 18)
  assert.equal(Object.keys(value).sort().join(','), 'autosave,fontSize,lineWidth,theme')
})

test('sanitize: fractional px values are rounded', () => {
  const { value } = prefs.sanitizePrefs({ fontSize: 17.4, lineWidth: 723.6 })
  assert.equal(value.fontSize, 17)
  assert.equal(value.lineWidth, 724)
})

test('sanitize: numeric strings are accepted, booleans/arrays as numbers are not', () => {
  const { value: a } = prefs.sanitizePrefs({ fontSize: '22' })
  assert.equal(a.fontSize, 22)
  const { value: b } = prefs.sanitizePrefs({ fontSize: true })
  assert.equal(b.fontSize, 16)
  const { value: c } = prefs.sanitizePrefs({ fontSize: [20] })
  assert.equal(c.fontSize, 16)
})

test('load: missing key returns defaults', () => {
  const { prefs: p, available } = prefs.loadPrefs()
  assert.equal(available, true)
  assert.deepEqual(p, { ...prefs.DEFAULT_PREFS })
})

test('load: corrupt JSON is discarded and defaults used', () => {
  globalThis.localStorage.setItem(prefs.PREFS_KEY, '{not json')
  const { prefs: p, issues } = prefs.loadPrefs()
  assert.deepEqual(p, { ...prefs.DEFAULT_PREFS })
  assert.ok(issues.includes('prefs:corrupt-json'))
  assert.equal(globalThis.localStorage.getItem(prefs.PREFS_KEY), null)
})

test('load: unknown version is discarded', () => {
  globalThis.localStorage.setItem(prefs.PREFS_KEY, JSON.stringify({ version: 999, fontSize: 5 }))
  const { prefs: p, issues } = prefs.loadPrefs()
  assert.deepEqual(p, { ...prefs.DEFAULT_PREFS })
  assert.ok(issues.includes('prefs:bad-version'))
})

test('load: valid stored prefs survive a save/load round trip', () => {
  prefs.savePrefs({ fontSize: 24, lineWidth: 560, theme: 'sepia', autosave: true })
  const { prefs: p } = prefs.loadPrefs()
  assert.deepEqual(p, { fontSize: 24, lineWidth: 560, theme: 'sepia', autosave: true })
})

test('save: out-of-range values are sanitized before persistence', () => {
  prefs.savePrefs({ fontSize: 1000, lineWidth: -5, theme: 'neon', autosave: 1 })
  const { prefs: p } = prefs.loadPrefs()
  assert.deepEqual(p, { fontSize: 32, lineWidth: 480, theme: 'light', autosave: false })
})

test('load: blocked localStorage access yields safe defaults + unavailable flag', async () => {
  breakStorage()
  const mod = await import(`../src/lib/preferences.js?t=${Date.now()}-x`)
  const { prefs: p, available, issues } = mod.loadPrefs()
  assert.equal(available, false)
  assert.deepEqual(p, { ...mod.DEFAULT_PREFS })
  assert.ok(issues.includes('storage:unavailable'))
})

test('save: write failure (quota) is reported, never throws', async () => {
  installStorage({ failSet: true })
  const mod = await import(`../src/lib/preferences.js?t=${Date.now()}-q`)
  const result = mod.savePrefs({ fontSize: 18, lineWidth: 720, theme: 'light', autosave: false })
  assert.equal(result.ok, false)
  assert.ok(result.issues.includes('storage:write-failed'))
})
