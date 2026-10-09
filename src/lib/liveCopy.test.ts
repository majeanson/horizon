import { describe, expect, it } from 'vitest'
import { LIVE_COPY, type LiveCopy } from './liveCopy.ts'

// The words of the live answer live outside the eager dictionaries (liveCopy.ts), so the dictionary parity test cannot see
// them: both languages, every text non-empty, the two languages different, the plural right.

const texts = (c: LiveCopy): string[] => [c.label, c.at(59), c.now, c.none(70), c.earlier(1), c.earlier(3), c.later(1), c.later(2), c.found, c.lost, c.see, c.working]

describe('the live answer copy', () => {
  it('has every text in both languages, none empty, none shared between them', () => {
    const fr = texts(LIVE_COPY.fr)
    const en = texts(LIVE_COPY.en)
    expect(fr.length).toBe(en.length)
    fr.forEach((f, i) => {
      expect(f.trim(), `fr ${i}`).not.toBe('')
      expect(en[i].trim(), `en ${i}`).not.toBe('')
      if (f !== '…') expect(f, `en ${i} is not translated`).not.toBe(en[i])
    })
  })
  it('says one year in the singular and the rest in the plural', () => {
    expect(LIVE_COPY.fr.earlier(1)).toContain('1 an ')
    expect(LIVE_COPY.fr.earlier(3)).toContain('3 ans ')
    expect(LIVE_COPY.en.later(1)).toContain('1 year ')
    expect(LIVE_COPY.en.later(2)).toContain('2 years ')
  })
})
