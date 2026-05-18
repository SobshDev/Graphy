export type FileNode = {
  name: string
  path: string
  kind: 'file' | 'dir'
  children?: Array<FileNode>
}
