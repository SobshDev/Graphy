import { Cpu, Info, Keyboard, Palette } from 'lucide-react'

import type { SettingsSection } from '../types'

export const settingsSections: Array<SettingsSection> = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI Models', icon: Cpu },
  { id: 'keybindings', label: 'Keybindings', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
]
