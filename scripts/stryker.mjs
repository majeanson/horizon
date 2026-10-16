// STRYKER, NARROWLY. Stryker mutates automatically (every operator, every literal) and so finds what scripts/mutate.mjs — whose mutants are chosen by hand — does not think to try. It is also slow, and a
// score is not the point: a SURVIVING mutant is a question (is this behaviour unpinned, or is the mutant equivalent?). So it runs on one engine file at a time, against only the tests that cover it, never in CI.
//
//   npm run stryker -- src/engine/bracketFill.ts     one of the targets below
//   npm run stryker -- --list                         the targets
import { spawnSync } from 'node:child_process'

// WHAT THE FIRST RUNS FOUND (2026-10-16). Real gaps, each now pinned by a test: bracketFill.ts — the federal top of the first bracket was never the lower one (one direction tested, 87.5 % → 100 %); accounts.ts —
// the unlock line was never stood ON (lockedIn.test.ts); oas.ts — the lookup past the last row of a published table was reached by nothing (oas.curves.test.ts); survivor.ts — the birthdays 45 and 65 and the
// whole of the cap were never reached (survivor.edges.test.ts). EQUIVALENT mutants, left as they are: nonRegWithdraw's early return for « nothing to take » (the long path returns the same values); oas.ts's sort
// of integer keys that are already ascending, its residence mutants (a person resident since birth has more than 40 years by 65 whichever 18 is counted from), its curve cut-offs (the formula is already zero
// there) and its curves' last points (they end at zero); survivor.ts line 65 (« no pension of their own » read as a pension of nothing gives the same figure at any realistic size).

/** target file → the tests that exercise it (what Stryker's runner includes: vitest.stryker.config.ts). */
export const TARGETS = {
  'src/engine/bracketFill.ts': ['src/engine/bracketFill.test.ts', 'src/engine/bracketFillCompare.test.ts'],
  'src/engine/accounts.ts': ['src/engine/verified/accounts.verified.test.ts', 'src/engine/retirement.props.test.ts', 'src/engine/lockedIn.test.ts'],
  'src/engine/oas.ts': ['src/engine/oas.props.test.ts', 'src/engine/verified/oas.verified.test.ts', 'src/engine/oracle.test.ts', 'src/engine/oas.curves.test.ts'],
  'src/engine/survivor.ts': ['src/engine/survivor.test.ts', 'src/engine/survivor.edges.test.ts', 'src/engine/verified/survivor.verified.test.ts', 'src/engine/death.test.ts'],
}

const arg = process.argv[2]
if (arg === '--list' || arg === undefined) {
  for (const [file, tests] of Object.entries(TARGETS)) console.log(`${file}\n    ${tests.join('\n    ')}`)
  process.exit(arg === undefined ? 2 : 0)
}
const tests = TARGETS[arg]
if (!tests) {
  console.error(`not a target: ${arg} (npm run stryker -- --list)`)
  process.exit(2)
}
const run = spawnSync('npx', ['stryker', 'run', '--mutate', arg], { stdio: 'inherit', shell: true, env: { ...process.env, STRYKER_TESTS: tests.join(',') } })
process.exit(run.status ?? 1)
