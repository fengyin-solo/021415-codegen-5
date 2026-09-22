<template>
  <div class="app">
    <Toolbar @action="handleToolbarAction" />
    <EditorPane ref="editorPane" @ready="onEditorReady" />
    <StatusBar />
    <SettingsModal v-model="settingsOpen" @reset="onSettingsReset" />
    <Transition name="toast">
      <div v-if="toast.visible" :class="['toast', `toast--${toast.type}`]">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import Toolbar from '@/components/Toolbar.vue'
import EditorPane from '@/components/EditorPane.vue'
import StatusBar from '@/components/StatusBar.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import { useEditorStore } from '@/stores/editor'
import { usePrefsStore, applyPrefsToDocument } from '@/stores/prefs'
import { applyEditorTheme } from '@/editor'
import { saveDraft, clearDraft } from '@/storage'

const store = useEditorStore()
const prefs = usePrefsStore()

// Apply the restored preferences before/when the app boots so the initial
// render already matches the settings (also covered by the no-flash script).
applyPrefsToDocument(prefs)
watch(
  () => [prefs.fontSize, prefs.lineWidth, prefs.theme],
  () => applyPrefsToDocument(prefs)
)
// Theme also swaps the in-code-block syntax palette. Only that single
// compartment is reconfigured, so undo history and all keymaps survive.
watch(
  () => prefs.theme,
  (theme) => applyEditorTheme(editorView, theme)
)

const editorPane = ref(null)
const settingsOpen = ref(false)
let editorView = null

const toast = reactive({ visible: false, message: '', type: 'info' })
let toastTimer = null

function showToast(msg, type = 'info') {
  toast.message = msg; toast.type = type; toast.visible = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 2000)
}

function onEditorReady(view) { editorView = view }

// === Auto-save ===
// Persists the raw document text only. Font size / line width / theme are
// decoration-level preferences and never touch this content.
let draftTimer = null
watch(
  () => store.content,
  (content) => {
    if (!prefs.autoSave) return
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = setTimeout(() => {
      draftTimer = null
      if (!saveDraft(content) && prefs.autoSave) {
        // Storage vanished mid-session: force the switch to a safe state.
        prefs.setAutoSave(false)
        showToast('存储不可用，自动保存已关闭', 'warning')
      }
    }, 800)
  }
)

// Turning auto-save on saves immediately (so a quick reload still restores);
// turning it off removes the draft so the default doc returns next time.
watch(
  () => prefs.autoSave,
  (on) => {
    if (on) {
      if (!saveDraft(store.content)) {
        prefs.setAutoSave(false)
        showToast('存储不可用，无法开启自动保存', 'warning')
      }
    } else {
      if (draftTimer) { clearTimeout(draftTimer); draftTimer = null }
      clearDraft()
    }
  }
)

function onSettingsReset() {
  showToast('已恢复默认外观设置', 'success')
}

function insertText(before, after = '') {
  if (!editorView) return
  const { from, to } = editorView.state.selection.main
  const sel = editorView.state.sliceDoc(from, to)
  const text = `${before}${sel || 'text'}${after}`
  editorView.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + before.length, head: from + before.length + (sel || 'text').length }
  })
  editorView.focus()
}

function insertLine(prefix) {
  if (!editorView) return
  const line = editorView.state.doc.lineAt(editorView.state.selection.main.head)
  editorView.dispatch({ changes: { from: line.from, to: line.from, insert: prefix } })
  editorView.focus()
}

function handleToolbarAction(action) {
  const map = {
    bold: () => insertText('**', '**'),
    italic: () => insertText('*', '*'),
    strikethrough: () => insertText('~~', '~~'),
    code: () => insertText('`', '`'),
    link: () => insertText('[', '](url)'),
    image: () => insertText('![alt](', ')'),
    blockquote: () => insertLine('> '),
    'bullet-list': () => insertLine('- '),
    'ordered-list': () => insertLine('1. '),
    hr: () => {
      const pos = editorView.state.selection.main.head
      const line = editorView.state.doc.lineAt(pos)
      editorView.dispatch({ changes: { from: line.to, to: line.to, insert: '\n\n---\n\n' } })
      editorView.focus()
    },
    settings: () => { settingsOpen.value = true },
  }
  const fn = map[action]
  fn ? fn() : showToast(`未知操作: ${action}`, 'warning')
}
</script>

<style lang="scss" scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg;
}

.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: $sp-2 $sp-5;
  border-radius: $r-full;
  font-size: $fs-sm;
  color: #fff;
  z-index: $z-toast;
  box-shadow: $shadow-lg;
  pointer-events: none;
  font-family: $font-ui;

  &--info { background: $accent; }
  &--success { background: $success; }
  &--warning { background: $warning; }
  &--error { background: $error; }
}

.toast-enter-active,
.toast-leave-active {
  transition: all $t-slow $ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
