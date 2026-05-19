import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, gutter, GutterMarker } from '@codemirror/view'

import type { GitFileStatus } from '../types'

const STATUS_CLASS: Record<GitFileStatus, string> = {
  added: 'cm-diff-marker-added',
  modified: 'cm-diff-marker-modified',
  deleted: 'cm-diff-marker-deleted',
}

class DiffMarker extends GutterMarker {
  constructor(private readonly kind: GitFileStatus) {
    super()
  }

  eq(other: GutterMarker) {
    return other instanceof DiffMarker && other.kind === this.kind
  }

  toDOM() {
    const el = document.createElement('div')
    el.className = `cm-diff-marker ${STATUS_CLASS[this.kind]}`
    return el
  }
}

const ADDED_MARKER = new DiffMarker('added')
const MODIFIED_MARKER = new DiffMarker('modified')
const DELETED_MARKER = new DiffMarker('deleted')

function markerFor(kind: GitFileStatus): DiffMarker {
  switch (kind) {
    case 'added':
      return ADDED_MARKER
    case 'modified':
      return MODIFIED_MARKER
    case 'deleted':
      return DELETED_MARKER
  }
}

export const setDiffLineStatusEffect =
  StateEffect.define<Map<number, GitFileStatus>>()

const diffLineStatusField = StateField.define<Map<number, GitFileStatus>>({
  create: () => new Map(),
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setDiffLineStatusEffect)) return e.value
    }
    return value
  },
})

const diffGutterTheme = EditorView.theme({
  '.cm-diff-gutter': {
    width: '3px',
    padding: '0',
  },
  '.cm-diff-gutter .cm-gutterElement': {
    padding: '0',
  },
  '.cm-diff-marker': {
    width: '3px',
    height: '100%',
    boxSizing: 'border-box',
  },
  '.cm-diff-marker-added': {
    backgroundColor: '#22c55e',
  },
  '.cm-diff-marker-modified': {
    backgroundColor: '#f59e0b',
  },
  '.cm-diff-marker-deleted': {
    background:
      'linear-gradient(to bottom, transparent 0, transparent 60%, #ef4444 60%, #ef4444 100%)',
  },
})

export function diffGutter(): Extension {
  return [
    diffLineStatusField,
    gutter({
      class: 'cm-diff-gutter',
      lineMarker(view, line) {
        const map = view.state.field(diffLineStatusField, false)
        if (!map || map.size === 0) return null
        const lineNumber = view.state.doc.lineAt(line.from).number
        const kind = map.get(lineNumber)
        return kind ? markerFor(kind) : null
      },
      lineMarkerChange(update) {
        for (const tr of update.transactions) {
          for (const e of tr.effects) {
            if (e.is(setDiffLineStatusEffect)) return true
          }
        }
        return false
      },
    }),
    diffGutterTheme,
  ]
}
