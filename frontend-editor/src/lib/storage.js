// Safe localStorage wrapper.
//
// localStorage can be unavailable or throw at any time: private/incognito
// modes, sandboxed iframes, disabled cookies, SecurityError on access, or
// quota exhaustion on write. Every helper here fails soft and never throws,
// so the rest of the app can treat persistence as best-effort.

const PROBE_KEY = '__mira_storage_probe__'

function getStorage() {
  try {
    if (typeof globalThis === 'undefined') return null
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
  } catch {
    return null
  }
}

/**
 * Probe whether storage is actually usable (some browsers expose the API
 * but throw on setItem).
 * @returns {boolean}
 */
export function isStorageAvailable() {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(PROBE_KEY, '1')
    storage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}

export function readStorage(key) {
  const storage = getStorage()
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

/**
 * @returns {boolean} false when the value could not be written
 */
export function writeStorage(key, value) {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorage(key) {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Read and JSON-parse a key.
 * @returns {{ ok: boolean, data: unknown }} `data` is `undefined` when the
 *   key is absent; `ok` is false when the stored value is not valid JSON.
 */
export function readJSON(key) {
  const raw = readStorage(key)
  if (raw === null) return { ok: true, data: undefined }
  try {
    return { ok: true, data: JSON.parse(raw) }
  } catch {
    return { ok: false, data: undefined }
  }
}

export function writeJSON(key, value) {
  let serialized
  try {
    serialized = JSON.stringify(value)
  } catch {
    return false
  }
  return writeStorage(key, serialized)
}
