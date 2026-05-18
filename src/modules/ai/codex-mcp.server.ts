import { createServer } from 'node:http'
import type { Server as HttpServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { AiToolCall, AiToolDefinition, AiToolResult } from './ai.interface'

export interface GraphyMcpServer {
  /** Base URL the MCP client connects to (e.g. "http://127.0.0.1:54321/mcp"). */
  url: string
  /** Shut down the server and close all sessions. */
  close: () => Promise<void>
}

function stringifyResult(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Start an MCP server that exposes `tools` as MCP tools. Each call invokes the
 * tool's `execute` function. `onCall` is invoked after each call with the
 * call/result pair, so the caller can record them on AiChatResult.toolCalls.
 *
 * Streamable HTTP transport. Binds 127.0.0.1:0 (kernel-assigned free port).
 */
export async function createGraphyMcpServer(
  tools: Array<AiToolDefinition<any, any>>,
  onCall?: (call: AiToolCall, result: AiToolResult) => void,
): Promise<GraphyMcpServer> {
  const server = new McpServer({
    name: 'graphy',
    version: '0.1.0',
  })

  // registerTool's inputSchema expects a Zod schema (ZodRawShapeCompat |
  // AnySchema). We store plain JSON Schema objects in AiToolDefinition, so we
  // escape the generic constraint by casting the method to an any-accepting
  // overload. This is a deliberate bridge between our types and MCP's types.
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: { description?: string; inputSchema?: object },
    cb: (args: any) => Promise<unknown>,
  ) => void

  for (const tool of tools) {
    registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: unknown) => {
        const callId = randomUUID()
        const call: AiToolCall = {
          id: callId,
          name: tool.name,
          args,
        }
        try {
          // signal is not forwarded: MCP handlers have no native signal API.
          const value = await tool.execute(args, { signal: undefined })
          const result: AiToolResult = {
            id: callId,
            name: tool.name,
            content: stringifyResult(value),
            isError: false,
          }
          onCall?.(call, result)
          return {
            content: [{ type: 'text' as const, text: result.content }],
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const result: AiToolResult = {
            id: callId,
            name: tool.name,
            content: message,
            isError: true,
          }
          onCall?.(call, result)
          return {
            isError: true,
            content: [{ type: 'text' as const, text: message }],
          }
        }
      },
    )
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  })
  await server.connect(transport)

  const httpServer: HttpServer = createServer((req, res) => {
    if (!req.url?.startsWith('/mcp')) {
      res.statusCode = 404
      res.end()
      return
    }
    transport.handleRequest(req, res).catch((err) => {
      console.error('[graphy mcp] request error:', err)
      if (!res.headersSent) res.statusCode = 500
      res.end()
    })
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen({ host: '127.0.0.1', port: 0 }, () => resolve())
  })
  const addr = httpServer.address() as AddressInfo
  const url = `http://127.0.0.1:${addr.port}/mcp`

  return {
    url,
    close: async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
      await server.close()
    },
  }
}
