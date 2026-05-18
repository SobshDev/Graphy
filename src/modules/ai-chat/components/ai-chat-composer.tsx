import { AtSign, FileText, Paperclip, Square } from 'lucide-react'
import { useState } from 'react'

import { useAiChat } from '../hooks/use-ai-chat'
import { AiProviderMenu } from './ai-provider-menu'

const cbBtnClass =
  'inline-flex size-[26px] items-center justify-center rounded-[5px] text-chat-text-3 transition-colors hover:bg-chat-hover hover:text-chat-text disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-chat-text-3'

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
    <div className="flex flex-col gap-2 border-t border-chat-line bg-chat-bg px-3 pb-3 pt-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="font-chat-mono inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-dashed border-chat-line-strong px-[7px] py-0.5 text-[10.5px] text-chat-text-3 disabled:cursor-not-allowed enabled:hover:border-chat-text-3 enabled:hover:text-chat-text"
          title="Coming soon"
          disabled
        >
          <AtSign size={10} strokeWidth={1.8} />
          <span>add context</span>
        </button>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-chat-line-strong bg-chat-sunken px-3 pb-1.5 pt-2.5 transition-colors focus-within:border-chat-accent-rail focus-within:shadow-[0_0_0_3px_var(--color-chat-accent-soft)]">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className="font-chat-sans w-full resize-none border-0 bg-transparent text-[13.5px] leading-[1.5] text-chat-text outline-none min-h-[38px] max-h-[140px] placeholder:text-chat-text-4 disabled:cursor-not-allowed disabled:text-chat-text-3"
        />
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={cbBtnClass}
              title="Coming soon"
              aria-label="Attach file"
              disabled
            >
              <Paperclip size={13} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              className={cbBtnClass}
              title="Coming soon"
              aria-label="Mention"
              disabled
            >
              <AtSign size={13} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              className={cbBtnClass}
              title="Coming soon"
              aria-label="Attach image"
              disabled
            >
              <FileText size={13} strokeWidth={1.7} />
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <AiProviderMenu />
            {isStreaming ? (
              <button
                type="button"
                className="font-chat-mono inline-flex items-center gap-1.5 rounded-md border border-chat-line-strong bg-transparent px-2.5 py-1 text-[12px] text-chat-text-2 hover:bg-chat-hover hover:text-chat-text"
                onClick={cancelStream}
                aria-label="Stop generating"
              >
                <Square size={11} strokeWidth={2} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="font-chat-mono inline-flex items-center gap-1.5 rounded-md bg-chat-accent px-2.5 py-1 text-[12px] font-semibold text-[#0a0d04] hover:bg-chat-accent-2 disabled:cursor-not-allowed disabled:bg-chat-elev disabled:text-chat-text-4"
                onClick={submit}
                disabled={disabled || value.trim().length === 0}
              >
                <span>Send</span>
                <span className="inline-flex items-center justify-center rounded-[3px] border border-[rgba(10,13,4,0.3)] px-1 text-[10px] leading-[1.4]">
                  ↵
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
