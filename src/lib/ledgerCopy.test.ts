import { describe, expect, it } from 'vitest'
import { LEDGER_COPY, type LedgerCopy } from './ledgerCopy.ts'

// « Mes données » words live outside the eager dictionaries (ledgerCopy.ts), so i18nParity does not see them: every text
// is present in both languages, non-empty, and not left in the other language.

const { fr, en } = LEDGER_COPY
const sample = (c: LedgerCopy): [string, string][] =>
  Object.entries(c).map(([k, v]) => [k, typeof v === 'function' ? (v as (...a: string[]) => string)('A', 'B', 'C', 'D', 'E', 'F') : typeof v === 'object' ? Object.values(v).join(' ') : (v as string)])

describe('the ledger copy', () => {
  it('has the same keys in both languages, every text non-empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const c of [fr, en]) for (const [k, t] of sample(c)) expect(t.trim(), k).not.toBe('')
  })
  it('puts every argument it is given into the sentence (a dropped one is a missing number)', () => {
    for (const c of [fr, en]) {
      expect(c.rrqCalc('S', 'B', 'F', 'G', 'AJ', 'MM')).toEqual(expect.stringMatching(/S.*B.*F.*G.*AJ.*MM/))
      expect(c.oasCalc('S', 'FU', 'RE', 'MU', 'MM')).toEqual(expect.stringMatching(/S.*FU.*RE.*MU.*MM/))
    }
  })
  it('is not left in the other language', () => {
    for (const [k, t] of sample(en)) expect(t, k).not.toMatch(/ à l’|valeur nette|dollars d’aujourd’hui|Le plan /)
    for (const [k, t] of sample(fr)) expect(t, k).not.toMatch(/ the | a month|The plan/)
  })
})
