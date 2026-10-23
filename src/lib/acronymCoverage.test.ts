import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { stringLiterals } from './buildGuardScan.ts'
import { GLOSS_SIGLES } from './glossIndex.ts'

// EVERY ABBREVIATION ON SCREEN HAS AN ENTRY IN THE GLOSSARY. A sigle a reader meets in the app (« RRQ », « CHSLD », « RAMQ ») and cannot decode is a place the app stops being understood — and the people
// it is written for are the ones least likely to ask. Gloss.tsx turns a sigle in running text into a tap that says what it is, but only a sigle lib/glossIndex.ts lists. So this reads every string of
// the two dictionaries and of the lazily-loaded copy files, finds each run of three to six capitals (the very pattern Gloss uses), and holds it to the index — or to the list below, WITH THE REASON it
// needs no entry. The list only shrinks: an entry nothing uses any more fails, so an excuse cannot outlive the gap it covered.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Not an abbreviation the reader has to decode, or one that no glossary entry could help with. */
const NO_ENTRY: Record<string, string> = {
  PAR: 'a word the booklet prints in capitals (« PAR MOIS »), quoted so the reader can find it: not an abbreviation',
  MOIS: 'the same: « PAR MOIS » as the booklet prints it',
  PER: 'the same, in English: « PER MONTH » as the booklet prints it',
  MONTH: 'the same, in English',
  MONTHS: 'the name of the months constant in a template (MONTHS_FR[…]), not printed',
  ENGINE: 'the file name ENGINE.md, which the link next to it opens: not an abbreviation',
  CSV: 'a file format named on the button that downloads it (the button says what it does); every spreadsheet program opens it',
  PDF: 'a file format named on the print menu entry that makes it; every phone and computer opens it',
  IGA: 'a grocery chain in the placeholder example of a bank statement line, not a term to decode',
  VUS: 'the everyday French word for an SUV (« véhicule utilitaire sport ») in a sentence about what households spend on cars',
}

const COPY_FILES = [
  'i18n.ts',
  'i18n.en.ts',
  ...readdirSync(join(srcDir, 'lib'))
    .filter((f) => /Copy\.ts$/.test(f) && f !== 'glossaryCopy.ts')
    .map((f) => `lib/${f}`),
]

/** Every sigle in the copy, with the files that print it. */
function sigles(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>()
  for (const file of COPY_FILES) {
    for (const s of stringLiterals(readFileSync(join(srcDir, file), 'utf8'))) {
      for (const m of s.matchAll(/(?<![\p{L}\d])([A-Z]{3,6})(?![\p{L}\d])/gu)) {
        if (!found.has(m[1])) found.set(m[1], new Set())
        found.get(m[1])!.add(file)
      }
    }
  }
  return found
}

describe('abbreviations on screen', () => {
  it('the detector finds a sigle in a sentence and in a template, and skips a comment', () => {
    expect(stringLiterals("const a = 'le RRQ' // un FOO\nconst b = `la ${x} PSV`\n/* BAR */ const c = \"it's QPP\"")).toEqual(['le RRQ', 'la ${x} PSV', "it's QPP"])
  })

  it('every sigle the copy prints is in the glossary index, or excused below with its reason', () => {
    const known = new Set([...Object.keys(GLOSS_SIGLES.fr), ...Object.keys(GLOSS_SIGLES.en)])
    const missing = [...sigles()].filter(([sigle]) => !known.has(sigle) && !(sigle in NO_ENTRY)).map(([sigle, files]) => `${sigle} (${[...files].join(', ')})`)
    expect(missing, 'add an entry to lib/glossaryCopy.ts (and the sigle to lib/glossIndex.ts), or excuse it in NO_ENTRY with the reason').toEqual([])
  })

  it('an excuse is still needed: a sigle that is now explained, or no longer printed, is taken off the list', () => {
    const known = new Set([...Object.keys(GLOSS_SIGLES.fr), ...Object.keys(GLOSS_SIGLES.en)])
    const printed = sigles()
    for (const sigle of Object.keys(NO_ENTRY)) {
      expect(known.has(sigle), `${sigle} has an entry now: take it off NO_ENTRY`).toBe(false)
      expect(printed.has(sigle), `${sigle} is not printed any more: take it off NO_ENTRY`).toBe(true)
    }
  })
})
