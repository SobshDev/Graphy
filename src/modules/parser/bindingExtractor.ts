import { Node, SyntaxKind } from 'ts-morph'
import type {
  ObjectLiteralExpression,
  SourceFile,
  VariableDeclaration,
} from 'ts-morph'

import type { CollectedNode } from './core/models'
import { makeNodeId } from './core/models'

export function extractBindings(
  sourceFile: SourceFile,
  relativeFilePath: string,
): CollectedNode[] {
  const collected: CollectedNode[] = []

  for (const variable of sourceFile.getVariableDeclarations()) {
    if (!isTopLevel(variable)) continue

    const nameNode = variable.getNameNode()
    if (!Node.isIdentifier(nameNode)) continue

    const initializer = variable.getInitializer()
    if (!initializer) continue
    if (isCoveredByFunctionExtractor(initializer)) continue
    if (isCoveredByObjectExtractor(initializer)) continue
    if (isPureLiteral(initializer)) continue

    const statement = variable.getVariableStatement()
    const startLine =
      statement?.getStartLineNumber() ?? variable.getStartLineNumber()
    const endLine =
      statement?.getEndLineNumber() ?? initializer.getEndLineNumber()
    const name = variable.getName()

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, name),
        name,
        type: 'object',
        file: relativeFilePath,
        line: startLine,
        endLine,
        signature: '',
        isAsync: false,
        isExported: statement?.isExported() ?? false,
        isStatic: false,
        bodyLines: spanLines(
          initializer.getStartLineNumber(),
          initializer.getEndLineNumber(),
        ),
        inDegree: 0,
        outDegree: 0,
      },
      declaration: variable,
    })
  }

  return collected
}

function isTopLevel(variable: VariableDeclaration): boolean {
  const statement = variable.getVariableStatement()
  if (!statement) return false
  return statement.getParent().getKind() === SyntaxKind.SourceFile
}

function isCoveredByFunctionExtractor(initializer: Node): boolean {
  return (
    Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)
  )
}

function isCoveredByObjectExtractor(initializer: Node): boolean {
  if (!Node.isObjectLiteralExpression(initializer)) return false
  return hasMethodLikeMember(initializer)
}

function hasMethodLikeMember(obj: ObjectLiteralExpression): boolean {
  for (const prop of obj.getProperties()) {
    if (
      Node.isMethodDeclaration(prop) ||
      Node.isGetAccessorDeclaration(prop) ||
      Node.isSetAccessorDeclaration(prop)
    ) {
      return true
    }
    if (Node.isPropertyAssignment(prop)) {
      const init = prop.getInitializer()
      if (
        init &&
        (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
      ) {
        return true
      }
    }
  }
  return false
}

function isPureLiteral(node: Node): boolean {
  const kind = node.getKind()
  return (
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.NumericLiteral ||
    kind === SyntaxKind.BigIntLiteral ||
    kind === SyntaxKind.NoSubstitutionTemplateLiteral ||
    kind === SyntaxKind.RegularExpressionLiteral ||
    kind === SyntaxKind.TrueKeyword ||
    kind === SyntaxKind.FalseKeyword ||
    kind === SyntaxKind.NullKeyword
  )
}

function spanLines(start: number, end: number): number {
  return Math.max(1, end - start + 1)
}
