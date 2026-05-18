import { createServerFn } from '@tanstack/react-start'

import type { FileNode } from '../types'

const IGNORED = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.output',
  '.vinxi',
  '.nitro',
  '.cache',
  'coverage',
  'release',
])

export const getFileTree = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FileNode> => {
    const { readdir } = await import('node:fs/promises')
    const { basename, join, relative } = await import('node:path')

    const root = process.cwd()

    async function walk(absPath: string): Promise<Array<FileNode>> {
      const entries = await readdir(absPath, { withFileTypes: true })
      const nodes: Array<FileNode> = []

      for (const entry of entries) {
        if (IGNORED.has(entry.name)) continue
        const childAbs = join(absPath, entry.name)
        const rel = relative(root, childAbs)
        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: rel,
            kind: 'dir',
            children: await walk(childAbs),
          })
        } else if (entry.isFile()) {
          nodes.push({ name: entry.name, path: rel, kind: 'file' })
        }
      }

      nodes.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })

      return nodes
    }

    return {
      name: basename(root),
      path: '',
      kind: 'dir',
      children: await walk(root),
    }
  },
)
