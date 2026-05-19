import { AI_PROVIDERS } from '@/modules/ai-chat'

import { ProviderKeyRow } from './provider-key-row'
import { SettingCard } from './setting-card'

export function SectionAi() {
  return (
    <SettingCard>
      {AI_PROVIDERS.map((provider) => (
        <ProviderKeyRow key={provider} provider={provider} />
      ))}
    </SettingCard>
  )
}
