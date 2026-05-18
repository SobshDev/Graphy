import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { parseProject, serializeGraph } from './index'

const cwd = process.cwd()
const root = process.argv[2]
  ? path.resolve(cwd, process.argv[2])
  : path.join(cwd, 'tests/fixtures')

const graph = parseProject(root)

const outDir = path.join(cwd, 'public')
const outPath = path.join(outDir, 'sample-graph.json')

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, serializeGraph(graph))

console.log(
  `[parser] wrote ${graph.nodes.length} nodes, ${graph.edges.length} edges → ${path.relative(cwd, outPath)}`,
)
