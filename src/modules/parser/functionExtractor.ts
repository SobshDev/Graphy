import { Node } from 'ts-morph'
import type { ParameterDeclaration, SourceFile } from 'ts-morph'

import type { CollectedNode } from './core/models'
import { makeNodeId } from './core/models'

export function extractFunctions(
  sourceFile: SourceFile,
  relativeFilePath: string,
): CollectedNode[] {
  const collected: CollectedNode[] = []

  // classic function
  for (const fn of sourceFile.getFunctions()) {
    if (fn.isOverload()) continue
    const name = fn.getName()
    if (!name) continue

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, name),
        name,
        type: 'function',
        file: relativeFilePath,
        line: fn.getStartLineNumber(),
        signature: buildSignature(fn.getParameters()),
      },
      declaration: fn,
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
    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, name),
        name,
        type: Node.isArrowFunction(initializer) ? 'arrow' : 'function',
        file: relativeFilePath,
        line: variable.getStartLineNumber(),
        signature: buildSignature(initializer.getParameters()),
      },
      declaration: variable,
    })
  }

  return collected
}

function buildSignature(params: ParameterDeclaration[]): string {
  return `(${params.map((p) => p.getName()).join(', ')})`
}
