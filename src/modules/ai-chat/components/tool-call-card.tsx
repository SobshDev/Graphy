import { ChevronRight } from 'lucide-react'

import type { AiToolCall } from '@/modules/ai'
import { cn } from '@/shared/lib/utils'

function pretty(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function ToolCallCard({ call }: { call: AiToolCall }) {
  return (
    <details className="group rounded-md border border-chat-line bg-chat-sunken">
      <summary
        className={cn(
          'font-chat-mono flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-[12px] text-chat-text-2',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <ChevronRight
          size={12}
          strokeWidth={2}
          className="text-chat-text-3 transition-transform group-open:rotate-90"
        />
        <span className="text-chat-accent">{call.name}</span>
        <span className="flex-1" />
        {call.isError ? (
          <span className="rounded border border-[rgba(255,104,104,0.4)] px-1.5 py-px text-[10.5px] uppercase tracking-[0.08em] text-chat-danger">
            error
          </span>
        ) : (
          <span className="text-[10.5px] uppercase tracking-[0.08em] text-chat-text-3">
            tool call
          </span>
        )}
      </summary>
      <div className="flex flex-col gap-2 border-t border-chat-line px-2.5 py-2">
        <Section label="input" body={pretty(call.input)} />
        <Section label="output" body={pretty(call.output)} />
      </div>
    </details>
  )
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-chat-mono text-[10.5px] uppercase tracking-[0.08em] text-chat-text-3">
        {label}
      </div>
      <pre className="font-chat-mono m-0 max-h-64 overflow-auto rounded border border-chat-line bg-chat-bg px-2 py-1.5 text-[11.5px] leading-[1.55] text-chat-text">
        <code className="border-0 bg-transparent p-0 font-[inherit] text-[inherit]">
          {body}
        </code>
      </pre>
    </div>
  )
}
