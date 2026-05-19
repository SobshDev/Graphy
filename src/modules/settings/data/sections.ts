import { Brush, Info, KeyRound } from 'lucide-react'

import type { SettingsSection } from '../types'

export const settingsSections: Array<SettingsSection> = [
  { id: 'themes', label: 'Themes', icon: Brush },
  { id: 'ai', label: 'AI', icon: KeyRound },
  { id: 'about', label: 'About', icon: Info },
]
