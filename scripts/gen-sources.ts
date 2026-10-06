import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KNOWN, SERIES } from '../src/engine/params/index.ts'
import { renderSourcesMd } from '../src/engine/params/sourcesMd.ts'

// `npm run sources` — regenerate SOURCES.md from the params files. Run it after ANY change to a
// figure, a source or a note in src/engine/params/; src/lib/sourcesMd.test.ts fails the build when
// the committed file differs from what this would write. Node runs this file directly (it strips
// the types itself), which is why every engine import carries an explicit `.ts`.
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'SOURCES.md')
const md = renderSourcesMd({ years: KNOWN, series: SERIES })
writeFileSync(out, md)
console.log(`SOURCES.md written — ${md.split('\n').length} lines, ${Object.keys(KNOWN).length} year(s), ${SERIES.length} series.`)
