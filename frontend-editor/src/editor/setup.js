import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, drawSelection, highlightActiveLine, dropCursor } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { bracketMatching } from '@codemirror/language'
import { editorBaseTheme, createSyntaxHighlighting } from './theme'
import { markdownDecorationPlugin } from './decoration-plugin'

const defaultContent = `# Welcome to MD Live Editor

This is a **live rendering** markdown editor. Try clicking on any formatted text to see the raw syntax.

## Features

- **Bold text** and *italic text* render inline
- ~~Strikethrough~~ is supported too
- \`inline code\` looks great
- Links like [Google](https://www.google.com) are clickable

### Code Blocks

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`)
}
greet('World')
\`\`\`

### Blockquotes

> This is a blockquote. It has a nice left border and subtle background.
> You can write multiple lines here.

### Task Lists

- [x] Build the markdown parser
- [x] Implement decoration plugin
- [ ] Add more syntax support
- [ ] Polish the UI

### Images

![Placeholder](https://via.placeholder.com/600x200/e8f0fe/1a73e8?text=MD+Live+Editor)

---

### Table-like content

The editor focuses on **inline rendering** — what you see is what you get, but you can always click to edit the raw markdown.

Happy writing! ✨
`

// Syntax highlighting lives in its own compartment so a theme switch only
// swaps the highlight palette. History, keymaps and the document itself
// are outside the compartment and therefore never reset.
const syntaxCompartment = new Compartment()

/**
 * Create and mount a CodeMirror 6 editor instance.
 * @param {HTMLElement} parent - The DOM element to mount the editor into
 * @param {Object} [options]
 * @param {string} [options.doc] - Initial document content
 * @param {string} [options.theme='light'] - Initial UI theme
 * @param {function} [options.onUpdate] - Callback for editor updates
 * @returns {EditorView}
 */
export function createEditor(parent, options = {}) {
  const { doc, theme = 'light', onUpdate } = options

  const extensions = [
    // Core
    history(),
    drawSelection(),
    dropCursor(),
    highlightActiveLine(),
    bracketMatching(),
    EditorView.lineWrapping,

    // Keymaps
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab
    ]),

    // Markdown language support (for syntax tree)
    markdown({
      base: markdownLanguage,
      codeLanguages: languages
    }),
    syntaxCompartment.of(createSyntaxHighlighting(theme)),

    // Our custom theme
    editorBaseTheme,

    // The live rendering plugin
    markdownDecorationPlugin,

    // Placeholder
    EditorView.contentAttributes.of({ spellcheck: 'true' })
  ]

  // Add update listener if provided
  if (onUpdate) {
    extensions.push(EditorView.updateListener.of(onUpdate))
  }

  const state = EditorState.create({
    doc: doc || defaultContent,
    extensions
  })

  const view = new EditorView({ state, parent })
  view._syntaxCompartment = syntaxCompartment
  return view
}

/**
 * Reconfigure only the syntax-highlighting palette for an existing view.
 * Unknown themes are resolved to a safe palette inside createSyntaxHighlighting.
 */
export function applyEditorTheme(view, theme) {
  if (!view || !view._syntaxCompartment) return
  view.dispatch({
    effects: view._syntaxCompartment.reconfigure(createSyntaxHighlighting(theme))
  })
}
