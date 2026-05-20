import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Compartment } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

import { themeStore } from '../state/theme-store'
import { resolveMode } from './apply-theme'

const highlightStyle = HighlightStyle.define([
  {
    tag: [t.keyword, t.modifier, t.controlKeyword],
    color: 'var(--syntax-keyword)',
  },
  { tag: [t.string, t.special(t.string)], color: 'var(--syntax-string)' },
  { tag: [t.regexp], color: 'var(--syntax-regex)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--syntax-number)' },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: 'var(--syntax-comment)',
    fontStyle: 'italic',
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName)],
    color: 'var(--syntax-function)',
  },
  { tag: [t.variableName, t.name], color: 'var(--syntax-variable)' },
  {
    tag: [t.typeName, t.className, t.namespace, t.standard(t.name)],
    color: 'var(--syntax-type)',
  },
  {
    tag: [t.propertyName, t.definition(t.propertyName)],
    color: 'var(--syntax-property)',
  },
  { tag: [t.tagName], color: 'var(--syntax-tag)' },
  { tag: [t.attributeName], color: 'var(--syntax-attribute)' },
  { tag: [t.operator, t.operatorKeyword], color: 'var(--syntax-operator)' },
  {
    tag: [t.punctuation, t.bracket, t.brace, t.paren, t.separator],
    color: 'var(--foreground)',
  },
  { tag: [t.meta, t.processingInstruction], color: 'var(--syntax-meta)' },
  { tag: [t.heading], color: 'var(--syntax-keyword)', fontWeight: 'bold' },
  {
    tag: [t.link, t.url],
    color: 'var(--syntax-link)',
    textDecoration: 'underline',
  },
  { tag: [t.strong], fontWeight: 'bold' },
  { tag: [t.emphasis], fontStyle: 'italic' },
  { tag: [t.strikethrough], textDecoration: 'line-through' },
  { tag: [t.invalid], color: 'var(--destructive)' },
])

function baseTheme(dark: boolean): Extension {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
      },
      '.cm-content': {
        caretColor: 'var(--foreground)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--foreground)',
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        {
          backgroundColor:
            'color-mix(in oklab, var(--primary) 28%, transparent)',
        },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: 'var(--muted-foreground)',
        border: 'none',
      },
      '.cm-activeLine': {
        backgroundColor:
          'color-mix(in oklab, var(--foreground) 5%, transparent)',
      },
      '.cm-activeLineGutter': {
        backgroundColor:
          'color-mix(in oklab, var(--foreground) 5%, transparent)',
        color: 'var(--foreground)',
      },
      '.cm-tooltip': {
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
      },
      '.cm-tooltip-autocomplete > ul > li': {
        color: 'var(--popover-foreground)',
      },
      '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
      },
      '.cm-panels': {
        backgroundColor: 'var(--card)',
        color: 'var(--card-foreground)',
      },
      '.cm-searchMatch': {
        backgroundColor: 'color-mix(in oklab, var(--primary) 30%, transparent)',
      },
      '.cm-matchingBracket, .cm-nonmatchingBracket': {
        backgroundColor: 'color-mix(in oklab, var(--primary) 25%, transparent)',
        outline: 'none',
      },
      '.cm-selectionMatch': {
        backgroundColor:
          'color-mix(in oklab, var(--foreground) 12%, transparent)',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--muted)',
        color: 'var(--muted-foreground)',
        border: 'none',
      },
    },
    { dark },
  )
}

function buildExtensions(): Extension[] {
  const mode = resolveMode(themeStore.getState().mode)
  return [baseTheme(mode === 'dark'), syntaxHighlighting(highlightStyle)]
}

export function createCodeMirrorTheme(): {
  extension: Extension
  attach: (view: EditorView) => () => void
} {
  const compartment = new Compartment()
  return {
    extension: compartment.of(buildExtensions()),
    attach(view) {
      return themeStore.subscribe(() => {
        view.dispatch({ effects: compartment.reconfigure(buildExtensions()) })
      })
    },
  }
}
