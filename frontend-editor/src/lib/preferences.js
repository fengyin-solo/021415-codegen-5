// Appearance preferences: schema, validation ("unknown combinations fall back
// to safe values"), and persistence.
//
// This module is deliberately framework-free (pure functions over plain
// objects) so the coercion rules can be unit-tested directly in Node and
// reused by the Pinia store.
//
// Persisted shape:
//   {
//     "version": 1,
//     "fontSize": 16,      // code/editor font size in px
//     "lineWidth": 720,    // editor content max-width in px
//     "theme": "light",    // light | dark | sepia
//     "autosave": true     // persist the draft across reloads
//   }

import { isStorageAvailable, readJSON, writeJSON, removeStorage } from './storage'

export const PREFS_KEY = 'mira.prefs.v1'
export const PREFS_VERSION = 1

export const THEMES = ['light', 'dark', 'sepia']

export const FONT_SIZE = { min: 12, max: 32, def: 16, step: 1 }
export const LINE_WIDTH = { min: 480, max: 1100, def: 720, step: 10 }

export const DEFAULT_PREFS = Object.freeze({
  fontSize: FONT_SIZE.def,
  lineWidth: LINE_WIDTH.def,
  theme: 'light',
  autosave: false
})

/**
 * Validate an arbitrary untrusted object against the preferences schema.
 *
 * Every field is sanitized independently: an unknown / corrupt / out-of-range
 * value in one field never invalidates the others. Missing fields get the
 * safe default; out-of-range numbers are clamped to the nearest endpoint;
 * unknown themes/booleans fall back to the safe value; unexpected keys are
 * ignored (forward compatibility).
 *
 * @param {unknown} raw
 * @returns {{ value: object, issues: string[] }}
 */
function toFiniteNumber(value) {
  // Only real numbers and plain numeric strings are accepted; booleans
  // (true -> 1), arrays ([20] -> 20) and objects must not sneak through
  // JS coercion and then clamp to an endpoint.
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function sanitizePrefs(raw) {
  const issues = []
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  if (raw !== undefined && raw !== null && (typeof raw !== 'object' || Array.isArray(raw))) {
    issues.push('prefs:root-not-object')
  }

  let fontSize
  if (!('fontSize' in source)) {
    fontSize = DEFAULT_PREFS.fontSize
  } else {
    const n = toFiniteNumber(source.fontSize)
    if (n === null) {
      issues.push('prefs:bad-fontSize')
      fontSize = DEFAULT_PREFS.fontSize
    } else {
      fontSize = Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, Math.round(n)))
      if (fontSize !== n) issues.push('prefs:clamped-fontSize')
    }
  }

  let lineWidth
  if (!('lineWidth' in source)) {
    lineWidth = DEFAULT_PREFS.lineWidth
  } else {
    const n = toFiniteNumber(source.lineWidth)
    if (n === null) {
      issues.push('prefs:bad-lineWidth')
      lineWidth = DEFAULT_PREFS.lineWidth
    } else {
      lineWidth = Math.min(LINE_WIDTH.max, Math.max(LINE_WIDTH.min, Math.round(n)))
      if (lineWidth !== n) issues.push('prefs:clamped-lineWidth')
    }
  }

  let theme
  if (!('theme' in source)) {
    theme = DEFAULT_PREFS.theme
  } else if (typeof source.theme === 'string' && THEMES.includes(source.theme)) {
    theme = source.theme
  } else {
    issues.push('prefs:bad-theme')
    theme = DEFAULT_PREFS.theme
  }

  let autosave
  if (!('autosave' in source)) {
    autosave = DEFAULT_PREFS.autosave
  } else if (typeof source.autosave === 'boolean') {
    autosave = source.autosave
  } else {
    issues.push('prefs:bad-autosave')
    autosave = DEFAULT_PREFS.autosave
  }

  return { value: { fontSize, lineWidth, theme, autosave }, issues }
}

/**
 * Load preferences from storage.
 *
 * - Storage unavailable / missing key  -> safe defaults
 * - Unparseable JSON / wrong version   -> corrupt entry removed, defaults
 * - Unknown field combinations          -> sanitized per-field
 *
 * @returns {{ prefs: object, issues: string[], available: boolean }}
 */
export function loadPrefs() {
  const available = isStorageAvailable()
  if (!available) {
    return { prefs: { ...DEFAULT_PREFS }, issues: ['storage:unavailable'], available: false }
  }

  const { ok, data } = readJSON(PREFS_KEY)
  if (!ok) {
    removeStorage(PREFS_KEY)
    return { prefs: { ...DEFAULT_PREFS }, issues: ['prefs:corrupt-json'], available: true }
  }
  if (data === undefined) {
    return { prefs: { ...DEFAULT_PREFS }, issues: [], available: true }
  }
  if (typeof data !== 'object' || data === null || data.version !== PREFS_VERSION) {
    // Unknown / future version: drop it rather than guessing its semantics.
    removeStorage(PREFS_KEY)
    const issues = ['prefs:bad-version']
    return { prefs: { ...DEFAULT_PREFS }, issues, available: true }
  }

  const { value, issues } = sanitizePrefs(data)
  return { prefs: value, issues, available: true }
}

/**
 * Persist preferences. Callers may pass already-valid values; we still run
 * them through sanitize() so a bug elsewhere can never poison storage.
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function savePrefs(prefs) {
  const { value, issues } = sanitizePrefs(prefs)
  const ok = writeJSON(PREFS_KEY, { version: PREFS_VERSION, ...value })
  if (!ok) issues.push('storage:write-failed')
  return { ok, issues, prefs: value }
}

export function clearPrefs() {
  removeStorage(PREFS_KEY)
}
