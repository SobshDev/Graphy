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
