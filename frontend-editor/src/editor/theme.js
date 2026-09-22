import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Colors come from the theme CSS custom properties so the editor shell
// follows the user's theme choice without rebuilding extensions.
export const editorBaseTheme = EditorView.baseTheme({
  '&': { height: '100%', backgroundColor: 'var(--mira-bg-editor, #ffffff)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit' },
  '.cm-content': { caretColor: 'var(--mira-accent, #2563eb)' },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--mira-accent, #2563eb)',
    borderLeftWidth: '1.8px'
  }
})

// Syntax highlighting is only visible inside fenced code blocks in this
// app (markdown prose is rendered via decorations), so these palettes are
// tuned for the dark code-block surface across every UI theme.
const codePalette = {
  light: {
    text: '#e2e8f0',
    keyword: '#93c5fd',
    string: '#fcd34d',
    comment: '#7d8590',
    number: '#fca5a5',
    function: '#86efac',
    operator: '#e2e8f0',
    variable: '#e2e8f0',
    type: '#7dd3fc',
    punctuation: '#cbd5e1'
  },
  sepia: {
    text: '#e8dcc0',
    keyword: '#f0b48a',
    string: '#e6d28b',
    comment: '#9c8f76',
    number: '#e8a08a',
    function: '#b8d4a0',
    operator: '#e8dcc0',
    variable: '#e8dcc0',
    type: '#d4b896',
    punctuation: '#c9bda3'
  },
  dark: {
    text: '#d4d4d8',
    keyword: '#93c5fd',
    string: '#fcd34d',
    comment: '#6b7280',
    number: '#fca5a5',
    function: '#86efac',
    operator: '#d4d4d8',
    variable: '#d4d4d8',
    type: '#7dd3fc',
    punctuation: '#a1a1aa'
  }
}

const highlightSpec = (p) => [
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.moduleKeyword, t.definitionKeyword], color: p.keyword },
  { tag: [t.string, t.docString, t.character, t.attributeValue, t.regexp], color: p.string },
  { tag: [t.comment, t.lineComment, t.blockComment], color: p.comment, fontStyle: 'italic' },
  { tag: [t.number, t.integer, t.float, t.bool, t.atom, t.null, t.constant], color: p.number },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.standard(t.name)], color: p.function },
  { tag: [t.typeName, t.className, t.tagName, t.namespace], color: p.type },
  { tag: [t.variableName, t.propertyName, t.attributeName], color: p.variable },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket, t.paren, t.brace], color: p.punctuation }
]

const highlightStyles = {
  light: HighlightStyle.define(highlightSpec(codePalette.light)),
  sepia: HighlightStyle.define(highlightSpec(codePalette.sepia)),
  dark: HighlightStyle.define(highlightSpec(codePalette.dark))
}

/**
 * Build the syntax-highlighting extension for a given theme.
 * Unknown themes fall back to the light palette (safe value).
 */
export function createSyntaxHighlighting(theme) {
  const style = highlightStyles[theme] || highlightStyles.light
  return syntaxHighlighting(style, { fallback: true })
}
