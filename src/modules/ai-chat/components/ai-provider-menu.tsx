import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

import { useAiChat } from '../hooks/use-ai-chat'
import type { AiProvider, ChatModel } from '../types'
import { CHAT_MODEL_LABELS, CHAT_MODEL_PROVIDER, CHAT_MODELS } from '../types'
import { ApiKeyDialog } from './api-key-dialog'

export function AiProviderMenu() {
  const { activeModel, keys, setActiveModel, setKey } = useAiChat()
  const [pendingProvider, setPendingProvider] = useState<AiProvider | null>(
    null,
  )
  const [pendingModel, setPendingModel] = useState<ChatModel | null>(null)

  const handleSelect = (model: ChatModel) => {
    const provider = CHAT_MODEL_PROVIDER[model]
    if (keys[provider]) {
      setActiveModel(model)
      return
    }
    setPendingProvider(provider)
    setPendingModel(model)
  }

  const handleSave = (provider: AiProvider, key: string) => {
    setKey(provider, key)
    if (pendingModel) setActiveModel(pendingModel)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="font-chat-mono inline-flex items-center gap-1.5 rounded-[5px] bg-transparent px-[7px] py-[3px] text-[10.5px] text-chat-text-3 hover:bg-chat-hover hover:text-chat-text"
            title="Model"
          >
            <span>{CHAT_MODEL_LABELS[activeModel].toLowerCase()}</span>
            <ChevronDown size={11} strokeWidth={1.8} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          {CHAT_MODELS.map((model) => (
            <DropdownMenuItem key={model} onSelect={() => handleSelect(model)}>
              {activeModel === model ? (
                <Check className="size-3.5" strokeWidth={2} />
              ) : (
                <span className="size-3.5" aria-hidden />
              )}
              {CHAT_MODEL_LABELS[model]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ApiKeyDialog
        provider={pendingProvider}
        open={pendingProvider !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingProvider(null)
            setPendingModel(null)
          }
        }}
        onSave={handleSave}
      />
    </>
  )
}
