import { AtSign, FileText, Paperclip, Square } from 'lucide-react'
import { useState } from 'react'

import { useAiChat } from '../hooks/use-ai-chat'
import { AiProviderMenu } from './ai-provider-menu'

export function AiChatComposer() {
  const { activeProvider, keys, isStreaming, sendMessage, cancelStream } =
    useAiChat()
  const [value, setValue] = useState('')

  const hasKey = Boolean(keys[activeProvider])
  const disabled = !hasKey
  const placeholder = hasKey
    ? 'Ask, edit, or assign a task…  ⌘K for commands'
    : 'Add an API key for this model to chat…'

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
      <div className="composer-ctx">
        <button
          type="button"
          className="composer-add"
          title="Coming soon"
          disabled
        >
          <AtSign size={10} strokeWidth={1.8} />
          <span>add context</span>
        </button>
      </div>
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
          <div className="left">
            <button
              type="button"
              className="cb-btn"
              title="Coming soon"
              aria-label="Attach file"
              disabled
            >
              <Paperclip size={13} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              className="cb-btn"
              title="Coming soon"
              aria-label="Mention"
              disabled
            >
              <AtSign size={13} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              className="cb-btn"
              title="Coming soon"
              aria-label="Attach image"
              disabled
            >
              <FileText size={13} strokeWidth={1.7} />
            </button>
          </div>
          <div className="right">
            <AiProviderMenu />
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
    </div>
  )
}
