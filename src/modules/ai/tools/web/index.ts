import type { AiTool } from '../tools.interface'
import { createWebFetchTool } from './web-fetch.tool'

export function createWebTools(): AiTool[] {
  return [createWebFetchTool()]
}
