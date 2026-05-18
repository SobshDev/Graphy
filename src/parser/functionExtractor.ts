import type { SourceFile } from "ts-morph";
import type { GraphNode } from "./core/models";
import { makeNodeId } from "./core/models";

export function extractFunctions(
    sourceFile: SourceFile,
    relativeFilePath: string,
): GraphNode[] {
    const nodes: GraphNode[] = [];

    for (const fn of sourceFile.getFunctions()) {
        const name = fn.getName();
        if (!name) continue; // anonymous functions
    
        nodes.push({
            id: makeNodeId(relativeFilePath, name),
            name,
            type: "function",
            file: relativeFilePath,
            line: fn.getStartLineNumber(),
            signature: buildSignature(fn),
        });
    }

    function buildSignature(fn: { getParameters(): { getName(): string }[] }): string {
        const params = fn.getParameters().map((p) => p.getName());

        return `(${params.join(", ")})`;
    }

    return nodes;
}