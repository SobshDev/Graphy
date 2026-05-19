import { Brush, Info } from 'lucide-react'

import type { SettingsSection } from '../types'

export const settingsSections: Array<SettingsSection> = [
  { id: 'themes', label: 'Themes', icon: Brush },
  { id: 'about', label: 'About', icon: Info },
]
