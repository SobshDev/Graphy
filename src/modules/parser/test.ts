import path from 'node:path'
import { loadProject } from './projectLoader.js'
import { extractFunctions } from './functionExtractor.js'
import { extractClasses } from './classExtractor.js'

const cwd = process.cwd()
const project = loadProject(cwd)
const sourceFiles = project.addSourceFilesAtPaths('tests/fixtures/**/*.ts')

for (const sourceFile of sourceFiles) {
  const relativePath = path.relative(cwd, sourceFile.getFilePath())
  const nodes = [
    ...extractFunctions(sourceFile, relativePath),
    ...extractClasses(sourceFile, relativePath),
  ]
  console.log(`--- ${relativePath} ---`)
  console.log(JSON.stringify(nodes, null, 2))
}
