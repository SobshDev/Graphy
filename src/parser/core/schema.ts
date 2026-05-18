import type { Graph } from "./models.ts"

export const SCHEMA_VERSION = "1.0";

export function serializeGraph(graph: Graph, pretty = true): string {
    return JSON.stringify(graph, null, pretty ? 2 : 0);
}

export function validateGraph(graph: Graph): void {
    if (graph.version !== SCHEMA_VERSION) {
        throw new Error(`[!] Schema version mismatch: expected
            ${SCHEMA_VERSION}, got ${graph.version}`);
    }

    const nodeId = new Set(graph.nodes.map((n) => n.id));

    const dupes = graph.nodes.length - nodeId.size;
    if(dupes > 0) {
        throw new Error(`[!] Found ${dupes} duplicate node id(s)`);
    }

    for (const edge of graph.edges) {
        if(!nodeId.has(edge.source)) {
            throw new Error(`[!] Edge source not found in nodes: ${edge.source}`);
        }
        if(!nodeId.has(edge.target)) {
            throw new Error(`[!] Edge target not found in nodes: ${edge.target}`);
        }
    }
}