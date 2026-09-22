// Autosave draft persistence.
//
// The draft is stored separately from preferences so that:
//   - resetting appearance defaults never touches the user's text;
//   - a corrupt draft can never corrupt the preferences;
//   - the draft is only restored when autosave is (still) enabled.
//
// Persisted shape: { "version": 1, "content": string, "savedAt": number }

import { isStorageAvailable, readJSON, writeJSON, removeStorage } from './storage'

export const DRAFT_KEY = 'mira.draft.v1'
export const DRAFT_VERSION = 1

/**
 * Load the saved draft.
 * @returns {{ available: boolean, content: string, savedAt: number | null }}
 *   `content` is an empty string when no usable draft exists.
 */
export function loadDraft() {
  const empty = { available: isStorageAvailable(), content: '', savedAt: null }
  if (!empty.available) return empty

  const { ok, data } = readJSON(DRAFT_KEY)
  if (!ok) {
    removeStorage(DRAFT_KEY)
    return empty
  }
  if (data === undefined) return empty
  if (typeof data !== 'object' || data === null || data.version !== DRAFT_VERSION) {
    removeStorage(DRAFT_KEY)
    return empty
  }
  if (typeof data.content !== 'string') return empty

  const savedAt = typeof data.savedAt === 'number' && Number.isFinite(data.savedAt)
    ? data.savedAt
    : null
  return { available: true, content: data.content, savedAt }
}

/**
 * Persist the current document as a draft.
 * @returns {boolean} false when storage is unavailable / write failed
 *   (quota, etc.) — the caller should report the condition to the user and
 *   avoid leaving the autosave toggle in a state the runtime cannot honor.
 */
export function saveDraft(content) {
  if (!isStorageAvailable()) return false
  return writeJSON(DRAFT_KEY, {
    version: DRAFT_VERSION,
    content: String(content ?? ''),
    savedAt: Date.now()
  })
}

export function clearDraft() {
  removeStorage(DRAFT_KEY)
}
