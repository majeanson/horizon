import { describe, expect, it } from 'vitest'
import { CASH_BUFFER_COPY, type CashBufferCopy } from './cashBufferCopy.ts'

// The words of the cash-buffer line live outside the eager dictionaries (cashBufferCopy.ts), so the dictionary parity test does not see them. This one does the same
// job for them: every text in both languages, none empty, none left in the other language, and no figure typed into a sentence (they all arrive as arguments).

const { fr, en } = CASH_BUFFER_COPY

/** Every text the copy can print, rendered with sample arguments. */
function texts(c: CashBufferCopy): [string, string][] {
  return [
    ['title', c.title],
    ['empty', c.empty('A', 'B')],
    ['below', c.below('M', 'A', 'B')],
    ['within', c.within('M', 'A', 'B')],
    ['above', c.above('M', 'A', 'B')],
    ['basis', c.basis('L')],
    ['caveat', c.caveat],
    ['caveatTitle', c.caveatTitle],
  ]
}

describe('the cash buffer copy', () => {
  it('has the same texts in both languages, none empty', () => {
    expect(texts(fr).map(([k]) => k)).toEqual(texts(en).map(([k]) => k))
    for (const [k, v] of [...texts(fr), ...texts(en)]) expect(v.trim().length, k).toBeGreaterThan(0)
  })

  it('leaves no long French sentence in the English', () => {
    const e = texts(en)
    texts(fr).forEach(([k, v], i) => {
      if (v.split(' ').length > 3) expect(e[i][1], k).not.toBe(v)
    })
  })

  it('types no number or rate: the months, the band and the dollars are arguments', () => {
    for (const [k, v] of [...texts(fr), ...texts(en)]) expect(v, k).not.toMatch(/\d/)
  })

  it('says the RRSP is not counted, because it is taxable on withdrawal', () => {
    expect(fr.basis('L')).toMatch(/REER.*pas compté.*imposable/)
    expect(en.basis('L')).toMatch(/RRSP is not counted.*taxable/)
  })

  it('never says « pécule »', () => {
    for (const [k, v] of texts(fr)) expect(v.toLowerCase(), k).not.toContain('pécule')
  })
})
