import { EditorView } from '@codemirror/view'

// Colors are driven by the appearance theme CSS variables (see
// styles/global.scss), so a theme switch needs no editor reconfiguration.
export const editorBaseTheme = EditorView.baseTheme({
  '&': { height: '100%', backgroundColor: 'var(--c-bg-editor)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit' },
  '.cm-content': { caretColor: 'var(--c-accent)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--c-accent)', borderLeftWidth: '1.8px' }
})
