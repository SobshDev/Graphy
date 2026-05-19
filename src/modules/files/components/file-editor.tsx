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
import { indentUnit } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { useCallback, useEffect, useRef } from 'react'

import { langFromName } from '../lib/lang-from-name'
import {
  requestCloseActiveTab,
  saveFile,
  updateFileContent,
  useOpenFile,
} from '../lib/open-file'
import { TabBar } from './tab-bar'
import { UnsavedChangesDialog } from './unsaved-changes-dialog'

export function FileEditor() {
  const file = useOpenFile()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const filePathRef = useRef<string | null>(null)

  const handleKeys = useCallback((e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key === 's') {
      e.preventDefault()
      saveFile()
    }
    if (e.key === 'w') {
      e.preventDefault()
      requestCloseActiveTab()
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [handleKeys])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !file) {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
        filePathRef.current = null
      }
      return
    }

    if (filePathRef.current === file.path && viewRef.current) {
      const current = viewRef.current.state.doc.toString()
      if (current !== file.content) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: file.content,
          },
        })
      }
      return
    }

    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    filePathRef.current = file.path
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: file.content,
        extensions: [
          lineNumbers(),
          history(),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          closeBrackets(),
          autocompletion({ activateOnTyping: true, closeOnBlur: false }),
          keymap.of([
            indentWithTab,
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          langFromName(file.name),
          oneDark,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px' },
            '.cm-scroller': { fontFamily: 'var(--font-mono, monospace)' },
            '.cm-gutters': {
              backgroundColor: 'transparent',
              borderRight: 'none',
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              updateFileContent(update.state.doc.toString())
            }
          }),
        ],
      }),
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
      filePathRef.current = null
    }
  }, [file?.path])

  if (!file) return null

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TabBar />
      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden" />
      <UnsavedChangesDialog />
    </div>
  )
}
