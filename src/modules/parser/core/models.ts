// Différentes formes de fonction TS
// E.g: const add = (a: number, b: number) => a + b;
// Différent de :
// function add(a: number, b: number) { }...

import type { Node as TsMorphNode } from 'ts-morph'

export type NodeType =
  | 'component'
  | 'hook'
  | 'function'
  | 'method'
  | 'arrow'
  | 'class'
  | 'object'
  | 'constructor'
  | 'getter'
  | 'setter'

export type EdgeType =
  | 'owns'
  | 'calls'
  | 'references'
  | 'renders'
  | 'uses-hook'
  | 'instantiates'
  | 'extends'
  | 'implements'
  | 'passes-callback'

export interface GraphNode {
  id: string
  name: string
  type: NodeType
  file: string
  line: number
  endLine: number
  signature: string
  isAsync: boolean
  isExported: boolean
  isStatic: boolean
  bodyLines: number
  inDegree: number
  outDegree: number
}

export interface GraphEdge {
  source: string
  target: string
  type: EdgeType
}

export interface Graph {
  version: string
  language: 'typescript'
  root: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface CollectedNode {
  graphNode: GraphNode
  declaration: TsMorphNode
}

export function makeNodeId(file: string, qualifiedName: string): string {
  return `${file}::${qualifiedName}`
}
