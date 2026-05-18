export interface ReadFunctionSourceArgs {
  root: string
  file: string
  startLine: number
  endLine: number
}

export interface ReadFunctionSourceResult {
  source: string
  startLine: number
  endLine: number
}

export interface WriteFunctionSourceArgs extends ReadFunctionSourceArgs {
  source: string
}

export interface WriteFunctionSourceResult {
  endLine: number
}

declare global {
  interface Window {
    graphyDesktop?: {
      platform: string
      readFunctionSource?: (
        args: ReadFunctionSourceArgs,
      ) => Promise<ReadFunctionSourceResult>
      writeFunctionSource?: (
        args: WriteFunctionSourceArgs,
      ) => Promise<WriteFunctionSourceResult>
    }
  }
}

export {}
