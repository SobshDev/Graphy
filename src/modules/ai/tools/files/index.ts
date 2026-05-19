import type { AiTool } from '../tools.interface'
import { createListFilesTool } from './list-files.tool'
import { createReadFileTool } from './read-file.tool'
import { createSearchCodeTool } from './search-code.tool'

export function createFilesTools(): AiTool[] {
  return [createReadFileTool(), createSearchCodeTool(), createListFilesTool()]
}
