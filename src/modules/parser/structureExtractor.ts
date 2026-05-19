import { Node } from 'ts-morph'
import type { GraphEdge, GraphNode } from './core/models'
import { makeNodeId } from './core/models'
import type { SourceFile } from 'ts-morph'
import path from 'node:path'

export function makeFileNode(root: string, sourceFile: SourceFile): GraphNode {
  const file = sourceFile.getFilePath().slice(root.length + 1)
  const statements = sourceFile.getStatements()
  const endLine =
    statements.length > 0
      ? (statements[statements.length - 1]?.getEndLineNumber() ?? 1)
      : 1

  return {
    id: fileNodeId(file),
    name: file.split('/').at(-1) ?? file,
    type: file.startsWith('src/routes/') ? 'route' : 'file',
    file,
    line: 1,
    endLine,
    signature: '',
    isAsync: false,
    isExported: false,
    isStatic: false,
    bodyLines: endLine,
    inDegree: 0,
    outDegree: 0,
  }
}

export function extractStructuralEdges(
  root: string,
  sourceFiles: SourceFile[],
  declarationMap: Map<Node, string>,
  nodes: GraphNode[],
): GraphEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (const sourceFile of sourceFiles) {
    const file = relativePath(root, sourceFile)
    const sourceFileId = fileNodeId(file)

    addOwnershipEdges(edges, seen, sourceFileId, nodes)
    addImportEdges(edges, seen, root, sourceFile, sourceFileId, nodeIds)
    addJsxEdges(edges, seen, sourceFile, sourceFileId, declarationMap)
    addHookEdges(edges, seen, sourceFile, sourceFileId, declarationMap)
    addInstantiationEdges(edges, seen, sourceFile, sourceFileId, declarationMap)
    addInheritanceEdges(edges, seen, sourceFile, declarationMap)
  }

  return edges
}

export function classifyNode(node: GraphNode): GraphNode {
  if (node.type !== 'function' && node.type !== 'arrow') return node

  if (isHookName(node.name)) {
    return { ...node, type: 'hook' }
  }

  if (isComponentName(node.name)) {
    return { ...node, type: 'component' }
  }

  return node
}

function addOwnershipEdges(
  edges: GraphEdge[],
  seen: Set<string>,
  fileId: string,
  nodes: GraphNode[],
): void {
  const file = fileId.slice('file:'.length)

  for (const node of nodes) {
    if (node.id === fileId || node.file !== file) continue

    const ownerId = ownerNodeId(node)
    addEdge(edges, seen, ownerId ?? fileId, node.id, 'owns')
  }
}

function addImportEdges(
  edges: GraphEdge[],
  seen: Set<string>,
  root: string,
  sourceFile: SourceFile,
  sourceFileId: string,
  nodeIds: Set<string>,
): void {
  for (const importDeclaration of sourceFile.getImportDeclarations()) {
    const target = importDeclaration.getModuleSpecifierSourceFile()
    if (!target) continue

    const targetId = fileNodeId(relativePath(root, target))
    if (!nodeIds.has(targetId) || targetId === sourceFileId) continue

    addEdge(edges, seen, sourceFileId, targetId, 'imports')
  }
}

function addJsxEdges(
  edges: GraphEdge[],
  seen: Set<string>,
  sourceFile: SourceFile,
  sourceFileId: string,
  declarationMap: Map<Node, string>,
): void {
  const jsxNodes = [
    ...sourceFile.getDescendants().filter(Node.isJsxOpeningElement),
    ...sourceFile.getDescendants().filter(Node.isJsxSelfClosingElement),
  ]

  for (const jsx of jsxNodes) {
    const targetId = resolveSymbolTargetId(jsx.getTagNameNode(), declarationMap)
    if (targetId) {
      addEdge(
        edges,
        seen,
        resolveSourceId(jsx, declarationMap) ?? sourceFileId,
        targetId,
        'renders',
      )
    }

    for (const attribute of jsx.getAttributes()) {
      if (!Node.isJsxAttribute(attribute)) continue
      const expression = attribute.getInitializer()
      if (!expression) continue

      for (const identifier of expression
        .getDescendants()
        .filter(Node.isIdentifier)) {
        const callbackId = resolveSymbolTargetId(identifier, declarationMap)
        if (!callbackId) continue

        addEdge(
          edges,
          seen,
          resolveSourceId(jsx, declarationMap) ?? sourceFileId,
          callbackId,
          'passes-callback',
        )
      }
    }
  }
}

