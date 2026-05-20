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
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { useCallback, useEffect, useRef } from 'react'

import { createCodeMirrorTheme } from '@/modules/themes'

import { useFileLineDiff } from '../hooks/use-file-line-diff'
import { diffGutter, setDiffLineStatusEffect } from '../lib/diff-gutter'
import { createLanguageAdapter } from '../lib/lang-from-name'
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

  const lineDiff = useFileLineDiff({
    path: file?.path ?? null,
    savedContent: file?.savedContent ?? '',
  })

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
    const themeAdapter = createCodeMirrorTheme()
    const langAdapter = createLanguageAdapter(file.name)
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: file.content,
        extensions: [
          diffGutter(),
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
          langAdapter.extension,
          themeAdapter.extension,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px' },
            '.cm-scroller': { fontFamily: 'var(--font-mono, monospace)' },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              updateFileContent(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    const detachTheme = themeAdapter.attach(view)
    langAdapter.attach(view)

    viewRef.current = view
    return () => {
      detachTheme()
      view.destroy()
      viewRef.current = null
      filePathRef.current = null
    }
  }, [file?.path])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setDiffLineStatusEffect.of(lineDiff) })
  }, [lineDiff])

  if (!file) return null

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TabBar />
      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden" />
      <UnsavedChangesDialog />
    </div>
  )
}
