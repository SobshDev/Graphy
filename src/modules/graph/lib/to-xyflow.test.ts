import { describe, expect, it } from 'vitest'

import type { Graph, GraphNode } from '@/modules/parser'
import { toXYFlow } from '@/modules/graph/lib/to-xyflow'

describe('toXYFlow', () => {
  it('summarizes noisy detail without losing cross-boundary edges', async () => {
    const graph = makeGraph()

    const result = await toXYFlow(graph)

    expect(result.nodes.map((node) => node.id).sort()).toEqual([
      'api/userController.ts::registerUser',
      'db/database.ts::Database.saveUser',
      'index.ts::seedDemo',
      'section:index.ts::seedDemo',
      'services/userService.ts::UserService.create',
      'summary:isolated:utils/format.ts',
      'summary:src/shared/ui',
    ])
    expect(
      result.edges.map((edge) => `${edge.source}->${edge.target}`),
    ).toEqual(
      expect.arrayContaining([
        'api/userController.ts::registerUser->summary:src/shared/ui',
      ]),
    )
    expect(new Set(result.edges.map((edge) => edge.id)).size).toBe(
      result.edges.length,
    )
  })

  it('places connected nodes inside an entry section', async () => {
    const result = await toXYFlow(makeGraph())
    const section = result.nodes.find(
      (node) => node.id === 'section:index.ts::seedDemo',
    )
    const sectionChildren = result.nodes.filter(
      (node) => node.parentId === section?.id,
    )

    expect(section?.type).toBe('section')
    expect(sectionChildren.length).toBeGreaterThan(0)
    expect(
      sectionChildren.every(
        (node) => node.position.x >= 0 && node.position.y >= 0,
      ),
    ).toBe(true)
  })

  it('assigns finite numeric positions', async () => {
    const result = await toXYFlow(makeGraph())

    for (const node of result.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    }
  })

  it('expands summarized groups on request', async () => {
    const result = await toXYFlow(makeGraph(), {
      expandedGroups: ['summary:src/shared/ui'],
    })

    expect(result.nodes.map((node) => node.id)).toContain(
      'src/shared/ui/button.tsx::Button',
    )
    expect(result.nodes.map((node) => node.id)).not.toContain(
      'summary:src/shared/ui',
    )
  })

  it('places direct callees to the right of their callers', async () => {
    const result = await toXYFlow(makeGraph())
    const byId = new Map(result.nodes.map((node) => [node.id, node]))
    const caller = byId.get('api/userController.ts::registerUser')
    const callee = byId.get('services/userService.ts::UserService.create')

    expect(caller).toBeDefined()
    expect(callee).toBeDefined()
    expect(callee?.position.x).toBeGreaterThan(caller?.position.x ?? Infinity)
  })

  it('centers source-only entry nodes against their outgoing flow', async () => {
    const result = await toXYFlow(makeGraph())
    const byId = new Map(result.nodes.map((node) => [node.id, node]))
    const entry = byId.get('index.ts::seedDemo')
    const firstTarget = byId.get('api/userController.ts::registerUser')
    const secondTarget = byId.get('db/database.ts::Database.saveUser')

    expect(entry).toBeDefined()
    expect(firstTarget).toBeDefined()
    expect(secondTarget).toBeDefined()

    const entryCenter = (entry?.position.y ?? 0) + 27
    const targetMedian =
      ((firstTarget?.position.y ?? 0) + (secondTarget?.position.y ?? 0)) / 2 +
      27

    expect(Math.abs(entryCenter - targetMedian)).toBeLessThan(1)
  })

  it('keeps nodes in the same column from overlapping', async () => {
    const result = await toXYFlow(makeGraph())
    const columns = new Map<number, typeof result.nodes>()

    for (const node of result.nodes) {
      const columnKey = Math.round(node.position.x / 8) * 8
      const columnNodes = columns.get(columnKey) ?? []
      columnNodes.push(node)
      columns.set(columnKey, columnNodes)
    }

    for (const columnNodes of columns.values()) {
      const sortedNodes = [...columnNodes].sort(
        (a, b) => a.position.y - b.position.y,
      )

      for (let index = 1; index < sortedNodes.length; index += 1) {
        const previous = sortedNodes[index - 1]
        const current = sortedNodes[index]

        expect(current.position.y - previous.position.y).toBeGreaterThanOrEqual(
          54,
        )
      }
    }
  })

  it('keeps disconnected nodes separated from the main flow', async () => {
    const result = await toXYFlow(makeGraph())
    const connectedNodes = result.nodes.filter(
      (node) => node.id !== 'summary:isolated:utils/format.ts',
    )
    const unusedNode = result.nodes.find(
      (node) => node.id === 'summary:isolated:utils/format.ts',
    )
    const connectedBottom = Math.max(
      ...connectedNodes.map((node) => node.position.y),
    )

    expect(unusedNode).toBeDefined()
    expect(unusedNode?.position.y).toBeGreaterThan(connectedBottom + 200)
  })

  it('handles empty graphs', async () => {
    const result = await toXYFlow({
      version: '1',
      language: 'typescript',
      root: '/tmp/project',
      nodes: [],
      edges: [],
    })

    expect(result).toEqual({ nodes: [], edges: [] })
  })
})

function makeGraph(): Graph {
  return {
    version: '1',
    language: 'typescript',
    root: '/tmp/project',
    nodes: [
      makeNode({
        id: 'index.ts::seedDemo',
        name: 'seedDemo',
        file: 'index.ts',
        line: 4,
        outDegree: 2,
      }),
      makeNode({
        id: 'api/userController.ts::registerUser',
        name: 'registerUser',
        file: 'api/userController.ts',
        line: 4,
        inDegree: 1,
        outDegree: 1,
      }),
      makeNode({
        id: 'services/userService.ts::UserService.create',
        name: 'UserService.create',
        type: 'method',
        file: 'services/userService.ts',
        line: 7,
        inDegree: 1,
        outDegree: 1,
      }),
      makeNode({
        id: 'db/database.ts::Database.saveUser',
        name: 'Database.saveUser',
        type: 'method',
        file: 'db/database.ts',
        line: 8,
        inDegree: 2,
      }),
      makeNode({
        id: 'utils/format.ts::slugify',
        name: 'slugify',
        file: 'utils/format.ts',
        line: 1,
      }),
      makeNode({
        id: 'src/shared/ui/button.tsx::Button',
        name: 'Button',
        file: 'src/shared/ui/button.tsx',
        line: 4,
        inDegree: 1,
      }),
    ],
    edges: [
      {
        source: 'index.ts::seedDemo',
        target: 'api/userController.ts::registerUser',
        type: 'calls',
      },
      {
        source: 'index.ts::seedDemo',
        target: 'db/database.ts::Database.saveUser',
        type: 'calls',
      },
      {
        source: 'api/userController.ts::registerUser',
        target: 'services/userService.ts::UserService.create',
        type: 'calls',
      },
      {
        source: 'services/userService.ts::UserService.create',
        target: 'db/database.ts::Database.saveUser',
        type: 'calls',
      },
      {
        source: 'api/userController.ts::registerUser',
        target: 'src/shared/ui/button.tsx::Button',
        type: 'calls',
      },
    ],
  }
}

function makeNode(node: Partial<GraphNode> & Pick<GraphNode, 'id' | 'name'>) {
  return {
    type: 'function',
    file: 'index.ts',
    line: 1,
    endLine: 1,
    signature: '()',
    isAsync: false,
    isExported: true,
    isStatic: false,
    bodyLines: 1,
    inDegree: 0,
    outDegree: 0,
    ...node,
  } satisfies GraphNode
}
