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
    <div className="code-card">
      <div className="hd">
        <span className="lang">{lang ?? 'text'}</span>
        <span className="sp" />
        <button type="button" onClick={handleCopy}>
          {copied ? (
            <Check size={12} strokeWidth={2} />
          ) : (
            <Copy size={12} strokeWidth={1.7} />
          )}
          <span>{copied ? 'copied' : 'copy'}</span>
        </button>
      </div>
      <pre>
        <code>{children}</code>
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
        <code className="inline" {...props}>
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
