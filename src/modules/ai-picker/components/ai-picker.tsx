import { BrainCircuit, Check } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

import { useAiConfig } from '../hooks/use-ai-config'
import type { AiProvider } from '../types'
import { AI_PROVIDERS, AI_PROVIDER_LABELS } from '../types'
import { ApiKeyDialog } from './api-key-dialog'

export function AiPicker() {
  const { activeProvider, keys, setActiveProvider, setKey } = useAiConfig()
  const [pendingProvider, setPendingProvider] = useState<AiProvider | null>(
    null,
  )

  const handleSelect = (provider: AiProvider) => {
    if (keys[provider]) {
      setActiveProvider(provider)
      return
    }
    setPendingProvider(provider)
  }

  const handleSave = (provider: AiProvider, key: string) => {
    setKey(provider, key)
    setActiveProvider(provider)
  }

  const label = activeProvider ? AI_PROVIDER_LABELS[activeProvider] : 'AI'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <BrainCircuit className="size-3.5" strokeWidth={1.7} />
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          {AI_PROVIDERS.map((provider) => (
            <DropdownMenuItem
              key={provider}
              onSelect={() => handleSelect(provider)}
            >
              {activeProvider === provider ? (
                <Check className="size-3.5" strokeWidth={2} />
              ) : (
                <span className="size-3.5" aria-hidden />
              )}
              {AI_PROVIDER_LABELS[provider]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ApiKeyDialog
        provider={pendingProvider}
        open={pendingProvider !== null}
        onOpenChange={(open) => {
          if (!open) setPendingProvider(null)
        }}
        onSave={handleSave}
      />
    </>
  )
}
