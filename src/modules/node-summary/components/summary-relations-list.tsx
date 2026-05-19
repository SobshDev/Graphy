import type { NodeType } from '@/modules/parser'

import type { NodeSummaryRelation } from '../types'

const TYPE_LABEL: Record<NodeType, string> = {
  file: 'file',
  route: 'route',
  component: 'cmp',
  hook: 'hook',
  function: 'fn',
  arrow: 'fn',
  method: 'm',
  class: 'cls',
  object: 'obj',
  constructor: 'ctor',
  getter: 'get',
  setter: 'set',
}

type SummaryRelationsListProps = {
  title: string
  emptyLabel: string
  items: NodeSummaryRelation[]
}

export function SummaryRelationsList({
  title,
  emptyLabel,
  items,
}: SummaryRelationsListProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        <span>{title}</span>
        <span className="text-muted-foreground/60">· {items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground/70 text-xs">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {}}
                className="hover:bg-muted/40 flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors"
              >
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-wider">
                    {TYPE_LABEL[item.type]}
                  </span>
                  <span className="text-foreground truncate text-[12.5px] font-medium">
                    {item.displayName}
                  </span>
                </div>
                <div className="text-muted-foreground/80 truncate font-mono text-[10.5px]">
                  {shortFile(item.file)}:{item.line}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function shortFile(file: string): string {
  return file.split('/').slice(-2).join('/')
}
