import { Kbd, KbdGroup } from '@/shared/ui/kbd'

import { SettingCard } from './setting-card'
import { SettingRow } from './setting-row'

const bindings: Array<{ command: string; keys: Array<string> }> = [
  { command: 'Command palette', keys: ['⌘', 'K'] },
  { command: 'Run graph', keys: ['⌘', '↵'] },
  { command: 'Save', keys: ['⌘', 'S'] },
  { command: 'Search symbols', keys: ['⌘', '⇧', 'F'] },
  { command: 'Fit to viewport', keys: ['F'] },
  { command: 'Ask AI about selection', keys: ['⌘', 'I'] },
]

export function SectionKeybindings() {
  return (
    <SettingCard>
      {bindings.map((binding) => (
        <SettingRow key={binding.command} label={binding.command}>
          <KbdGroup>
            {binding.keys.map((key, i) => (
              <Kbd key={i}>{key}</Kbd>
            ))}
          </KbdGroup>
        </SettingRow>
      ))}
    </SettingCard>
  )
}
