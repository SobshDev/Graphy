import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { parseProject, serializeGraph } from './index'

export interface DumpResult {
  nodes: number
  edges: number
  outPath: string
}

export function dumpGraph(root: string): DumpResult {
  const graph = parseProject(root)
  const outDir = path.join(process.cwd(), 'public')
  const outPath = path.join(outDir, 'sample-graph.json')

  mkdirSync(outDir, { recursive: true })
  writeFileSync(outPath, serializeGraph(graph))

  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    outPath,
  }
}

function resolveRoot(): string {
  const cwd = process.cwd()
  return process.argv[2]
    ? path.resolve(cwd, process.argv[2])
    : path.join(cwd, 'tests/fixtures')
}

if (import.meta.main) {
  const root = resolveRoot()
  const result = dumpGraph(root)
  console.log(
    `[parser] wrote ${result.nodes} nodes, ${result.edges} edges → ${path.relative(process.cwd(), result.outPath)}`,
  )
}
