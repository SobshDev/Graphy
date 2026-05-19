import type {
  CachedSummaryFingerprint,
  NodeSummaryHeader,
  NodeSummaryRelation,
} from '../types'

const SUMMARY_SYSTEM = `You explain code from a project graph to engineers. Given one node's source, its callers, and what it calls, write 2 to 3 short paragraphs (2-4 sentences each).

Cover, in order:
1. What this code does, in plain language.
2. Its role in the larger codebase - how it is used by callers and how it depends on its callees.

Rules:
- Output plain text. Paragraphs separated by a blank line. No markdown headings, no bullet lists, no code fences.
- Reference callers and callees by name only when it clarifies the role. Do not enumerate them all.
- Do not restate the signature or file path. Skip filler ("This function...").
- Stay concrete. If the code is short or trivial, the summary should be too.`

export function buildSummaryPrompt({
  header,
  source,
  callers,
  callees,
}: {
  header: NodeSummaryHeader
  source: string
  callers: NodeSummaryRelation[]
  callees: NodeSummaryRelation[]
}): { system: string; user: string } {
  const lines: string[] = []
  lines.push(`Node: ${header.displayName} (${header.type})`)
  lines.push(`Location: ${header.file}:${header.line}`)
  lines.push(`Signature: ${header.signature || '(none)'}`)
  lines.push('')
  lines.push('Source:')
  lines.push('```')
  lines.push(source)
  lines.push('```')
  lines.push('')
  lines.push('Callers (nodes that invoke this):')
  lines.push(formatRelations(callers))
  lines.push('')
  lines.push('Callees (nodes invoked by this):')
  lines.push(formatRelations(callees))
  return { system: SUMMARY_SYSTEM, user: lines.join('\n') }
}

const VALIDATOR_SYSTEM = `You judge whether a saved summary of code is still accurate after edits. Compare the saved summary to the current source and neighborhood.

Return JSON: { "stillValid": boolean, "reason": "<one short sentence>" }.

- stillValid: true if every claim in the saved summary still describes the current code. Cosmetic changes (whitespace, renamed locals, refactors that preserve behavior) do not invalidate.
- stillValid: false if any concrete claim is now wrong or missing, or the role of the code has shifted in a way a reader would care about.
- Be strict but not pedantic. Reader value drives the decision.`

export function buildValidatorPrompt({
  oldOverview,
  newSource,
  oldFingerprint,
  newFingerprint,
}: {
  oldOverview: string[]
  newSource: string
  oldFingerprint: CachedSummaryFingerprint
  newFingerprint: CachedSummaryFingerprint
}): { system: string; user: string } {
  const callerDiff = diffSets(
    oldFingerprint.callerIds,
    newFingerprint.callerIds,
  )
  const calleeDiff = diffSets(
    oldFingerprint.calleeIds,
    newFingerprint.calleeIds,
  )

  const lines: string[] = []
  lines.push('Saved summary:')
  for (const paragraph of oldOverview) {
    lines.push(paragraph)
    lines.push('')
  }
  lines.push('Current source:')
  lines.push('```')
  lines.push(newSource)
  lines.push('```')
  lines.push('')
  lines.push('Caller changes:')
  lines.push(`  added: ${callerDiff.added.join(', ') || '(none)'}`)
  lines.push(`  removed: ${callerDiff.removed.join(', ') || '(none)'}`)
  lines.push('Callee changes:')
  lines.push(`  added: ${calleeDiff.added.join(', ') || '(none)'}`)
  lines.push(`  removed: ${calleeDiff.removed.join(', ') || '(none)'}`)

  return { system: VALIDATOR_SYSTEM, user: lines.join('\n') }
}

function formatRelations(items: NodeSummaryRelation[]): string {
  if (items.length === 0) return '  (none)'
  return items
    .map((r) => `  - ${r.displayName} (${r.type}) at ${r.file}:${r.line}`)
    .join('\n')
}

function diffSets(
  oldIds: string[],
  newIds: string[],
): { added: string[]; removed: string[] } {
  const oldSet = new Set(oldIds)
  const newSet = new Set(newIds)
  return {
    added: newIds.filter((id) => !oldSet.has(id)),
    removed: oldIds.filter((id) => !newSet.has(id)),
  }
}
