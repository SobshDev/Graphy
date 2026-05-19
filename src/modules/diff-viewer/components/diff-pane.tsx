import { Decoration, EditorView, lineNumbers } from '@codemirror/view'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { useEffect, useRef } from 'react'

import { langFromName } from '@/modules/files/lib/lang-from-name'

import type { DiffRow } from '../types'

interface DiffPaneProps {
  side: 'left' | 'right'
  rows: DiffRow[]
  fileName: string
  viewRef?: React.RefObject<EditorView | null>
  onScrollY?: (y: number) => void
  scrollY?: number
}

const delMark = Decoration.line({ attributes: { class: 'cm-diff-del' } })
const addMark = Decoration.line({ attributes: { class: 'cm-diff-add' } })
const emptyMark = Decoration.line({ attributes: { class: 'cm-diff-empty' } })

function mappedLineNumber(
  cmLine: number,
  side: 'left' | 'right',
  rows: DiffRow[],
): string {
  if (cmLine < 1 || cmLine > rows.length) return ''
  const row = rows[cmLine - 1]
  const { lineNumber } = row[side]
  return lineNumber != null ? String(lineNumber) : ''
}

const diffTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono, monospace)',
    overflow: 'auto',
  },
  '.cm-gutters': { backgroundColor: 'transparent', borderRight: 'none' },
  '.cm-diff-del': { backgroundColor: 'rgba(248, 113, 113, 0.18)' },
  '.cm-diff-add': { backgroundColor: 'rgba(74, 222, 128, 0.18)' },
  '.cm-diff-empty': { backgroundColor: 'rgba(148, 163, 184, 0.10)' },
})

function lineDecorationPlugin(rows: DiffRow[], side: 'left' | 'right') {
  return EditorView.decorations.of((view) => {
    const builder = new RangeSetBuilder<Decoration>()
    const total = Math.min(view.state.doc.lines, rows.length)
    for (let i = 1; i <= total; i++) {
      const row = rows[i - 1]
      const s = row[side]
      const line = view.state.doc.line(i)
      if (s.kind === 'del') {
        builder.add(line.from, line.from, delMark)
      } else if (s.kind === 'add') {
        builder.add(line.from, line.from, addMark)
      } else if (s.kind === 'empty') {
        builder.add(line.from, line.from, emptyMark)
      }
    }
    return builder.finish()
  })
}

export function DiffPane({
  side,
  rows,
  fileName,
  viewRef,
  onScrollY,
  scrollY,
}: DiffPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const internalViewRef = useRef<EditorView | null>(null)
  const scrollingRef = useRef(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const content = rows.map((r) => r[side].text).join('\n')

    const editorView = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers({
            formatNumber: (n) => mappedLineNumber(n, side, rows),
          }),
          langFromName(fileName),
          oneDark,
          diffTheme,
          lineDecorationPlugin(rows, side),
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.domEventHandlers({
            scroll(_event, ev) {
              if (scrollingRef.current) return
              onScrollY?.(ev.scrollDOM.scrollTop)
            },
          }),
        ],
      }),
    })

    internalViewRef.current = editorView
    if (viewRef) {
      viewRef.current = editorView
    }

    return () => {
      editorView.destroy()
      internalViewRef.current = null
      if (viewRef) viewRef.current = null
    }
  }, [rows, side, fileName])

  useEffect(() => {
    const editorView = internalViewRef.current
    if (!editorView || scrollY === undefined) return
    if (Math.abs(editorView.scrollDOM.scrollTop - scrollY) < 1) return
    scrollingRef.current = true
    editorView.scrollDOM.scrollTop = scrollY
    requestAnimationFrame(() => {
      scrollingRef.current = false
    })
  }, [scrollY])

  return <div ref={hostRef} className="h-full min-h-0 overflow-hidden" />
}
