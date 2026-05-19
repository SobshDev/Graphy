import { Badge } from '@/shared/ui/badge'

import type { NodeSummaryFacts } from '../types'

type SummaryFactsProps = {
  facts: NodeSummaryFacts
}

export function SummaryFacts({ facts }: SummaryFactsProps) {
  const chips: string[] = []
  if (facts.isAsync) chips.push('async')
  if (facts.isExported) chips.push('exported')
  if (facts.bodyLines > 0) chips.push(`${facts.bodyLines} lines`)
  if (facts.inDegree > 0) chips.push(`${facts.inDegree} in`)
  if (facts.outDegree > 0) chips.push(`${facts.outDegree} out`)

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((label) => (
        <Badge
          key={label}
          variant="secondary"
          className="font-mono text-[10.5px] tracking-wide"
        >
          {label}
        </Badge>
      ))}
    </div>
  )
}
