import { Node } from 'ts-morph'
import type {
  ClassDeclaration,
  ClassExpression,
  ParameterDeclaration,
  SourceFile,
} from 'ts-morph'

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

    collected.push(...extractClassBody(cls, className, relativeFilePath))
  }

  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer()
    if (!initializer || !Node.isClassExpression(initializer)) continue

    const name = variable.getName()
    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, name),
        name,
        type: 'class',
        file: relativeFilePath,
        line: variable.getStartLineNumber(),
        signature: '',
        isAsync: false,
        isExported: variable.getVariableStatement()?.isExported() ?? false,
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

    collected.push(...extractClassBody(initializer, name, relativeFilePath))
  }

  return collected
}

function extractClassBody(
  cls: ClassDeclaration | ClassExpression,
  className: string,
  relativeFilePath: string,
): CollectedNode[] {
  const collected: CollectedNode[] = []

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

  for (const ctor of cls.getConstructors()) {
    if (ctor.isOverload()) continue
    const qualifiedName = `${className}.constructor`

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, qualifiedName),
        name: 'constructor',
        type: 'constructor',
        file: relativeFilePath,
        line: ctor.getStartLineNumber(),
        signature: buildSignature(ctor.getParameters()),
        isAsync: false,
        isExported: false,
        isStatic: false,
        bodyLines: spanLines(
          ctor.getStartLineNumber(),
          ctor.getEndLineNumber(),
        ),
        inDegree: 0,
        outDegree: 0,
      },
      declaration: ctor,
    })
  }

  for (const getter of cls.getGetAccessors()) {
    const qualifiedName = `${className}.get:${getter.getName()}`

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, qualifiedName),
        name: getter.getName(),
        type: 'getter',
        file: relativeFilePath,
        line: getter.getStartLineNumber(),
        signature: '()',
        isAsync: false,
        isExported: false,
        isStatic: getter.isStatic(),
        bodyLines: spanLines(
          getter.getStartLineNumber(),
          getter.getEndLineNumber(),
        ),
        inDegree: 0,
        outDegree: 0,
      },
      declaration: getter,
    })
  }

  for (const setter of cls.getSetAccessors()) {
    const qualifiedName = `${className}.set:${setter.getName()}`

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, qualifiedName),
        name: setter.getName(),
        type: 'setter',
        file: relativeFilePath,
        line: setter.getStartLineNumber(),
        signature: buildSignature(setter.getParameters()),
        isAsync: false,
        isExported: false,
        isStatic: setter.isStatic(),
        bodyLines: spanLines(
          setter.getStartLineNumber(),
          setter.getEndLineNumber(),
        ),
        inDegree: 0,
        outDegree: 0,
      },
      declaration: setter,
    })
  }

  for (const prop of cls.getProperties()) {
    const initializer = prop.getInitializer()
    if (!initializer) continue
    if (
      !Node.isArrowFunction(initializer) &&
      !Node.isFunctionExpression(initializer)
    )
      continue

    const propName = prop.getName()
    const qualifiedName = `${className}.${propName}`

    collected.push({
      graphNode: {
        id: makeNodeId(relativeFilePath, qualifiedName),
        name: propName,
        type: Node.isArrowFunction(initializer) ? 'arrow' : 'method',
        file: relativeFilePath,
        line: prop.getStartLineNumber(),
        signature: buildSignature(initializer.getParameters()),
        isAsync: initializer.isAsync(),
        isExported: false,
        isStatic: prop.isStatic(),
        bodyLines: spanLines(
          initializer.getStartLineNumber(),
          initializer.getEndLineNumber(),
        ),
        inDegree: 0,
        outDegree: 0,
      },
      declaration: prop,
    })
  }

  return collected
}

function buildSignature(params: ParameterDeclaration[]): string {
  return `(${params.map((p) => p.getName()).join(', ')})`
}

function spanLines(start: number, end: number): number {
  return Math.max(1, end - start + 1)
}
