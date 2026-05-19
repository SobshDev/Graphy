import type { AiTool } from '../tools.interface'
import { createRunCommandTool } from './run-command.tool'

export function createShellTools(): AiTool[] {
  return [createRunCommandTool()]
}
