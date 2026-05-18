import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

function CodeCard({ lang, children }: { lang?: string; children: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }
  return (
    <div className="overflow-hidden rounded-lg border border-chat-line bg-chat-sunken">
      <div className="font-chat-mono flex items-center gap-2 border-b border-chat-line py-1.5 pl-3 pr-2 text-[11px] text-chat-text-3">
        <span className="text-chat-text-2">{lang ?? 'text'}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={handleCopy}
          className="font-chat-mono inline-flex items-center gap-1.5 rounded border-0 bg-transparent px-1.5 py-0.5 text-[11px] text-chat-text-3 hover:bg-chat-hover hover:text-chat-text"
        >
          {copied ? (
            <Check size={12} strokeWidth={2} />
          ) : (
            <Copy size={12} strokeWidth={1.7} />
          )}
          <span>{copied ? 'copied' : 'copy'}</span>
        </button>
      </div>
      <pre className="font-chat-mono m-0 overflow-x-auto px-3 py-2.5 text-[12px] leading-[1.7] text-chat-text">
        <code className="border-0 bg-transparent p-0 font-[inherit] text-[inherit]">
          {children}
        </code>
      </pre>
    </div>
  )
}

function flatten(children: ReactNode): string {
  if (children == null || children === false) return ''
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(flatten).join('')
  if (typeof children === 'object' && 'props' in children) {
    return flatten(
      (children as { props: { children?: ReactNode } }).props.children,
    )
  }
  return ''
}

const components: Components = {
  code({
    className,
    children,
    ...props
  }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
    const match = /language-(\w+)/.exec(className ?? '')
    const text = flatten(children).replace(/\n$/, '')
    const isBlock = !!match || text.includes('\n')
    if (!isBlock) {
      return (
        <code
          className="font-chat-mono rounded border border-chat-line bg-chat-elev px-1.5 py-px text-[12.5px] text-chat-accent [white-space:break-spaces]"
          {...props}
        >
          {children}
        </code>
      )
    }
    return <CodeCard lang={match?.[1]}>{text}</CodeCard>
  },
  pre({ children }) {
    return <>{children}</>
  },
  a({ children, href, ...props }) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
        {children}
      </a>
    )
  },
}

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
