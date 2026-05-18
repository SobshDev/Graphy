import { Project, ScriptTarget } from 'ts-morph'
import type { ProjectOptions, SourceFile } from 'ts-morph'

const DEFAULT_COMPILER_OPTIONS: ProjectOptions['compilerOptions'] = {
  target: ScriptTarget.ES2022,
  allowJs: true,
}

export interface LoaderOptions {
  compilerOptions?: ProjectOptions['compilerOptions']
}

export function loadProject(cwd: string): Project {
  return new Project({
    compilerOptions: {
      ...DEFAULT_COMPILER_OPTIONS,
      rootDir: cwd,
    },
    skipAddingFilesFromTsConfig: true,
  })
}

export class ProjectLoader {
  readonly project: Project

  constructor(options: LoaderOptions = {}) {
    this.project = new Project({
      compilerOptions: {
        ...DEFAULT_COMPILER_OPTIONS,
        ...options.compilerOptions,
      },
    })
  }

  static fromTsConfig(
    tsConfigFilePath: string,
    options: LoaderOptions = {},
  ): ProjectLoader {
    const loader = new ProjectLoader(options)
    loader.project.addSourceFilesFromTsConfig(tsConfigFilePath)
    return loader
  }

  static fromDirectory(
    directory: string,
    options: LoaderOptions & { patterns?: readonly string[] } = {},
  ): ProjectLoader {
    const {
      patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      ...loaderOptions
    } = options
    const loader = new ProjectLoader(loaderOptions)
    loader.project.addSourceFilesAtPaths(
      patterns.map((p) => `${directory}/${p}`),
    )
    return loader
  }

  static fromFiles(
    filePaths: readonly string[],
    options: LoaderOptions = {},
  ): ProjectLoader {
    const loader = new ProjectLoader(options)
    for (const filePath of filePaths) {
      loader.project.addSourceFileAtPath(filePath)
    }
    return loader
  }

  getSourceFiles(): SourceFile[] {
    return this.project.getSourceFiles()
  }
}
