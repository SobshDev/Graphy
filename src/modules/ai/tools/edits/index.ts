import type { AiTool } from '../tools.interface'
import { createApplyEditTool } from './apply-edit.tool'
import { createRenameSymbolTool } from './rename-symbol.tool'
import { createReparseProjectTool } from './reparse-project.tool'

export function createEditsTools(): AiTool[] {
  return [
    createApplyEditTool(),
    createRenameSymbolTool(),
    createReparseProjectTool(),
  ]
}
