import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { stringLiterals } from './buildGuardScan.ts'

// A SENTENCE A PERSON CAN HOLD IN MIND. The app is read by people who may read slowly, in a second language, or with a magnifier: a sentence of fifty words with two parentheses in it is a sentence
// they give up on. This reads every string of the two dictionaries and the lazily-loaded copy files, cuts it into sentences (a template's figures stand in as one word each), and holds the long ones
// to a ratchet: no sentence over `HARD` words, and no more than `LONG_ALLOWED` over `LONG`. The numbers only fall — a long sentence somebody cuts in two lowers the count, and the list below says where the
// ones left are, so the next person to touch that file knows what to do. (A file name or an address is not a sentence: strings under forty characters and links are skipped.)

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const LONG = 45
const HARD = 60
/** How many sentences over `LONG` words are left today (the two in spouseBalanceCopy and levelsCopy). Lower it with the sentence; never raise it. */
const LONG_ALLOWED = 2

const COPY_FILES = [
  'i18n.ts',
  'i18n.en.ts',
  ...readdirSync(join(srcDir, 'lib'))
    .filter((f) => /Copy\.ts$/.test(f) && f !== 'glossaryCopy.ts')
    .map((f) => `lib/${f}`),
]

/** The sentences of a string, each with its length in words. */
export function sentencesOf(s: string): { words: number; text: string }[] {
  const plain = s.replace(/\$\{[^}]*\}/g, 'X')
  return plain
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ«“"(])/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((text) => ({ words: text.split(/\s+/).length, text }))
}

function allSentences(): { words: number; text: string; file: string }[] {
  const out: { words: number; text: string; file: string }[] = []
  for (const file of COPY_FILES) {
    for (const s of stringLiterals(readFileSync(join(srcDir, file), 'utf8'))) {
      if (s.length < 40 || /^[a-z]+:\/\//.test(s)) continue
      for (const sentence of sentencesOf(s)) out.push({ ...sentence, file })
    }
  }
  return out
}

describe('sentences', () => {
  it('the splitter cuts after a full stop that begins a new capital, and counts a template figure as a word', () => {
    expect(sentencesOf('Un deux trois. Quatre cinq.').map((x) => x.words)).toEqual([3, 2])
    expect(sentencesOf('Vous avez ${n} ans et ${m} mois.').map((x) => x.words)).toEqual([7])
    expect(sentencesOf('Il coûte 2.5 fois plus, soit 3.').map((x) => x.words)).toEqual([7])
  })

  it('there are thousands of them (a floor: a scan that reads nothing must not pass), and nine in ten are twenty-five words or fewer', () => {
    const all = allSentences()
    expect(all.length).toBeGreaterThan(2000)
    expect(all.filter((s) => s.words <= 25).length / all.length).toBeGreaterThan(0.9)
  })

  it(`none is over ${HARD} words, and no more than ${LONG_ALLOWED} are over ${LONG}`, () => {
    const all = allSentences()
    const hard = all.filter((s) => s.words > HARD).map((s) => `${s.words} words, ${s.file}: ${s.text.slice(0, 100)}`)
    expect(hard, 'cut it in two').toEqual([])
    const long = all.filter((s) => s.words > LONG).sort((a, b) => b.words - a.words)
    expect(long.map((s) => `${s.words} words, ${s.file}: ${s.text.slice(0, 100)}`), 'a new long sentence: cut it, or this is a decision').toHaveLength(Math.min(long.length, LONG_ALLOWED))
  })
})
