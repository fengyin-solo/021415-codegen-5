import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  DEFAULT_PREFS,
  FONT_SIZE,
  LINE_WIDTH,
  THEMES,
  loadPrefs,
  sanitizePrefs,
  savePrefs
} from '@/lib/preferences'

// Debounce storage writes: dragging the font-size slider fires many updates
// per second, and rapid switching ("连续切换") must not thrash localStorage.
const PERSIST_DELAY = 300

/**
 * Apply the appearance preferences to :root. All visual effects read these
 * custom properties / the data-theme attribute, so the settings panel and
 * the rendered editor can never drift apart — both are views of the same
 * reactive state.
 */
function applyToDOM(prefs) {
  const root = document.documentElement
  root.style.setProperty('--editor-font-size', `${prefs.fontSize}px`)
  root.style.setProperty('--editor-line-width', `${prefs.lineWidth}px`)
  root.setAttribute('data-theme', prefs.theme)
}

/**
 * Apply persisted appearance before the app mounts (avoids a flash of the
 * default theme). Safe to call once at startup; the store re-reads the same
 * data when it initializes.
 */
export function initAppearance() {
  const { prefs } = loadPrefs()
  applyToDOM(prefs)
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = loadPrefs()

  const fontSize = ref(initial.prefs.fontSize)
  const lineWidth = ref(initial.prefs.lineWidth)
  const theme = ref(initial.prefs.theme)
  // A persisted autosave=true means nothing without working storage: show
  // the switch in the safe (off) state so panel and behavior cannot diverge.
  const autosave = ref(initial.available ? initial.prefs.autosave : false)
  const storageAvailable = ref(initial.available)

  // Notifications for notable storage conditions (write failure, storage
  // unavailable). Emitted to the component layer; the store itself is UI-free.
  const listeners = new Set()
  function onNotify(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
  function notify(message, type = 'warning') {
    for (const fn of listeners) {
      try { fn(message, type) } catch { /* a bad listener must not break saves */ }
    }
  }

  const prefs = computed(() => ({
    fontSize: fontSize.value,
    lineWidth: lineWidth.value,
    theme: theme.value,
    autosave: autosave.value
  }))

  let persistTimer = null
  let pending = null
  let warnedUnavailable = false

  function schedulePersist() {
    if (!storageAvailable.value) {
      // Surface the mismatch once: the UI shows the choice, but it cannot be
      // kept across reloads.
      if (!warnedUnavailable) {
        warnedUnavailable = true
        notify('浏览器存储不可用，设置仅本次有效', 'warning')
      }
      return
    }
    pending = { ...prefs.value }
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(flushPersist, PERSIST_DELAY)
  }

  function flushPersist() {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    if (!pending) return
    const result = savePrefs(pending)
    pending = null
    if (!result.ok) {
      storageAvailable.value = false
      // Nothing persisted can be honored anymore: autosave especially must
      // not stay visually on. The autosave flow in EditorPane observes the
      // change and stops writing.
      if (autosave.value) autosave.value = false
      notify('设置无法保存（存储可能已满或被禁用），更改仅本次有效', 'warning')
    }
  }

  /**
   * Patch one or more preference fields. The next state always passes
   * through sanitizePrefs() and the reactive state is replaced by the
   * sanitized values too — extreme/unknown input visibly snaps to the safe
   * value, keeping the panel and the rendered effect aligned.
   *
   * @returns {{ prefs: object, previousAutosave: boolean, issues: string[] }}
   */
  function update(partial) {
    const previousAutosave = autosave.value

    // Autosave cannot be promised when storage is unusable: keep the switch
    // in the safe (off) position so the panel never lies about behavior.
    if (partial && partial.autosave === true && !storageAvailable.value) {
      partial = { ...partial, autosave: false }
      notify('浏览器存储不可用，无法开启自动保存', 'warning')
    }

    const { value: safe, issues } = sanitizePrefs({ ...prefs.value, ...partial })

    fontSize.value = safe.fontSize
    lineWidth.value = safe.lineWidth
    theme.value = safe.theme
    autosave.value = safe.autosave
    applyToDOM(safe)
    schedulePersist()

    return { prefs: safe, previousAutosave, issues }
  }

  /** Restore factory defaults. The editor document is never touched. */
  function reset() {
    const previousAutosave = autosave.value
    fontSize.value = DEFAULT_PREFS.fontSize
    lineWidth.value = DEFAULT_PREFS.lineWidth
    theme.value = DEFAULT_PREFS.theme
    autosave.value = DEFAULT_PREFS.autosave
    applyToDOM(DEFAULT_PREFS)
    schedulePersist()
    return { previousAutosave }
  }

  /**
   * Called by the autosave flow when a draft write fails. Per the
   * "unusable combination falls back to a safe value" rule, the switch is
   * reverted to off so the panel cannot show a promise the runtime cannot
   * keep.
   */
  function autosaveWriteFailed() {
    if (autosave.value) {
      autosave.value = false
      schedulePersist()
    }
  }

  /** Flush pending writes (page hide / beforeunload). */
  function handleHide() {
    flushPersist()
  }

  return {
    // constants exposed for the settings panel
    FONT_SIZE,
    LINE_WIDTH,
    THEMES,
    DEFAULT_PREFS,
    // state
    fontSize,
    lineWidth,
    theme,
    autosave,
    storageAvailable,
    prefs,
    // actions
    update,
    reset,
    flushPersist,
    autosaveWriteFailed,
    onNotify,
    handleHide
  }
})
