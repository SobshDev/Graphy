import type { AiTool } from '../tools.interface'
import { createCurrentOpenNodeTool } from './current-open-node.tool'
import { createFocusNodeTool } from './focus-node.tool'
import { createToastTool } from './toast.tool'

export function createUiTools(): AiTool[] {
  return [createCurrentOpenNodeTool(), createFocusNodeTool(), createToastTool()]
}
