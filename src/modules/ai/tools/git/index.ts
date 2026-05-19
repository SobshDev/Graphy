import type { AiTool } from '../tools.interface'
import { createGitBlameTool } from './git-blame.tool'
import { createGitDiffTool } from './git-diff.tool'
import { createGitStatusTool } from './git-status.tool'

export function createGitTools(): AiTool[] {
  return [createGitStatusTool(), createGitDiffTool(), createGitBlameTool()]
}
