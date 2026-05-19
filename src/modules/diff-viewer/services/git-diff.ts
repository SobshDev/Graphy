import { getDesktop } from '@/shared/lib/desktop'
import type {
  GitDiffResult,
  GitShowPayload,
  GitShowResult,
  GitStatusResult,
} from '@/shared/lib/desktop'

export async function getGitStatus(): Promise<GitStatusResult> {
  const desktop = getDesktop()
  if (!desktop) throw new Error('desktop bridge unavailable')
  return desktop.gitStatus()
}

export async function getGitDiff(
  file?: string,
  staged?: boolean,
): Promise<GitDiffResult> {
  const desktop = getDesktop()
  if (!desktop) throw new Error('desktop bridge unavailable')
  return desktop.gitDiff({ file, staged, maxBytes: 1_048_576 })
}

export async function getGitShow(file: string): Promise<GitShowResult> {
  const desktop = getDesktop()
  if (!desktop) throw new Error('desktop bridge unavailable')
  return desktop.gitShow({ file } satisfies GitShowPayload)
}
