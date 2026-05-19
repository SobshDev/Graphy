import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CHAT_MODEL_API_ID, readAiConfig } from '@/modules/ai-chat'
import { useGraph } from '@/modules/graph'
import { getDesktop } from '@/shared/lib/desktop'

import type {
  CachedSummary,
  NodeSummaryHeader,
  NodeSummaryRelation,
  SummaryStatus,
} from '../types'
import { buildSummaryPrompt, buildValidatorPrompt } from '../lib/build-prompts'
import { readCachedSummary, writeCachedSummary } from '../lib/cache'
import { computeFingerprint, fingerprintMatches } from '../lib/fingerprint'
import { streamSummary } from '../lib/generate-summary'
import { getNeighbors, getNodeMetadata, toHeader } from '../lib/relations'
import { validateCached } from '../lib/validate-cache'

export type UseNodeSummary = {
  header: NodeSummaryHeader | null
  callers: NodeSummaryRelation[]
  callees: NodeSummaryRelation[]
  overview: string[]
  status: SummaryStatus
  error: string | null
  refresh: () => void
}

export function useNodeSummary(nodeId: string | null): UseNodeSummary {
  const { graph, folder } = useGraph()
  const [overview, setOverview] = useState<string[]>([])
  const [status, setStatus] = useState<SummaryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [runToken, setRunToken] = useState(0)
  const forceNextRef = useRef(false)

  const derived = useMemo(() => {
    if (!graph || !nodeId) {
      return {
        header: null as NodeSummaryHeader | null,
        callers: [] as NodeSummaryRelation[],
        callees: [] as NodeSummaryRelation[],
      }
    }
    const node = getNodeMetadata(graph, nodeId)
    if (!node) return { header: null, callers: [], callees: [] }
    const header = toHeader(node)
    const { callers, callees } = getNeighbors(graph, nodeId)
    return { header, callers, callees }
  }, [graph, nodeId])

  useEffect(() => {
    if (!nodeId) {
      setStatus('idle')
      setOverview([])
      setError(null)
      return
    }
    if (!graph || !folder || !derived.header) {
      setStatus('loading')
      setOverview([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const force = forceNextRef.current
    forceNextRef.current = false

    void resolve({
      signal: controller.signal,
      nodeId,
      folder,
      header: derived.header,
      callers: derived.callers,
      callees: derived.callees,
      force,
      setStatus,
      setOverview,
      setError,
    })

    return () => controller.abort()
    // runToken is intentionally a dep so refresh() forces a re-run.
  }, [nodeId, graph, folder, derived, runToken])

  const refresh = useCallback(() => {
    forceNextRef.current = true
    setRunToken((n) => n + 1)
  }, [])

  return {
    header: derived.header,
    callers: derived.callers,
    callees: derived.callees,
    overview,
    status,
    error,
    refresh,
  }
}

async function resolve({
  signal,
  nodeId,
  folder,
  header,
  callers,
  callees,
  force,
  setStatus,
  setOverview,
  setError,
}: {
  signal: AbortSignal
  nodeId: string
  folder: string
  header: NodeSummaryHeader
  callers: NodeSummaryRelation[]
  callees: NodeSummaryRelation[]
  force: boolean
  setStatus: (s: SummaryStatus) => void
  setOverview: (paragraphs: string[]) => void
  setError: (msg: string | null) => void
}): Promise<void> {
  setError(null)
  setOverview([])
  setStatus('loading')

  const config = readAiConfig()
  const apiKey = config.keys.claude
  if (!apiKey) {
    setStatus('no-key')
    return
  }
  const summaryModel = CHAT_MODEL_API_ID[config.defaultModel]

  const desktop = getDesktop()
  if (!desktop?.readFunctionSource) {
    setError('Summaries require the Graphy desktop app.')
    setStatus('error')
    return
  }

  try {
    const { source } = await desktop.readFunctionSource({
      root: folder,
      file: header.file,
      startLine: header.line,
      endLine: header.endLine,
    })
    if (isAborted(signal)) return

    const currentFingerprint = await computeFingerprint({
      source,
      callers,
      callees,
    })
    if (isAborted(signal)) return

    const cached = force ? null : await readCachedSummary(nodeId)
    if (isAborted(signal)) return

    if (cached) {
      if (fingerprintMatches(cached.fingerprint, currentFingerprint)) {
        setOverview(cached.overview)
        setStatus('ready')
        return
      }

      setStatus('validating')
      const { system, user } = buildValidatorPrompt({
        oldOverview: cached.overview,
        newSource: source,
        oldFingerprint: cached.fingerprint,
        newFingerprint: currentFingerprint,
      })
      const verdict = await validateCached({ apiKey, system, user, signal })
      if (isAborted(signal)) return

      if (verdict.stillValid) {
        setOverview(cached.overview)
        setStatus('ready')
        await writeCachedSummary({
          ...cached,
          fingerprint: currentFingerprint,
        })
        return
      }
    }

    setStatus('streaming')
    const { system, user } = buildSummaryPrompt({
      header,
      source,
      callers,
      callees,
    })
    let final: string[] = []
    for await (const accumulated of streamSummary({
      apiKey,
      model: summaryModel,
      system,
      user,
      signal,
    })) {
      if (isAborted(signal)) return
      final = splitParagraphs(accumulated)
      setOverview(final)
    }
    if (isAborted(signal)) return

    setStatus('ready')
    const payload: CachedSummary = {
      nodeId,
      overview: final,
      fingerprint: currentFingerprint,
      model: summaryModel,
      generatedAt: Date.now(),
    }
    await writeCachedSummary(payload)
  } catch (err) {
    if (isAborted(signal)) return
    setError(err instanceof Error ? err.message : String(err))
    setStatus('error')
  }
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

function isAborted(signal: AbortSignal): boolean {
  return signal.aborted
}
