import type { NodeSummaryTarget } from '../types'

export const MOCK_SUMMARY_TARGET: NodeSummaryTarget = {
  displayName: 'useGraph',
  type: 'hook',
  signature: '(): { graph, folder, loading, error, layout }',
  file: 'src/modules/graph/hooks/use-graph.ts',
  line: 18,
  facts: {
    isAsync: false,
    isExported: true,
    bodyLines: 64,
    inDegree: 3,
    outDegree: 5,
  },
  overview: [
    'Central hook that exposes the parsed project graph to the canvas. It subscribes to the active folder, requests an indexing pass from the desktop parser, and returns the resulting graph along with loading and error state.',
    'Most graph-rendering components consume this hook directly rather than maintaining their own copy of the graph. Layout is read from the cached .graphy/ directory when available and recomputed otherwise.',
  ],
  callers: [
    {
      id: 'graph-canvas',
      displayName: 'GraphCanvas',
      type: 'component',
      file: 'src/modules/graph/components/graph-canvas.tsx',
      line: 27,
    },
    {
      id: 'graph-legend',
      displayName: 'GraphLegend',
      type: 'component',
      file: 'src/modules/graph/components/graph-legend.tsx',
      line: 14,
    },
    {
      id: 'use-graph-stats',
      displayName: 'useGraphStats',
      type: 'hook',
      file: 'src/modules/graph/hooks/use-graph-stats.ts',
      line: 9,
    },
  ],
  callees: [
    {
      id: 'use-project',
      displayName: 'useProject',
      type: 'hook',
      file: 'src/modules/graph/hooks/use-project.ts',
      line: 22,
    },
    {
      id: 'get-desktop',
      displayName: 'getDesktop',
      type: 'function',
      file: 'src/shared/lib/desktop.ts',
      line: 5,
    },
    {
      id: 'parse-project',
      displayName: 'parseProject',
      type: 'function',
      file: 'src/modules/parser/index.ts',
      line: 84,
    },
    {
      id: 'validate-graph',
      displayName: 'validateGraph',
      type: 'function',
      file: 'src/modules/parser/core/schema.ts',
      line: 41,
    },
  ],
}
