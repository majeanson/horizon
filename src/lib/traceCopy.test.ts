import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from '../engine/golden/household.fixture.ts'
import { agesLedger } from '../engine/ledger.ts'
import { oasTrace, rrqTrace } from '../engine/trace.ts'
import { TRACE_COPY, type TraceCopy } from './traceCopy.ts'

// « D'où vient ce chiffre ? » words live outside the eager dictionaries (traceCopy.ts), so i18nParity does not see them: every text is present in both
// languages, non-empty, not left in the other language, and every label the engine's traces can carry has a word (a missing one would print its key).

const { fr, en } = TRACE_COPY
const sample = (c: TraceCopy): [string, string][] =>
  Object.entries(c).map(([k, v]) => [k, typeof v === 'function' ? (v as (...a: string[]) => string)('A', 'B', 'C', 'D', 'E') : typeof v === 'object' ? Object.values(v).join(' ') : (v as string)])

describe('the trace copy', () => {
  it('has the same keys and the same labels in both languages, every text non-empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    expect(Object.keys(en.labels).sort()).toEqual(Object.keys(fr.labels).sort())
    for (const c of [fr, en]) for (const [k, t] of sample(c)) expect(t.trim(), k).not.toBe('')
  })
  it('has a word for every label the pension traces carry', () => {
    for (const l of agesLedger(H, A)) {
      for (const t of [rrqTrace(l), oasTrace(l)]) {
        const keys = [t.labelKey, `${t.labelKey}Lead`, ...t.parts.map((p) => p.labelKey), ...t.inputs.map((i) => i.labelKey)]
        for (const c of [fr, en]) for (const k of keys) expect(c.labels[k], k).toBeTruthy()
      }
    }
  })
  it('puts every argument it is given into the sentence (a dropped one is a missing number)', () => {
    for (const c of [fr, en]) expect(c.formula('L', 'S', 'E', 'R', 'T')).toEqual(expect.stringMatching(/L.*S.*E.*R.*T/))
  })
  it('is not left in the other language', () => {
    for (const [k, t] of sample(en)) expect(t, k).not.toMatch(/ à l’|dollars d’aujourd’hui|par mois|page officielle|Début/)
    for (const [k, t] of sample(fr)) expect(t, k).not.toMatch(/ the | a month|official page|today’s/)
  })
})
