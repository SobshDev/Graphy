import type { SimpleGit } from 'simple-git'

export async function openRepo(cwd?: string): Promise<SimpleGit> {
  const { simpleGit } = await import('simple-git')
  return simpleGit(cwd ?? process.cwd())
}
