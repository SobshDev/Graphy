import { CircleUser, Cpu, Info, Keyboard, Network, Palette } from 'lucide-react'

import type { SettingsSection } from '../types'

export const settingsSections: Array<SettingsSection> = [
  {
    id: 'account',
    code: 'S.01',
    label: 'Account',
    blurb: 'Workspace identity & sync',
    icon: CircleUser,
  },
  {
    id: 'appearance',
    code: 'S.02',
    label: 'Appearance',
    blurb: 'Theme, accent, typography',
    icon: Palette,
  },
  {
    id: 'graph',
    code: 'S.03',
    label: 'Graph',
    blurb: 'Layout & rendering',
    icon: Network,
  },
  {
    id: 'ai',
    code: 'S.04',
    label: 'AI Models',
    blurb: 'Providers & credentials',
    icon: Cpu,
  },
  {
    id: 'keybindings',
    code: 'S.05',
    label: 'Keybindings',
    blurb: 'Shortcuts',
    icon: Keyboard,
  },
  {
    id: 'about',
    code: 'S.06',
    label: 'About',
    blurb: 'Build & license',
    icon: Info,
  },
]
