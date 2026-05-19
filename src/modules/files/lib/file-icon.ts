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

const EXT_MAP: Partial<Record<string, LucideIcon>> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  mjs: FileCode,
  cjs: FileCode,

  json: FileJson,

  html: Code,
  htm: Code,
  xml: Code,
  svg: Code,

  css: Braces,
  scss: Braces,
  less: Braces,

  md: FileText,
  mdx: FileText,
  txt: FileText,
  csv: FileText,

  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  webp: Image,
  ico: FileImage,

  py: FileCode,
  rs: FileCode,
  go: FileCode,
  c: FileCode,
  h: FileCode,
  cpp: FileCode,
  java: FileCode,

  sh: Terminal,
  bash: Terminal,
  zsh: Terminal,

  sql: Database,

  yaml: Settings,
  yml: Settings,
  toml: Settings,
  ini: Settings,

  woff: FileType,
  woff2: FileType,
  ttf: FileType,
  otf: FileType,

  lock: Lock,

  d: Hash,
}

const NAME_MAP: Partial<Record<string, LucideIcon>> = {
  Dockerfile: Terminal,
  Makefile: Terminal,
  '.gitignore': Settings,
  '.eslintrc': Settings,
  '.prettierrc': Settings,
  '.env': Lock,
  '.env.local': Lock,
  'tsconfig.json': Settings,
  'package.json': FileJson,
  'bun.lockb': Lock,
}

export function getFileIcon(name: string): LucideIcon {
  const byName = NAME_MAP[name]
  if (byName) return byName

  const parts = name.split('.')
  if (parts.length > 2) {
    const compoundExt = parts.slice(-2).join('.')
    if (compoundExt === 'd.ts' || compoundExt === 'd.tsx') {
      return EXT_MAP['d']!
    }
  }

  const ext = parts.pop()?.toLowerCase()
  if (ext && ext in EXT_MAP) return EXT_MAP[ext]!

  return File
}
