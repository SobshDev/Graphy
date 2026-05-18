import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

import { useAiChat } from '../hooks/use-ai-chat'
import type { AiProvider } from '../types'
import { AI_PROVIDERS, AI_PROVIDER_LABELS } from '../types'
import { ApiKeyDialog } from './api-key-dialog'

export function AiProviderMenu() {
  const { activeProvider, keys, setActiveProvider, setKey } = useAiChat()
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

  const label = activeProvider
    ? AI_PROVIDER_LABELS[activeProvider]
    : 'Select model'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 font-mono text-[11px]"
          >
            {label}
            <ChevronDown className="size-3" strokeWidth={1.8} />
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
