import {
  Braces,
  Code,
  Database,
  File,
  FileCode,
  FileImage,
  FileJson,
  FileText,
  FileType,
  Hash,
  Image,
  Lock,
  Settings,
  Terminal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type FileIconEntry = { icon: LucideIcon; color: string }

const EXT_MAP: Partial<Record<string, FileIconEntry>> = {
  ts: { icon: FileCode, color: 'text-blue-400' },
  tsx: { icon: FileCode, color: 'text-blue-400' },
  js: { icon: FileCode, color: 'text-yellow-400' },
  jsx: { icon: FileCode, color: 'text-yellow-400' },
  mjs: { icon: FileCode, color: 'text-yellow-400' },
  cjs: { icon: FileCode, color: 'text-yellow-400' },

  json: { icon: FileJson, color: 'text-yellow-300' },

  html: { icon: Code, color: 'text-orange-400' },
  htm: { icon: Code, color: 'text-orange-400' },
  xml: { icon: Code, color: 'text-orange-400' },
  svg: { icon: Code, color: 'text-orange-400' },

  css: { icon: Braces, color: 'text-purple-400' },
  scss: { icon: Braces, color: 'text-pink-400' },
  less: { icon: Braces, color: 'text-purple-400' },

  md: { icon: FileText, color: 'text-slate-300' },
  mdx: { icon: FileText, color: 'text-slate-300' },
  txt: { icon: FileText, color: 'text-slate-400' },
  csv: { icon: FileText, color: 'text-green-400' },

  png: { icon: Image, color: 'text-green-300' },
  jpg: { icon: Image, color: 'text-green-300' },
  jpeg: { icon: Image, color: 'text-green-300' },
  gif: { icon: Image, color: 'text-green-300' },
  webp: { icon: Image, color: 'text-green-300' },
  ico: { icon: FileImage, color: 'text-green-300' },

  py: { icon: FileCode, color: 'text-yellow-300' },
  rs: { icon: FileCode, color: 'text-orange-300' },
  go: { icon: FileCode, color: 'text-cyan-400' },
  c: { icon: FileCode, color: 'text-blue-300' },
  h: { icon: FileCode, color: 'text-blue-300' },
  cpp: { icon: FileCode, color: 'text-blue-300' },
  java: { icon: FileCode, color: 'text-red-400' },

  sh: { icon: Terminal, color: 'text-green-400' },
  bash: { icon: Terminal, color: 'text-green-400' },
  zsh: { icon: Terminal, color: 'text-green-400' },

  sql: { icon: Database, color: 'text-yellow-300' },

  yaml: { icon: Settings, color: 'text-red-300' },
  yml: { icon: Settings, color: 'text-red-300' },
  toml: { icon: Settings, color: 'text-slate-300' },
  ini: { icon: Settings, color: 'text-slate-300' },

  woff: { icon: FileType, color: 'text-slate-400' },
  woff2: { icon: FileType, color: 'text-slate-400' },
  ttf: { icon: FileType, color: 'text-slate-400' },
  otf: { icon: FileType, color: 'text-slate-400' },

  lock: { icon: Lock, color: 'text-slate-500' },

  d: { icon: Hash, color: 'text-blue-300' },
}

const NAME_MAP: Partial<Record<string, FileIconEntry>> = {
  Dockerfile: { icon: Terminal, color: 'text-cyan-400' },
  Makefile: { icon: Terminal, color: 'text-orange-300' },
  '.gitignore': { icon: Settings, color: 'text-slate-500' },
  '.eslintrc': { icon: Settings, color: 'text-purple-400' },
  '.prettierrc': { icon: Settings, color: 'text-purple-400' },
  '.env': { icon: Lock, color: 'text-yellow-400' },
  '.env.local': { icon: Lock, color: 'text-yellow-400' },
  'tsconfig.json': { icon: Settings, color: 'text-blue-400' },
  'package.json': { icon: FileJson, color: 'text-green-400' },
  'bun.lockb': { icon: Lock, color: 'text-slate-500' },
}

const DEFAULT_ENTRY: FileIconEntry = {
  icon: File,
  color: 'text-muted-foreground/70',
}

export function getFileIcon(name: string): FileIconEntry {
  const byName = NAME_MAP[name]
  if (byName) return byName

  const parts = name.split('.')
  if (parts.length > 2) {
    const compoundExt = parts.slice(-2).join('.')
    if (compoundExt === 'd.ts' || compoundExt === 'd.tsx') {
      return EXT_MAP['d']
    }
  }

  const ext = parts.pop()?.toLowerCase()
  if (ext && ext in EXT_MAP) return EXT_MAP[ext]

  return DEFAULT_ENTRY
}
