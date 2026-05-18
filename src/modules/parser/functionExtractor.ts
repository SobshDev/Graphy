import { Node } from 'ts-morph'
import type {
  ArrowFunction,
  FunctionExpression,
  ParameterDeclaration,
  SourceFile,
  VariableDeclaration,
} from 'ts-morph'

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
        endLine: fn.getEndLineNumber(),
        signature: buildSignature(fn.getParameters()),
        isAsync: fn.isAsync(),
        isExported: fn.isExported(),
        isStatic: false,
        bodyLines: spanLines(fn.getStartLineNumber(), fn.getEndLineNumber()),
        inDegree: 0,
        outDegree: 0,
      },
      declaration: fn,
    })
  }

  // arrow / function-expression assigned to a variable
  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer()
    if (!initializer) continue
    if (
      !Node.isArrowFunction(initializer) &&
      !Node.isFunctionExpression(initializer)
    )
      continue

    collected.push({
      graphNode: buildArrowOrFnExprNode(
        variable,
        initializer,
        relativeFilePath,
      ),
      declaration: variable,
    })
  }

  return collected
}

function buildArrowOrFnExprNode(
  variable: VariableDeclaration,
  initializer: ArrowFunction | FunctionExpression,
  relativeFilePath: string,
): CollectedNode['graphNode'] {
  const name = variable.getName()
  const statement = variable.getVariableStatement()
  const startLine =
    statement?.getStartLineNumber() ?? variable.getStartLineNumber()
  const endLine =
    statement?.getEndLineNumber() ?? initializer.getEndLineNumber()
  return {
    id: makeNodeId(relativeFilePath, name),
    name,
    type: Node.isArrowFunction(initializer) ? 'arrow' : 'function',
    file: relativeFilePath,
    line: startLine,
    endLine,
    signature: buildSignature(initializer.getParameters()),
    isAsync: initializer.isAsync(),
    isExported: statement?.isExported() ?? false,
    isStatic: false,
    bodyLines: spanLines(
      initializer.getStartLineNumber(),
      initializer.getEndLineNumber(),
    ),
    inDegree: 0,
    outDegree: 0,
  }
}

function buildSignature(params: ParameterDeclaration[]): string {
  return `(${params.map((p) => p.getName()).join(', ')})`
}

function spanLines(start: number, end: number): number {
  return Math.max(1, end - start + 1)
}
