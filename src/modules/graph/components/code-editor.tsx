import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { indentUnit } from '@codemirror/language'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { useEffect, useRef } from 'react'

import { createCodeMirrorTheme } from '@/modules/themes'

type CodeEditorProps = {
  value: string
  onChange: (value: string) => void
  language?: 'tsx' | 'ts'
  tabSize?: 2 | 4
  scrollToLine?: number
}

export function CodeEditor({
  value,
  onChange,
  language = 'tsx',
  tabSize = 4,
  scrollToLine,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const themeAdapter = createCodeMirrorTheme()
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          indentUnit.of(' '.repeat(tabSize)),
          EditorState.tabSize.of(tabSize),
          closeBrackets(),
          autocompletion({ activateOnTyping: true, closeOnBlur: false }),
          keymap.of([
            indentWithTab,
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          javascript({ jsx: language === 'tsx', typescript: true }),
          themeAdapter.extension,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%', fontSize: '12.5px' },
            '.cm-scroller': { fontFamily: 'var(--font-mono, monospace)' },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    const detachTheme = themeAdapter.attach(view)

    viewRef.current = view
    return () => {
      detachTheme()
      view.destroy()
      viewRef.current = null
    }
  }, [language, tabSize])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (view.state.doc.toString() === value) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !scrollToLine) return
    const totalLines = view.state.doc.lines
    const line = Math.min(Math.max(1, scrollToLine), totalLines)
    const pos = view.state.doc.line(line).from
    view.dispatch({
      selection: EditorSelection.cursor(pos),
      effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 24 }),
    })
  }, [scrollToLine, value])

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />
}
