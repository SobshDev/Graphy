import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  CHAT_MODEL_API_ID,
  CHAT_MODEL_PROVIDER,
  createAiService,
  readAiConfig,
} from '@/modules/ai-chat'
import { useGraph } from '@/modules/graph'
import { getDesktop } from '@/shared/lib/desktop'

import {
  fingerprintMatches,
  readCachedSummary,
  writeCachedSummary,
} from '../lib/cache'
import { getFileDependencies } from '../lib/dependencies'
import { generateSummary } from '../lib/generate-summary'
import { hashString } from '../lib/hash'
import type {
  NodeSummaryDependency,
  NodeSummaryTarget,
  SummaryStatus,
} from '../types'

export type UseNodeSummary = {
  uses: NodeSummaryDependency[]
  usedBy: NodeSummaryDependency[]
  overview: string[]
  status: SummaryStatus
  error: string | null
  refresh: () => void
}

export function useNodeSummary(
  target: NodeSummaryTarget | null,
): UseNodeSummary {
  const { graph } = useGraph()
  const [overview, setOverview] = useState<string[]>([])
  const [status, setStatus] = useState<SummaryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [runToken, setRunToken] = useState(0)
  const forceNextRef = useRef(false)

  const dependencies = useMemo(() => {
    if (!graph || !target) return { uses: [], usedBy: [] }
    return getFileDependencies(graph, target.file)
  }, [graph, target])

  useEffect(() => {
    if (!target) {
      setStatus('idle')
      setOverview([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const force = forceNextRef.current
    forceNextRef.current = false

    void resolve({
      signal: controller.signal,
      target,
      dependencies,
      force,
      setStatus,
      setOverview,
      setError,
    })

    return () => controller.abort()
  }, [target, dependencies, runToken])

  const refresh = useCallback(() => {
    forceNextRef.current = true
    setRunToken((n) => n + 1)
  }, [])

  return {
    uses: dependencies.uses,
    usedBy: dependencies.usedBy,
    overview,
    status,
    error,
    refresh,
  }
}

async function resolve({
  signal,
  target,
  dependencies,
  force,
  setStatus,
  setOverview,
  setError,
}: {
  signal: AbortSignal
  target: NodeSummaryTarget
  dependencies: {
    uses: NodeSummaryDependency[]
    usedBy: NodeSummaryDependency[]
  }
  force: boolean
  setStatus: (s: SummaryStatus) => void
  setOverview: (paragraphs: string[]) => void
  setError: (msg: string | null) => void
}): Promise<void> {
  setError(null)
  setOverview([])
  setStatus('loading')

  const config = readAiConfig()
  const provider = CHAT_MODEL_PROVIDER[config.defaultModel]
  const apiKey = config.keys[provider]
  if (!apiKey) {
    setStatus('no-key')
    return
  }

  const desktop = getDesktop()
  if (!desktop?.readFile) {
    setError('Summaries require the Graphy desktop app.')
    setStatus('error')
    return
  }

  try {
    const source = await desktop.readFile(target.file)
    if (isAborted(signal)) return

    const sourceHash = await hashString(source)
    if (isAborted(signal)) return

    const callerIds = dependencies.usedBy.map((d) => d.file)
    const calleeIds = dependencies.uses.map((d) => d.file)
    const currentFingerprint = { sourceHash, callerIds, calleeIds }

    const cached = force ? null : await readCachedSummary(target.file)
    if (isAborted(signal)) return

    if (cached && fingerprintMatches(cached.fingerprint, currentFingerprint)) {
      setOverview(cached.overview)
      setStatus('ready')
      return
    }

    setStatus('streaming')
    const apiModel = CHAT_MODEL_API_ID[config.defaultModel]
    const service = createAiService(provider, apiKey)
    const paragraphs = await generateSummary({
      service,
      model: apiModel,
      file: target.file,
      source,
      uses: dependencies.uses,
      usedBy: dependencies.usedBy,
      signal,
    })
    if (isAborted(signal)) return

    setOverview(paragraphs)
    setStatus('ready')

    await writeCachedSummary({
      nodeId: target.file,
      overview: paragraphs,
      fingerprint: currentFingerprint,
      model: apiModel,
      generatedAt: Date.now(),
    })
  } catch (err) {
    if (isAborted(signal)) return
    setError(err instanceof Error ? err.message : String(err))
    setStatus('error')
  }
}

function isAborted(signal: AbortSignal): boolean {
  return signal.aborted
}
