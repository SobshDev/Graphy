import type { Graph, GraphEdge, GraphNode } from './core/models'

export interface ClassInfo {
  /** Node representing the class itself */
  node: GraphNode
  /** Class methods, in source order */
  methods: GraphNode[]
  /** Total callers — class node + sum of method callers (unique) */
  totalCallers: number
  /** Total callees — sum of method callees (unique) */
  totalCallees: number
  /** Sum of body lines (class + each method) */
  totalLines: number
}

/**
 * Read-only inspector over a parsed Graph.
 *
 * Indexes nodes and edges once at construction so every lookup is O(1) (or
 * O(k) where k is the result size). Safe to share across UI consumers.
 */
export class ClassInspector {
  private readonly nodeById = new Map<string, GraphNode>()
  private readonly methodsByClassId = new Map<string, GraphNode[]>()
  private readonly callersByNodeId = new Map<string, string[]>()
  private readonly calleesByNodeId = new Map<string, string[]>()
  private readonly classIds: string[] = []

  constructor(graph: Graph) {
    this.indexNodes(graph.nodes)
    this.indexEdges(graph.edges)
  }

  /** Every class in the graph, in the order they were parsed. */
  list(): ClassInfo[] {
    return this.classIds.map((id) => this.buildInfo(id)).filter(isNotNull)
  }

  /** Lookup a class by its node id (e.g. "services/post.ts::PostService"). */
  findById(id: string): ClassInfo | null {
    if (!this.methodsByClassId.has(id)) return null
    return this.buildInfo(id)
  }

  /** Lookup the first class whose bare name matches (e.g. "PostService"). */
  findByName(name: string): ClassInfo | null {
    for (const id of this.classIds) {
      const node = this.nodeById.get(id)
      if (node?.name === name) return this.buildInfo(id)
    }
    return null
  }

  /** Classes declared in a given file (relative path as stored in nodes). */
  findByFile(file: string): ClassInfo[] {
    return this.classIds
      .filter((id) => this.nodeById.get(id)?.file === file)
      .map((id) => this.buildInfo(id))
      .filter(isNotNull)
  }

  /** Methods belonging to a class id. Empty array if the class is unknown. */
  methodsOf(classId: string): GraphNode[] {
    return this.methodsByClassId.get(classId) ?? []
  }

  /** Nodes that call the given node (function, method, class, …). */
  callersOf(nodeId: string): GraphNode[] {
    return this.resolveIds(this.callersByNodeId.get(nodeId))
  }

  /** Nodes the given node calls. */
  calleesOf(nodeId: string): GraphNode[] {
    return this.resolveIds(this.calleesByNodeId.get(nodeId))
  }

  /**
   * External callees of a class — nodes that any of its methods call,
   * excluding self-references inside the same class.
   */
  externalDependencies(classId: string): GraphNode[] {
    const methodIds = new Set<string>([classId])
    for (const m of this.methodsOf(classId)) methodIds.add(m.id)

    const seen = new Set<string>()
    const result: GraphNode[] = []
    for (const id of methodIds) {
      for (const targetId of this.calleesByNodeId.get(id) ?? []) {
        if (methodIds.has(targetId)) continue
        if (seen.has(targetId)) continue
        seen.add(targetId)
        const node = this.nodeById.get(targetId)
        if (node) result.push(node)
      }
    }
    return result
  }

  // ---- internals ----

  private indexNodes(nodes: GraphNode[]): void {
    for (const node of nodes) this.nodeById.set(node.id, node)

    for (const node of nodes) {
      if (node.type === 'class') {
        this.classIds.push(node.id)
        this.methodsByClassId.set(node.id, [])
      }
    }

    for (const node of nodes) {
      if (node.type !== 'method') continue
      const classId = methodClassId(node.id)
      if (!classId) continue
      const bucket = this.methodsByClassId.get(classId)
      if (bucket) bucket.push(node)
    }
  }

  private indexEdges(edges: GraphEdge[]): void {
    for (const edge of edges) {
      append(this.callersByNodeId, edge.target, edge.source)
      append(this.calleesByNodeId, edge.source, edge.target)
    }
  }

  private buildInfo(classId: string): ClassInfo | null {
    const node = this.nodeById.get(classId)
    if (!node) return null

    const methods = this.methodsOf(classId)
    const memberIds = new Set<string>([classId])
    for (const m of methods) memberIds.add(m.id)

    const callerSet = new Set<string>()
    const calleeSet = new Set<string>()
    for (const id of memberIds) {
      for (const c of this.callersByNodeId.get(id) ?? []) {
        if (!memberIds.has(c)) callerSet.add(c)
      }
      for (const c of this.calleesByNodeId.get(id) ?? []) {
        if (!memberIds.has(c)) calleeSet.add(c)
      }
    }

    const totalLines =
      node.bodyLines + methods.reduce((sum, m) => sum + m.bodyLines, 0)

    return {
      node,
      methods,
      totalCallers: callerSet.size,
      totalCallees: calleeSet.size,
      totalLines,
    }
  }

  private resolveIds(ids: string[] | undefined): GraphNode[] {
    if (!ids) return []
    const result: GraphNode[] = []
    for (const id of ids) {
      const node = this.nodeById.get(id)
      if (node) result.push(node)
    }
    return result
  }
}

/**
 * Convenience for one-shot use: `inspectClasses(graph).find(...)`.
 * Reuse the returned instance when querying multiple things.
 */
export function inspectClasses(graph: Graph): ClassInspector {
  return new ClassInspector(graph)
}

function methodClassId(methodId: string): string | null {
  // method ids are of the form "<file>::<Class>.<method>"
  const sep = methodId.indexOf('::')
  if (sep < 0) return null
  const file = methodId.slice(0, sep)
  const tail = methodId.slice(sep + 2)
  const dot = tail.indexOf('.')
  if (dot < 0) return null
  return `${file}::${tail.slice(0, dot)}`
}

function append<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue,
): void {
  const existing = map.get(key)
  if (existing) existing.push(value)
  else map.set(key, [value])
}

function isNotNull<T>(x: T | null): x is T {
  return x !== null
}
