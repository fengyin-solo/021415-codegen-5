/**
 * Safe persistence layer for user preferences and auto-saved drafts.
 *
 * Every reader validates its input and falls back to safe defaults when:
 *  - storage is unavailable (private mode, quota disabled, security policy)
 *  - the stored payload is missing, corrupt, or of the wrong type
 *  - individual fields are unknown / out of range
 *
 * The raw Markdown document is never touched by this module.
 */

const PREFS_KEY = 'mira.prefs.v1'
const DRAFT_KEY = 'mira.draft.v1'

export const DEFAULT_PREFS = Object.freeze({
  fontSize: 16,
  lineWidth: 720,
  theme: 'light',
  autoSave: false
})

export const THEMES = Object.freeze(['light', 'sepia', 'dark'])

export const FONT_SIZE_RANGE = Object.freeze({ min: 12, max: 28 })
export const LINE_WIDTH_RANGE = Object.freeze({ min: 480, max: 1200 })

/** Cached storage probe — once unavailable, never queried again this session. */
let availabilityCache = null

export function storageAvailable() {
  if (availabilityCache !== null) return availabilityCache
  try {
    const s = window.localStorage
    const probe = '__mira_storage_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    availabilityCache = true
  } catch {
    availabilityCache = false
  }
  return availabilityCache
}

/**
 * Coerce an unknown value into a finite number. Strings like "18px" are
 * rejected; "18" is accepted. Booleans/objects/undefined yield NaN.
 */
function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return NaN
}

/** Round and clamp an unknown value; fall back when it is not numeric. */
export function clampInt(value, min, max, fallback) {
  const n = toFiniteNumber(value)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function clampFontSize(value) {
  return clampInt(value, FONT_SIZE_RANGE.min, FONT_SIZE_RANGE.max, DEFAULT_PREFS.fontSize)
}

export function clampLineWidth(value) {
  return clampInt(value, LINE_WIDTH_RANGE.min, LINE_WIDTH_RANGE.max, DEFAULT_PREFS.lineWidth)
}

/**
 * Convert an arbitrary unknown payload into a complete, valid preferences
 * object. Every field is validated independently — one bad value never
 * invalidates the others; unknown keys are discarded.
 * @returns {typeof DEFAULT_PREFS}
 */
export function sanitizePrefs(raw) {
  const out = { ...DEFAULT_PREFS }
  if (raw && typeof raw === 'object') {
    if (Object.prototype.hasOwnProperty.call(raw, 'fontSize')) {
      out.fontSize = clampFontSize(raw.fontSize)
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'lineWidth')) {
      out.lineWidth = clampLineWidth(raw.lineWidth)
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'theme')) {
      out.theme = THEMES.includes(raw.theme) ? raw.theme : DEFAULT_PREFS.theme
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'autoSave')) {
      out.autoSave = typeof raw.autoSave === 'boolean'
        ? raw.autoSave
        : DEFAULT_PREFS.autoSave
    }
  }
  return out
}

/** Read preferences; always returns a complete valid object. */
export function loadPrefs() {
  try {
    if (!storageAvailable()) return { ...DEFAULT_PREFS }
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (raw == null) return { ...DEFAULT_PREFS }
    return sanitizePrefs(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

/** Persist preferences. Returns false when storage is unavailable. */
export function savePrefs(prefs) {
  try {
    if (!storageAvailable()) return false
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(sanitizePrefs(prefs)))
    return true
  } catch {
    availabilityCache = false
    return false
  }
}

/** Load the auto-saved draft, or null when none / invalid. */
export function loadDraft() {
  try {
    if (!storageAvailable()) return null
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.content === 'string' ? parsed.content : null
  } catch {
    return null
  }
}

/** Persist a draft. Returns false when storage is unavailable. */
export function saveDraft(content) {
  try {
    if (!storageAvailable()) return false
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, savedAt: Date.now() }))
    return true
  } catch {
    availabilityCache = false
    return false
  }
}

/** Remove the saved draft. Never throws. */
export function clearDraft() {
  try {
    window.localStorage?.removeItem(DRAFT_KEY)
  } catch {
    /* storage gone — nothing to clear */
  }
}
