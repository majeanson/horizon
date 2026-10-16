// The pure part of the mutation runner (scripts/mutate.mjs): what it means to plant one change in a file, and to take it out again. Kept apart so that it can be tested without touching a source file.

/**
 * `text` with its ONE occurrence of `from` replaced by `to`. A mutation that lands nowhere (the code moved, the text was reworded) or in several places would « prove » a rule just as convincingly as a real
 * run, so both are refused with the reason — the same rule CLAUDE.md gives for planting a bug: check the plant landed, with an exact-match edit.
 */
export function applyMutation(text, from, to) {
  if (from === to) throw new Error('the mutation changes nothing (from and to are the same text)')
  const first = text.indexOf(from)
  if (first < 0) throw new Error('the text to change is not in the file (the code moved, or was reworded: update the mutant)')
  if (text.indexOf(from, first + 1) >= 0) throw new Error('the text to change appears more than once: make it longer until it is unique')
  return text.slice(0, first) + to + text.slice(first + from.length)
}

/** A mutant is well formed when it says where, what, to what, and which tests must notice. */
export function checkMutant(m) {
  const problems = []
  for (const key of ['id', 'file', 'from', 'to', 'why']) if (typeof m[key] !== 'string' || m[key].trim() === '') problems.push(`${key} is missing`)
  if (!Array.isArray(m.tests) || m.tests.length === 0 || m.tests.some((t) => typeof t !== 'string' || !/\.test\.tsx?$/.test(t))) problems.push('tests must list the .test.ts / .test.tsx files that have to fail')
  return problems
}

/** The verdict of one run: the mutant is KILLED when the tests fail (a non-zero exit), and SURVIVED when they pass — the one outcome that needs a new test. */
export function verdict(exitCode) {
  return exitCode === 0 ? 'SURVIVED' : 'killed'
}
