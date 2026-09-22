<template>
  <div class="editor-pane" ref="editorContainer"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { createEditor } from '@/editor'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import { loadDraft, saveDraft } from '@/lib/draft'

const editorContainer = ref(null)
const store = useEditorStore()
const settings = useSettingsStore()
const emit = defineEmits(['ready', 'notify'])

let editorView = null

// Autosave bookkeeping
const AUTOSAVE_DELAY = 600
let autosaveTimer = null
// Suppress saving while the restored draft is being pushed into the editor.
let applyingRestore = false
// True only when the autosave preference is on AND storage works.
let autosaveActive = false
// Timestamp of the draft restored at startup, to mark it "saved".
let restoredAt = null

function scheduleAutosave(content) {
  if (!autosaveActive) return
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => flushAutosave(content), AUTOSAVE_DELAY)
}

function flushAutosave(content) {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
  if (!autosaveActive) return
  const text = content ?? store.content
  const ok = saveDraft(text)
  if (ok) {
    store.markSaved()
  } else {
    // Storage became unusable (quota, etc.): fall back to the safe state
    // (switch off) so UI and behavior cannot disagree.
    settings.autosaveWriteFailed()
    autosaveActive = false
    emit('notify', '自动保存失败：存储不可用，已关闭自动保存', 'warning')
  }
}

function refreshAutosaveState(previousAutosave) {
  const next = settings.autosave && settings.storageAvailable
  if (next === autosaveActive) return

  if (next) {
    autosaveActive = true
    // Turning autosave on mid-session persists the current text at once.
    if (store.content) scheduleAutosave(store.content)
  } else {
    // Turning off (or storage lost) cancels pending writes but keeps the
    // existing draft on disk for the user.
    autosaveActive = false
    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
    // If the switch flipped off while it was previously honoring saves,
    // make sure no in-flight write is lost.
    if (previousAutosave && settings.storageAvailable) saveDraft(store.content)
  }
}

// React to settings changes coming from the panel (rapid toggles included:
// watch fires per change, and scheduleAutosave debounces writes).
const stopWatchingAutosave = watch(
  () => [settings.autosave, settings.storageAvailable],
  ([nextAutosave, nextAvailable], [prevAutosave, prevAvailable] = []) => {
    if (nextAutosave === prevAutosave && nextAvailable === prevAvailable) return
    refreshAutosaveState(prevAutosave ?? nextAutosave)
  }
)

function onVisibilityHidden() {
  if (autosaveActive) flushAutosave(store.content)
}
function onPageHide() {
  if (autosaveActive) flushAutosave(store.content)
}

onMounted(() => {
  if (!editorContainer.value) return

  // Restore a draft only when the preference was persisted as on AND the
  // storage layer works. Any corrupt/unknown combination yields ''.
  const draft = settings.autosave && settings.storageAvailable ? loadDraft() : { content: '', savedAt: null }
  if (settings.autosave && !settings.storageAvailable) {
    emit('notify', '浏览器存储不可用，自动保存未启用', 'warning')
  }
  restoredAt = draft.savedAt

  editorView = createEditor(editorContainer.value, {
    doc: draft.content || undefined,
    onUpdate(update) {
      if (update.docChanged) {
        if (applyingRestore) return
        store.updateContent(update.state.doc.toString())
        scheduleAutosave(update.state.doc.toString())
      }
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        store.updateCursor(line.number, pos - line.from + 1)
      }
    }
  })

  if (draft.content) {
    applyingRestore = true
    store.initContent(editorView.state.doc.toString())
    store.markSaved(restoredAt ?? Date.now())
    applyingRestore = false
  } else {
    store.initContent(editorView.state.doc.toString())
  }

  autosaveActive = settings.autosave && settings.storageAvailable
  emit('ready', editorView)

  document.addEventListener('visibilitychange', onVisibilityHidden)
  window.addEventListener('pagehide', onPageHide)
})

onBeforeUnmount(() => {
  stopWatchingAutosave?.()
  if (autosaveTimer) clearTimeout(autosaveTimer)
  document.removeEventListener('visibilitychange', onVisibilityHidden)
  window.removeEventListener('pagehide', onPageHide)
  editorView?.destroy()
  editorView = null
})

defineExpose({ getView: () => editorView, flushAutosave: () => flushAutosave() })
</script>

<style lang="scss" scoped>
.editor-pane {
  flex: 1;
  overflow: hidden;
  background: $bg-editor;
  background-color: var(--c-bg-editor);
}
</style>
