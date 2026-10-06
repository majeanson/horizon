import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// THE DOCS STAY A MAP, NOT A PILE.
//
// The project this was scaffolded from grew to eleven root markdown files and a front-door
// document of 4 289 lines whose only open work started at line 3 490 — so the question it
// existed to answer (« what should we work on? ») was behind 81 % of the file. Three habits
// stopped that and each is held here:
//   · `- [ ]` means exactly ONE thing repo-wide: OPEN WORK, and it lives in STATE.md only. A
//     checklist someone is meant to copy gets bullets, not boxes — or it is counted as work
//     nobody will ever do;
//   · STATE.md and CLAUDE.md have a LINE BUDGET that is a ratchet — it may fall, never rise;
//   · every root markdown file is named in STATE.md's document map, so a new one cannot be
//     born without somebody deciding where it fits.

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (name: string) => readFileSync(join(rootDir, name), 'utf8')
const lineCount = (name: string) => read(name).split('\n').length - 1

const ROOT_MD = readdirSync(rootDir).filter((n) => n.endsWith('.md'))

// Ratchets. Lower them in the commit that earns it; never raise them.
const STATE_BUDGET = 200
const CLAUDE_BUDGET = 220

describe('the docs stay a map', () => {
  it('finds the root markdown files (a floor, so an empty listing cannot pass)', () => {
    expect(ROOT_MD).toEqual(expect.arrayContaining(['CLAUDE.md', 'STATE.md', 'COMPONENTS.md', 'ENGINE.md', 'SOURCES.md']))
  })

  it('`- [ ]` appears in STATE.md only — an open checkbox elsewhere is invisible work', () => {
    const stray = ROOT_MD.filter((n) => n !== 'STATE.md').filter((n) => /^\s*- \[ \]/m.test(read(n)))
    expect(stray, 'copy a checklist with bullets, not boxes: `- [ ]` means open work, repo-wide, and lives in STATE.md').toEqual([])
  })

  it('STATE.md and CLAUDE.md stay within their line budgets (ratchets)', () => {
    expect(lineCount('STATE.md'), 'STATE.md grew past its budget — cut what shipped; git keeps it').toBeLessThanOrEqual(STATE_BUDGET)
    expect(lineCount('CLAUDE.md'), 'CLAUDE.md grew past its budget — it is the LAW, not the diary').toBeLessThanOrEqual(CLAUDE_BUDGET)
  })

  it('every root markdown file is named in STATE.md (the document map)', () => {
    const state = read('STATE.md')
    const unmapped = ROOT_MD.filter((n) => n !== 'STATE.md' && !state.includes(n))
    expect(unmapped, 'add the file to the document map in STATE.md §2, with what it is FOR').toEqual([])
  })
})
