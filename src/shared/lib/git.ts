import type { SimpleGit } from 'simple-git'

export async function openRepo(): Promise<SimpleGit> {
  const { simpleGit } = await import('simple-git')
  return simpleGit(process.cwd())
}
