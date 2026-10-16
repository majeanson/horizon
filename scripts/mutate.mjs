// A HAND-ROLLED MUTATION CHECK. A test that passes proves nothing until it has been seen to FAIL on the bug it exists for. Every mutant in scripts/mutants.mjs is one plausible mistake — a sign
// swapped, an age off by one, a rule dropped — planted with an exact-match edit into the real source, run against the test files that are supposed to notice, and taken out again. A mutant the
// tests do not kill SURVIVED: it is a hole, and the fix is a new test, not a deleted mutant.
//
//   node scripts/mutate.mjs              every mutant
//   node scripts/mutate.mjs --list       what they are
//   node scripts/mutate.mjs --only fill  the mutants whose id contains « fill »
//
// Safe by construction: it refuses to touch a file with uncommitted changes (the original it would restore is not the one in git), restores each file after each run — also on Ctrl-C, a crash
// or a failed test run — and checks afterwards that the file is byte-identical to what it started as.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { MUTANTS } from './mutants.mjs'
import { applyMutation, checkMutant, verdict } from './mutateCore.mjs'

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const selected = MUTANTS.filter((m) => only === null || m.id.includes(only))

if (args.includes('--list')) {
  for (const m of MUTANTS) console.log(`${m.id.padEnd(34)} ${m.file}\n    ${m.why}`)
  process.exit(0)
}

const bad = MUTANTS.flatMap((m) => checkMutant(m).map((p) => `${m.id}: ${p}`))
if (bad.length > 0) {
  console.error('a mutant is malformed:\n' + bad.join('\n'))
  process.exit(2)
}

const git = (...a) => spawnSync('git', a, { encoding: 'utf8' })
const dirty = (file) => git('diff', '--quiet', '--', file).status !== 0 || git('ls-files', '--others', '--exclude-standard', '--', file).stdout.trim() !== ''

let current = null // { file, original }: what must be put back if the process is interrupted
function restore() {
  if (current) {
    writeFileSync(current.file, current.original)
    current = null
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => (restore(), process.exit(130)))
process.on('exit', restore)
process.on('uncaughtException', (e) => {
  restore()
  console.error(e)
  process.exit(1)
})

const results = []
for (const m of selected) {
  if (dirty(m.file)) {
    results.push({ id: m.id, outcome: 'skipped', note: `${m.file} has uncommitted changes: commit or stash them first` })
    continue
  }
  const original = readFileSync(m.file, 'utf8')
  let mutated
  try {
    mutated = applyMutation(original, m.from, m.to)
  } catch (e) {
    results.push({ id: m.id, outcome: 'BROKEN', note: e.message })
    continue
  }
  current = { file: m.file, original }
  writeFileSync(m.file, mutated)
  const run = spawnSync('npx', ['vitest', 'run', ...m.tests, '--maxWorkers=2'], { encoding: 'utf8', shell: true })
  restore()
  if (readFileSync(m.file, 'utf8') !== original) {
    console.error(`${m.file} was NOT restored byte for byte: stop and check git diff`)
    process.exit(3)
  }
  results.push({ id: m.id, outcome: verdict(run.status ?? 1), note: m.why })
  console.log(`${results[results.length - 1].outcome.padEnd(9)} ${m.id}`)
}

const survived = results.filter((r) => r.outcome === 'SURVIVED')
const broken = results.filter((r) => r.outcome === 'BROKEN')
const skipped = results.filter((r) => r.outcome === 'skipped')
console.log(`\n${results.length - survived.length - broken.length - skipped.length} killed · ${survived.length} survived · ${broken.length} broken · ${skipped.length} skipped`)
for (const r of [...survived, ...broken, ...skipped]) console.log(`  ${r.outcome}: ${r.id} — ${r.note}`)
process.exit(survived.length + broken.length > 0 ? 1 : 0)
