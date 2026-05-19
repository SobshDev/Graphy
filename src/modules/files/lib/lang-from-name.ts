import { javascript } from '@codemirror/lang-javascript'
import type { Extension } from '@codemirror/state'

export function langFromName(name: string): Extension {
  if (/\.[jt]sx$/.test(name)) return javascript({ jsx: true, typescript: true })
  if (/\.ts$/.test(name)) return javascript({ typescript: true })
  if (/\.[mc]?js$/.test(name)) return javascript()
  return javascript({ typescript: true })
}
