import type { ComponentType } from 'react'

export type SettingsSectionId =
  | 'account'
  | 'appearance'
  | 'graph'
  | 'ai'
  | 'keybindings'
  | 'about'

export type SettingsSection = {
  id: SettingsSectionId
  code: string
  label: string
  blurb: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}
