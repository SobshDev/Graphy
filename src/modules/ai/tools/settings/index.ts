import type { AiTool } from '../tools.interface'
import { createGetSettingsTool } from './get-settings.tool'

export function createSettingsTools(): AiTool[] {
  return [createGetSettingsTool()]
}
