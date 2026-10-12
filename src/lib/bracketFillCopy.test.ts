import { describe, expect, it } from 'vitest'
import { BRACKET_FILL_COPY, type BracketFillCopy } from './bracketFillCopy.ts'

// The words of « Jusqu’où fondre le REER ? » live outside the eager dictionaries (bracketFillCopy.ts), so the dictionary parity test does not see them. This one does the same
// job for them: every text present in both languages, none empty, none left in the other language, and no rate or threshold typed into a sentence (they come from the engine).

const { fr, en } = BRACKET_FILL_COPY

/** Every text the copy can print, rendered with sample arguments. */
function texts(c: BracketFillCopy): [string, string][] {
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(c)) {
    if (typeof v === 'string') out.push([k, v])
    else if (typeof v === 'object') for (const [kk, vv] of Object.entries(v)) out.push([`${k}.${kk}`, vv as string])
  }
  const less = { tax: '1 000 $', taxLess: true, peak: '1 $', peakOff: '2 $', peakSmaller: true, tfsa: '3 $', tfsaMore: true }
  const same = { tax: null, taxLess: false, peak: '2 $', peakOff: '1 $', peakSmaller: false, tfsa: '3 $', tfsaMore: false }
  out.push(['current', c.current('X')], ['leaves', c.leaves(2036, 70)], ['effect.less', c.effect(less)], ['effect.same', c.effect(same)])
  out.push(['hint', c.hint(60)], ['age', c.age(60)], ['tooltip', c.tooltip(60, 2030)], ['incomeFigure', c.incomeFigure(60, 95)], ['balancesFigure', c.balancesFigure(60, 95)])
  for (const [name, f] of [['better', c.better], ['nudge', c.nudge]] as const) {
    out.push([`${name}.years`, f('X', 58, 62, '1 000 $')], [`${name}.never`, f('X', 58, null, '1 000 $')], [`${name}.tax`, f('X', null, 60, '1 000 $')])
  }
  return out
}

describe('the meltdown copy', () => {
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

  it('types no rate or threshold: those come from the engine', () => {
    for (const [k, v] of [...texts(fr), ...texts(en)]) {
      expect(v, k).not.toMatch(/\d+(?:[.,]\d+)?\s?%/)
      expect(v, k).not.toMatch(/\d{2}[\s ,.]?\d{3}/) // no 58 523, 95 323… (a year such as 2030 has no group)
    }
  })

  it('never says « pécule »', () => {
    for (const [k, v] of texts(fr)) expect(v.toLowerCase(), k).not.toContain('pécule')
  })
})
