import type { ComponentType } from 'react'

export type SettingsSectionId = 'themes' | 'about'

export type SettingsSection = {
  id: SettingsSectionId
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}
