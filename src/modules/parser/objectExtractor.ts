import { Node } from 'ts-morph'
import type {
  ObjectLiteralExpression,
  ParameterDeclaration,
  SourceFile,
} from 'ts-morph'

import type { CollectedNode } from './core/models'
import { makeNodeId } from './core/models'

export function extractObjects(
  sourceFile: SourceFile,
  relativeFilePath: string,
): CollectedNode[] {
  const collected: CollectedNode[] = []

  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer()
    if (!initializer || !Node.isObjectLiteralExpression(initializer)) continue

    const members = extractObjectBody(
      initializer,
      variable.getName(),
      relativeFilePath,
    )
    if (members.length === 0) continue

    const statement = variable.getVariableStatement()
    const startLine =
      statement?.getStartLineNumber() ?? variable.getStartLineNumber()
    const endLine =
      statement?.getEndLineNumber() ?? initializer.getEndLineNumber()

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, variable.getName()),
        name: variable.getName(),
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

    collected.push(...members)
  }

  return collected
}

function extractObjectBody(
  obj: ObjectLiteralExpression,
  objectName: string,
  relativeFilePath: string,
): CollectedNode[] {
  const collected: CollectedNode[] = []

  for (const prop of obj.getProperties()) {
    if (Node.isMethodDeclaration(prop)) {
      const methodName = prop.getName()
      const qualifiedName = `${objectName}.${methodName}`

      collected.push({
        graphNode: {
          id: makeNodeId(relativeFilePath, qualifiedName),
          name: methodName,
          type: 'method',
          file: relativeFilePath,
          line: prop.getStartLineNumber(),
          endLine: prop.getEndLineNumber(),
          signature: buildSignature(prop.getParameters()),
          isAsync: prop.isAsync(),
          isExported: false,
          isStatic: false,
          bodyLines: spanLines(
            prop.getStartLineNumber(),
            prop.getEndLineNumber(),
          ),
          inDegree: 0,
          outDegree: 0,
        },
        declaration: prop,
      })
    } else if (Node.isPropertyAssignment(prop)) {
      const init = prop.getInitializer()
      if (!init) continue
      if (!Node.isArrowFunction(init) && !Node.isFunctionExpression(init))
        continue

      const propName = prop.getName()
      const qualifiedName = `${objectName}.${propName}`

      collected.push({
        graphNode: {
          id: makeNodeId(relativeFilePath, qualifiedName),
          name: propName,
          type: Node.isArrowFunction(init) ? 'arrow' : 'method',
          file: relativeFilePath,
          line: prop.getStartLineNumber(),
          endLine: init.getEndLineNumber(),
          signature: buildSignature(init.getParameters()),
          isAsync: init.isAsync(),
          isExported: false,
          isStatic: false,
          bodyLines: spanLines(
            init.getStartLineNumber(),
            init.getEndLineNumber(),
          ),
          inDegree: 0,
          outDegree: 0,
        },
        declaration: prop,
      })
    } else if (Node.isGetAccessorDeclaration(prop)) {
      const qualifiedName = `${objectName}.get:${prop.getName()}`

      collected.push({
        graphNode: {
          id: makeNodeId(relativeFilePath, qualifiedName),
          name: prop.getName(),
          type: 'getter',
          file: relativeFilePath,
          line: prop.getStartLineNumber(),
          endLine: prop.getEndLineNumber(),
          signature: '()',
          isAsync: false,
          isExported: false,
          isStatic: false,
          bodyLines: spanLines(
            prop.getStartLineNumber(),
            prop.getEndLineNumber(),
          ),
          inDegree: 0,
          outDegree: 0,
        },
        declaration: prop,
      })
    } else if (Node.isSetAccessorDeclaration(prop)) {
      const qualifiedName = `${objectName}.set:${prop.getName()}`

      collected.push({
        graphNode: {
          id: makeNodeId(relativeFilePath, qualifiedName),
          name: prop.getName(),
          type: 'setter',
          file: relativeFilePath,
          line: prop.getStartLineNumber(),
          endLine: prop.getEndLineNumber(),
          signature: buildSignature(prop.getParameters()),
          isAsync: false,
          isExported: false,
          isStatic: false,
          bodyLines: spanLines(
            prop.getStartLineNumber(),
            prop.getEndLineNumber(),
          ),
          inDegree: 0,
          outDegree: 0,
        },
        declaration: prop,
      })
    }
  }

  return collected
}

function buildSignature(params: ParameterDeclaration[]): string {
  return `(${params.map((p) => p.getName()).join(', ')})`
}

function spanLines(start: number, end: number): number {
  return Math.max(1, end - start + 1)
}
