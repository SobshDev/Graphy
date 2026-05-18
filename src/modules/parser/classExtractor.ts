import type { ParameterDeclaration, SourceFile } from 'ts-morph'

import type { CollectedNode } from './core/models'
import { makeNodeId } from './core/models'

export function extractClasses(
  sourceFile: SourceFile,
  relativeFilePath: string,
): CollectedNode[] {
  const collected: CollectedNode[] = []

  for (const cls of sourceFile.getClasses()) {
    const className = cls.getName()
    if (!className) continue

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, className),
        name: className,
        type: 'class',
        file: relativeFilePath,
        line: cls.getStartLineNumber(),
        signature: '',
        isAsync: false,
        isExported: cls.isExported(),
        isStatic: false,
        bodyLines: spanLines(cls.getStartLineNumber(), cls.getEndLineNumber()),
        inDegree: 0,
        outDegree: 0,
      },
      declaration: cls,
    })

    for (const method of cls.getMethods()) {
      if (method.isOverload()) continue
      const methodName = method.getName()
      const qualifiedName = `${className}.${methodName}`

      collected.push({
        graphNode: {
          id: makeNodeId(relativeFilePath, qualifiedName),
          name: methodName,
          type: 'method',
          file: relativeFilePath,
          line: method.getStartLineNumber(),
          signature: buildSignature(method.getParameters()),
          isAsync: method.isAsync(),
          isExported: false,
          isStatic: method.isStatic(),
          bodyLines: spanLines(
            method.getStartLineNumber(),
            method.getEndLineNumber(),
          ),
          inDegree: 0,
          outDegree: 0,
        },
        declaration: method,
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
