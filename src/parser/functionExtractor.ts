import { Node } from 'ts-morph'
import type { ParameterDeclaration, SourceFile } from 'ts-morph'
import type { GraphNode } from './core/models'
import { makeNodeId } from './core/models'

export function extractFunctions(
  sourceFile: SourceFile,
  relativeFilePath: string,
): GraphNode[] {
  const nodes: GraphNode[] = []

  // classic function
  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName()
    if (!name) continue

    nodes.push({
      id: makeNodeId(relativeFilePath, name),
      name,
      type: 'function',
      file: relativeFilePath,
      line: fn.getStartLineNumber(),
      signature: buildSignature(fn.getParameters()),
    })
  }

  // arrow functions case
  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer()
    if (!initializer) continue
    if (
      !Node.isArrowFunction(initializer) &&
      !Node.isFunctionExpression(initializer)
    )
      continue

    const name = variable.getName()
    nodes.push({
      id: makeNodeId(relativeFilePath, name),
      name,
      type: Node.isArrowFunction(initializer) ? 'arrow' : 'function',
      file: relativeFilePath,
      line: variable.getStartLineNumber(),
      signature: buildSignature(initializer.getParameters()),
    })
  }

  return nodes
}

function buildSignature(params: ParameterDeclaration[]): string {
  return `(${params.map((p) => p.getName()).join(', ')})`
}
