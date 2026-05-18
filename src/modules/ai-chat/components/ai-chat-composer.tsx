import { Square } from 'lucide-react'
import { useState } from 'react'

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
      : 'Ask, edit, or assign a task…'

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
    <div className="composer">
      <div className="composer-input">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
        />
        <div className="composer-bar">
          <span className="spacer" />
          {isStreaming ? (
            <button
              type="button"
              className="stop-btn"
              onClick={cancelStream}
              aria-label="Stop generating"
            >
              <Square size={11} strokeWidth={2} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              className="send-btn"
              onClick={submit}
              disabled={disabled || value.trim().length === 0}
            >
              <span>Send</span>
              <span className="kbd">↵</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
