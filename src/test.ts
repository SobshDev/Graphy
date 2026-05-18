import { loadProject } from './parser/projectLoader.js'
import { extractFunctions } from './parser/functionExtractor.js'

const project = loadProject(process.cwd())
const sourceFile = project.addSourceFileAtPath('tests/fixtures/simple.ts')

const nodes = extractFunctions(sourceFile, 'tests/fixtures/simple.ts')
console.log(JSON.stringify(nodes, null, 2))
