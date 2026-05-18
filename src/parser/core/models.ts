// Différentes formes de fonction TS 
// E.g: const add = (a: number, b: number) => a + b;
// Différent de :
// function add(a: number, b: number) { }...

export type NodeType = "function" | "method" | "arrow" | "class";

export type EdgeType = "calls" | "inherits" | "imports";

export interface GraphNode {
    id:         string;
    name:       string;
    type:       NodeType;
    file:       string;
    line:       number;
    signature:  string;
}

export interface GraphEdge {
    source:     string;
    target:     string;
    type:       EdgeType;
}

export interface Graph {
    version:    string;
    language:   "typescript";
    root:       string;
    nodes:      GraphNode[];
    edges:      GraphEdge[];
}

export function makeNodeId(file: string, qualifiedName: string): string {
    return `${file}::${qualifiedName}`;
}