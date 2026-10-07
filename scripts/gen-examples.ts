import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderExamplesMd } from '../src/engine/golden/examplesMd.ts'

// `npm run examples` — regenerate EXAMPLES.md (every example household, printed) from the engine. Run it after ANY change that
// moves an example's answer; src/lib/examplesMd.test.ts fails the build when the committed file differs.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const md = renderExamplesMd()
writeFileSync(join(root, 'EXAMPLES.md'), md)
console.log(`EXAMPLES.md written — ${md.split('\n').length} lines.`)
