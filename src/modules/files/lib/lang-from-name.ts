import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { Compartment  } from '@codemirror/state'
import type {Extension} from '@codemirror/state';
import type { EditorView } from '@codemirror/view'

function findDescription(name: string): LanguageDescription | null {
  return (
    LanguageDescription.matchFilename(languages, name) ??
    LanguageDescription.matchLanguageName(
      languages,
      name.replace(/^.*\./, ''),
      true,
    ) ??
    null
  )
}

export function createLanguageAdapter(name: string): {
  extension: Extension
  attach: (view: EditorView) => void
} {
  const compartment = new Compartment()
  const description = findDescription(name)
  return {
    extension: compartment.of([]),
    attach(view) {
      if (!description) return
      void description.load().then((support) => {
        if (view.dom.isConnected === false) return
        view.dispatch({ effects: compartment.reconfigure(support) })
      })
    },
  }
}
