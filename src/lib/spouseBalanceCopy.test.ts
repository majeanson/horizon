import { describe, expect, it } from 'vitest'
import { SPOUSE_BALANCE_COPY, type SpouseBalanceCopy } from './spouseBalanceCopy.ts'

// The words of « Égaliser les REER des partenaires » live outside the eager dictionaries (spouseBalanceCopy.ts), so the dictionary parity test does not see them. This one does the same
// job for them: every text present in both languages, none empty, none left in the other language, and no rate, threshold or count of years typed into a sentence (they come from the engine).

const { fr, en } = SPOUSE_BALANCE_COPY

/** Every text the copy can print, rendered with sample arguments. */
function texts(c: SpouseBalanceCopy): [string, string][] {
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(c)) {
    if (typeof v === 'string') out.push([k, v])
    else if (typeof v === 'object') for (const [kk, vv] of Object.entries(v)) out.push([`${k}.${kk}`, vv as string])
  }
  out.push(['hint', c.hint(60)], ['age', c.age(60)], ['rrspOf', c.rrspOf('Camille')], ['effect.less', c.effect({ tax: '1 000 $', less: true })], ['effect.more', c.effect({ tax: '1 000 $', less: false })], ['effect.same', c.effect({ tax: null, less: true })])
  for (const [name, f] of [['better', c.better], ['nudge', c.nudge]] as const) {
    out.push([`${name}.years`, f('250 000 $', '1 000 $', 58, 62)], [`${name}.never`, f('250 000 $', '1 000 $', 58, null)], [`${name}.tax`, f('250 000 $', '1 000 $', null, 60)])
  }
  return out
}

describe('the spouses’ RRSP copy', () => {
  it('has the same texts in both languages, none empty', () => {
    expect(texts(fr).map(([k]) => k)).toEqual(texts(en).map(([k]) => k))
    for (const [k, v] of [...texts(fr), ...texts(en)]) expect(v.trim().length, k).toBeGreaterThan(0)
  })

  it('leaves no long French sentence in the English, and the other way round', () => {
    const e = texts(en)
    texts(fr).forEach(([k, v], i) => {
      if (v.split(' ').length > 3) expect(e[i][1], k).not.toBe(v)
    })
  })

  it('types no rate, threshold or count of years: those come from the engine', () => {
    // the sample arguments above carry their own figures (250 000 $, 1 000 $); only the fixed sentences are scanned
    const fixed = (c: SpouseBalanceCopy) => [c.title, c.nav, c.level, c.plan, c.rows.current, c.rows.balanced, c.howTitle, c.how, c.caveat]
    for (const v of [...fixed(fr), ...fixed(en)]) {
      expect(v).not.toMatch(/\d+(?:[.,]\d+)?\s?%/)
      expect(v).not.toMatch(/\d{2}[\s ,.]?\d{3}/)
      expect(v).not.toMatch(/\b(?:3|three|trois)\b/i)
    }
  })

  it('never says « pécule »', () => {
    for (const [k, v] of texts(fr)) expect(v.toLowerCase(), k).not.toContain('pécule')
  })
})
