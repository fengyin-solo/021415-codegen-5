import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const content = ref('')
  const fileName = ref('untitled.md')
  const isDirty = ref(false)
  const wordCount = ref(0)
  const charCount = ref(0)
  const lineCount = ref(0)
  const cursorLine = ref(1)
  const cursorCol = ref(1)
  // Epoch ms of the last successful autosave flush; null when never saved.
  const lastSavedAt = ref(null)

  const statusText = computed(() => {
    return `Ln ${cursorLine.value}, Col ${cursorCol.value} | ${wordCount.value} words | ${charCount.value} chars`
  })

  // A short, human-readable save state used by the chrome (does not touch
  // the word-count status line).
  const saveLabel = computed(() => {
    if (!lastSavedAt.value) return ''
    return '已自动保存'
  })

  function updateContent(newContent) {
    content.value = newContent
    isDirty.value = true
    // Update stats — unchanged counting behavior
    charCount.value = newContent.length
    lineCount.value = newContent.split('\n').length
    wordCount.value = newContent.trim() ? newContent.trim().split(/\s+/).length : 0
  }

  /** Replace the document without flagging it dirty (draft restore / init). */
  function initContent(newContent) {
    content.value = newContent
    isDirty.value = false
    charCount.value = newContent.length
    lineCount.value = newContent.split('\n').length
    wordCount.value = newContent.trim() ? newContent.trim().split(/\s+/).length : 0
  }

  function updateCursor(line, col) {
    cursorLine.value = line
    cursorCol.value = col
  }

  function setFileName(name) {
    fileName.value = name
  }

  function markSaved(savedAt = Date.now()) {
    isDirty.value = false
    lastSavedAt.value = savedAt
  }

  return {
    content,
    fileName,
    isDirty,
    wordCount,
    charCount,
    lineCount,
    cursorLine,
    cursorCol,
    lastSavedAt,
    statusText,
    saveLabel,
    updateContent,
    initContent,
    updateCursor,
    setFileName,
    markSaved
  }
})