function addHookEdges(
  edges: GraphEdge[],
  seen: Set<string>,
  sourceFile: SourceFile,
  sourceFileId: string,
  declarationMap: Map<Node, string>,
): void {
  for (const call of sourceFile
    .getDescendants()
    .filter(Node.isCallExpression)) {
    const expression = call.getExpression()
    const name = expression.getText()
    if (!isHookName(name.split('.').at(-1) ?? name)) continue

    const targetId = resolveSymbolTargetId(expression, declarationMap)
    if (!targetId) continue

    addEdge(
      edges,
      seen,
      resolveSourceId(call, declarationMap) ?? sourceFileId,
      targetId,
      'uses-hook',
    )
  }
}

function addInstantiationEdges(
  edges: GraphEdge[],
  seen: Set<string>,
  sourceFile: SourceFile,
  sourceFileId: string,
  declarationMap: Map<Node, string>,
): void {
  for (const expression of sourceFile
    .getDescendants()
    .filter(Node.isNewExpression)) {
    const targetId = resolveSymbolTargetId(
      expression.getExpression(),
      declarationMap,
    )
    if (!targetId) continue

    addEdge(
      edges,
      seen,
      resolveSourceId(expression, declarationMap) ?? sourceFileId,
      targetId,
      'instantiates',
    )
  }
}

function addInheritanceEdges(
  edges: GraphEdge[],
  seen: Set<string>,
  sourceFile: SourceFile,
  declarationMap: Map<Node, string>,
): void {
  for (const cls of sourceFile.getClasses()) {
    const sourceId = declarationMap.get(cls)
    if (!sourceId) continue

    const base = cls.getExtends()
    if (base) {
      const targetId = resolveSymbolTargetId(
        base.getExpression(),
        declarationMap,
      )
      if (targetId) addEdge(edges, seen, sourceId, targetId, 'extends')
    }

    for (const implementation of cls.getImplements()) {
      const targetId = resolveSymbolTargetId(
        implementation.getExpression(),
        declarationMap,
      )
      if (targetId) addEdge(edges, seen, sourceId, targetId, 'implements')
    }
  }
}

function resolveSymbolTargetId(
  node: Node,
  declarationMap: Map<Node, string>,
): string | undefined {
  const symbol = node.getSymbol()
  if (!symbol) return undefined

  const candidates = [symbol]
  const aliased = symbol.getAliasedSymbol()
  if (aliased) candidates.push(aliased)

  for (const candidate of candidates) {
    for (const declaration of candidate.getDeclarations()) {
      const id = declarationMap.get(declaration)
      if (id) return id
    }
  }

  return undefined
}

function resolveSourceId(
  node: Node,
  declarationMap: Map<Node, string>,
): string | undefined {
  let current = node.getParent()
  while (current) {
    if (
      Node.isFunctionDeclaration(current) ||
      Node.isMethodDeclaration(current) ||
      Node.isConstructorDeclaration(current) ||
      Node.isGetAccessorDeclaration(current) ||
      Node.isSetAccessorDeclaration(current)
    ) {
      return declarationMap.get(current)
    }

    if (Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
      const parent = current.getParent()
      if (
        Node.isVariableDeclaration(parent) ||
        Node.isPropertyDeclaration(parent) ||
        Node.isPropertyAssignment(parent)
      ) {
        return declarationMap.get(parent)
      }
      return undefined
    }

    current = current.getParent()
  }
  return undefined
}

function ownerNodeId(node: GraphNode): string | null {
  const separator = node.id.indexOf('::')
  if (separator < 0) return null

  const file = node.id.slice(0, separator)
  const name = node.id.slice(separator + 2)
  const dot = name.indexOf('.')
  if (dot < 0) return null

  return makeNodeId(file, name.slice(0, dot))
}

function addEdge(
  edges: GraphEdge[],
  seen: Set<string>,
  source: string,
  target: string,
  type: GraphEdge['type'],
): void {
  if (source === target) return

  const key = `${source}->${target}:${type}`
  if (seen.has(key)) return

  seen.add(key)
  edges.push({ source, target, type })
}

function fileNodeId(file: string): string {
  return `file:${file}`
}

function relativePath(root: string, sourceFile: SourceFile): string {
  return path.relative(root, sourceFile.getFilePath())
}

function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name)
}

function isHookName(name: string): boolean {
  return /^use[A-Z0-9]/.test(name)
}
