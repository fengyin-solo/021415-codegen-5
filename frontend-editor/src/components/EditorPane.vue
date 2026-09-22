<template>
  <div class="editor-pane" ref="editorContainer"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createEditor } from '@/editor'
import { useEditorStore } from '@/stores/editor'
import { usePrefsStore } from '@/stores/prefs'
import { loadDraft } from '@/storage'

const editorContainer = ref(null)
const store = useEditorStore()
const prefs = usePrefsStore()
let editorView = null
const emit = defineEmits(['ready'])

onMounted(() => {
  if (!editorContainer.value) return

  // Restore the auto-saved draft (global across documents/sessions).
  // A missing or corrupt draft simply yields the default welcome content —
  // this never alters the document once it has been created.
  const draft = prefs.autoSave ? loadDraft() : null

  editorView = createEditor(editorContainer.value, {
    ...(draft != null ? { doc: draft } : {}),
    theme: prefs.theme,
    onUpdate(update) {
      if (update.docChanged) store.updateContent(update.state.doc.toString())
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        store.updateCursor(line.number, pos - line.from + 1)
      }
    }
  })
  store.updateContent(editorView.state.doc.toString())
  emit('ready', editorView)
})

onBeforeUnmount(() => { editorView?.destroy(); editorView = null })

defineExpose({ getView: () => editorView })
</script>

<style lang="scss" scoped>
.editor-pane {
  flex: 1;
  overflow: hidden;
  background: $bg-editor;
}
</style>
