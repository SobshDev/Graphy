import type { ParameterDeclaration, SourceFile } from "ts-morph";
import type { GraphNode } from "./core/models";
import { makeNodeId } from "./core/models";

export function extractClasses(
    sourceFile: SourceFile,
    relativeFilePath: string,
): GraphNode[] {
    const nodes: GraphNode[] = [];

    for (const cls of sourceFile.getClasses()) {
        const className = cls.getName();
        if (!className) continue;

        nodes.push({
            id: makeNodeId(relativeFilePath, className),
            name: className,
            type: "class",
            file: relativeFilePath,
            line: cls.getStartLineNumber(),
            signature: "",
        });

        for (const method of cls.getMethods()) {
            const methodName = method.getName();
            const qualifiedName = `${className}.${methodName}`;

            nodes.push({
                id: makeNodeId(relativeFilePath, qualifiedName),
                name: methodName,
                type: "method",
                file: relativeFilePath,
                line: method.getStartLineNumber(),
                signature: buildSignature(method.getParameters()),
            });
        }
    }

    return nodes;
}

function buildSignature(params: ParameterDeclaration[]): string {
    return `(${params.map((p) => p.getName()).join(", ")})`;
}
