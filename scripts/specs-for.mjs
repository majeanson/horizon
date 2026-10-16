// Prints the tests worth running for what you have changed (see scripts/specsForCore.mjs). No git hook: this only tells you.
//
//   npm run specs-for                 the working tree against HEAD (changed + new files)
//   npm run specs-for -- HEAD~3       against another commit
//   npm run specs-for -- --run        also run the unit suites it names
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { specsFor } from './specsForCore.mjs'

const args = process.argv.slice(2)
const base = args.find((a) => !a.startsWith('--')) ?? 'HEAD'
const changed = spawnSync('git', ['diff', '--name-only', base], { encoding: 'utf8' }).stdout.split('\n')
const added = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).stdout.split('\n')
const paths = [...new Set([...changed, ...added].map((p) => p.trim()).filter(Boolean))]

if (paths.length === 0) {
  console.log(`nothing has changed against ${base}.`)
  process.exit(0)
}
const { unit, e2e, fallback } = specsFor(paths, existsSync)
console.log(`${paths.length} changed file(s) against ${base}.\n`)
if (unit.length > 0) console.log(`unit:\n  npx vitest run ${unit.join(' ')}\n`)
if (e2e.length > 0) console.log(`e2e (before a push; one worker, like CI):\n  npm run e2e:ci -- ${e2e.join(' ')}\n`)
if (fallback) console.log('some changed file has no rule: run  npm run verify  (and the e2e specs of the page you touched)\n')
if (unit.length === 0 && e2e.length === 0 && !fallback) console.log('only documents and assets changed: npm run verify holds them (docs, sources).\n')
if (args.includes('--run') && unit.length > 0) process.exit(spawnSync('npx', ['vitest', 'run', ...unit], { stdio: 'inherit', shell: true }).status ?? 1)
