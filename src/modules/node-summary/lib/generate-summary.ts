import type { AiMessage, AiService } from '@/modules/ai'

import type { NodeSummaryDependency } from '../types'

const SYSTEM_PROMPT = `You are summarising a single source file for a developer scanning a code graph.

Write 2-3 short paragraphs of plain prose (no bullet points, no headings).
Paragraph 1: what the file does and what role it plays.
Paragraph 2: how it interacts with its callers and dependencies.
Be concrete: name actual functions, types, or behaviours that appear in the source.
Skip filler like "this file" or "in summary". Keep the whole answer under 180 words.`

export type GenerateSummaryInput = {
  service: AiService
  model: string
  file: string
  source: string
  uses: NodeSummaryDependency[]
  usedBy: NodeSummaryDependency[]
  signal: AbortSignal
}

export async function generateSummary({
  service,
  model,
  file,
  source,
  uses,
  usedBy,
  signal,
}: GenerateSummaryInput): Promise<string[]> {
  const messages: AiMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildUserPrompt({ file, source, uses, usedBy }),
    },
  ]

  const result = await service.chat({
    messages,
    model,
    maxTokens: 600,
    temperature: 0.2,
    signal,
  })

  return splitParagraphs(result.content)
}

function buildUserPrompt({
  file,
  source,
  uses,
  usedBy,
}: {
  file: string
  source: string
  uses: NodeSummaryDependency[]
  usedBy: NodeSummaryDependency[]
}): string {
  const usesList = uses.length
    ? uses.map((d) => `  - ${d.file}`).join('\n')
    : '  (none)'
  const usedByList = usedBy.length
    ? usedBy.map((d) => `  - ${d.file}`).join('\n')
    : '  (none)'

  return `File: ${file}

Uses (files this file calls into):
${usesList}

Used by (files that call into this file):
${usedByList}

Source:
\`\`\`
${source}
\`\`\``
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}
