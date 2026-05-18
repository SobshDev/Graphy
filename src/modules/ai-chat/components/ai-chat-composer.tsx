import { Send, Square } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

import { useAiChat } from '../hooks/use-ai-chat'

export function AiChatComposer() {
  const { activeProvider, keys, isStreaming, sendMessage, cancelStream } =
    useAiChat()
  const [value, setValue] = useState('')

  const hasKey = activeProvider ? Boolean(keys[activeProvider]) : false
  const disabled = !activeProvider || !hasKey
  const placeholder = !activeProvider
    ? 'Pick a model to start chatting…'
    : !hasKey
      ? 'Add an API key for this model to chat…'
      : 'Ask anything. ⏎ to send, ⇧⏎ for newline.'

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || disabled) return
    sendMessage(trimmed)
    setValue('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t p-3">
      <div className="bg-background flex items-end gap-2 rounded-md border px-2 py-1.5">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0"
        />
        {isStreaming ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={cancelStream}
            aria-label="Stop generating"
          >
            <Square className="size-3.5" strokeWidth={2} />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={disabled || value.trim().length === 0}
            aria-label="Send"
          >
            <Send className="size-3.5" strokeWidth={1.8} />
          </Button>
        )}
      </div>
    </div>
  )
}
