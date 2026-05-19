import type { AiTool } from '../tools.interface'
import { createRunScriptTool } from './run-script.tool'

export function createShellTools(): AiTool[] {
  return [createRunScriptTool()]
}
