import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  DEFAULT_PREFS,
  THEMES,
  FONT_SIZE_RANGE,
  LINE_WIDTH_RANGE,
  loadPrefs,
  savePrefs,
  storageAvailable,
  clampFontSize,
  clampLineWidth,
  sanitizePrefs,
  clearDraft
} from '@/storage'

const PERSIST_DEBOUNCE_MS = 250

/**
 * Push the current preferences onto the document root as a data attribute
 * and CSS variables. Pure presentation only — this never touches the
 * editor's document text, decorations, or keymaps.
 */
export function applyPrefsToDocument(prefs) {
  const root = document.documentElement
  root.dataset.theme = prefs.theme
  root.style.setProperty('--mira-editor-font-size', `${prefs.fontSize}px`)
  root.style.setProperty('--mira-line-width', `${prefs.lineWidth}px`)
}

export const usePrefsStore = defineStore('prefs', () => {
  // storageAvailable() validates the whole unknown-combination envelope:
  // when storage is missing/corrupt, loadPrefs() already returned defaults.
  const storageReady = ref(storageAvailable())
  const initial = storageReady.value ? loadPrefs() : { ...DEFAULT_PREFS }

  const fontSize = ref(initial.fontSize)
  const lineWidth = ref(initial.lineWidth)
  const theme = ref(initial.theme)
  const autoSave = ref(initial.autoSave && storageReady.value)

  let persistTimer = null

  /**
   * Debounced persistence. Rapid toggling of multiple options (sliders,
   * theme switching) collapses into a single write. If a write fails
   * mid-session, storage flips to unavailable and auto-save is forced off.
   */
  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = null
      if (!savePrefs(snapshot())) {
        storageReady.value = false
        autoSave.value = false
      }
    }, PERSIST_DEBOUNCE_MS)
  }

  function snapshot() {
    return sanitizePrefs({
      fontSize: fontSize.value,
      lineWidth: lineWidth.value,
      theme: theme.value,
      autoSave: autoSave.value
    })
  }

  function setFontSize(value) {
    const next = clampFontSize(value) // extreme / NaN input → safe value
    if (next === fontSize.value) return
    fontSize.value = next
    schedulePersist()
  }

  function setLineWidth(value) {
    const next = clampLineWidth(value)
    if (next === lineWidth.value) return
    lineWidth.value = next
    schedulePersist()
  }

  function setTheme(value) {
    // Unknown theme combination → safe default
    const next = THEMES.includes(value) ? value : DEFAULT_PREFS.theme
    if (next === theme.value) return
    theme.value = next
    schedulePersist()
  }

  /**
   * Toggle auto-save. Cannot be enabled when storage is unavailable.
   * @returns {boolean} whether the requested value was applied
   */
  function setAutoSave(value) {
    const next = !!value
    if (next && !storageReady.value) return false
    autoSave.value = next
    schedulePersist()
    return true
  }

  /** Restore every option to its factory default. */
  function reset() {
    fontSize.value = DEFAULT_PREFS.fontSize
    lineWidth.value = DEFAULT_PREFS.lineWidth
    theme.value = DEFAULT_PREFS.theme
    autoSave.value = DEFAULT_PREFS.autoSave
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null }
    if (!savePrefs(snapshot())) {
      storageReady.value = false
    }
    clearDraft()
  }

  const limits = computed(() => ({
    fontSize: { ...FONT_SIZE_RANGE },
    lineWidth: { ...LINE_WIDTH_RANGE },
    themes: [...THEMES]
  }))

  return {
    // state
    storageReady,
    fontSize,
    lineWidth,
    theme,
    autoSave,
    limits,
    // actions
    setFontSize,
    setLineWidth,
    setTheme,
    setAutoSave,
    reset
  }
})
