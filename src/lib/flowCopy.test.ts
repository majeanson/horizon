import { describe, expect, it } from 'vitest'
import { EXPENSE_SEGMENTS, SOURCE_SEGMENTS } from './chartData.ts'
import { FLOW_COPY } from './flowCopy.ts'

// The words of « Où va l'argent » and « Une année en détail », in both languages: the same keys, every segment named, nothing empty, no English that is French pasted in, and
// no figure typed in them (the amounts arrive formatted).

const { fr, en } = FLOW_COPY
const texts = (w: typeof fr): [string, string][] => [
  ['title', w.title],
  ['hint', w.hint],
  ['personNote', w.personNote],
  ['perMonthHint', w.perMonthHint],
  ...EXPENSE_SEGMENTS.map((s): [string, string] => [`segment.${s}`, w.segment[s]]),
  ['figure.year', w.figure(2026, 2076, false)],
  ['figure.month', w.figure(2026, 2076, true)],
  ['readout.title', w.readout.title],
  ['readout.hint', w.readout.hint],
  ['readout.year', w.readout.year],
  ['readout.comesIn', w.readout.comesIn],
  ['readout.goesOut', w.readout.goesOut],
  ['readout.total.year', w.readout.total('§', false)],
  ['readout.total.month', w.readout.total('§', true)],
  ['readout.none', w.readout.none],
  ...SOURCE_SEGMENTS.map((s): [string, string] => [`readout.source.${s}`, w.readout.source[s]]),
  ['readout.unmet.year', w.readout.unmet('§', false)],
  ['readout.unmet.month', w.readout.unmet('§', true)],
]

describe('the flow words, in both languages', () => {
  it('have the same keys, name every segment of both charts, and say nothing empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    expect(Object.keys(en.readout).sort()).toEqual(Object.keys(fr.readout).sort())
    for (const lang of [fr, en]) {
      expect(Object.keys(lang.segment).sort()).toEqual([...EXPENSE_SEGMENTS].sort())
      expect(Object.keys(lang.readout.source).sort()).toEqual([...SOURCE_SEGMENTS].sort())
      for (const [k, v] of texts(lang)) expect(v.replace(/§/g, '').trim().length, k).toBeGreaterThan(0)
    }
  })

  it('say a month and a year differently, and a month in the right words', () => {
    expect(fr.readout.total('§', true)).toContain('par mois')
    expect(fr.readout.total('§', false)).toContain('par année')
    expect(en.readout.total('§', true)).toContain('a month')
    expect(en.readout.total('§', false)).toContain('a year')
  })

  it('English is not French pasted in', () => {
    const frTexts = new Map(texts(fr))
    for (const [k, v] of texts(en)) if (v.length > 30) expect(v, k).not.toBe(frTexts.get(k))
  })

  it('type no figure of their own: every digit that reaches the screen is handed to them', () => {
    for (const lang of [fr, en]) {
      for (const [k, v] of texts(lang)) {
        // the figure sentences are given a year range on purpose (a label for assistive technology); everything else must be free of digits
        if (k.startsWith('figure.')) continue
        expect(v, k).not.toMatch(/\d/)
      }
    }
  })
})
