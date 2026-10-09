import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STRATEGY_KEYS } from '../engine/bridge.ts'
import { paramsFor } from '../engine/params/index.ts'
import { formatPct } from './format.ts'
import { BRIDGE_COPY, type BridgeCopy } from './bridgeCopy.ts'
import type { Verdict } from './bridgeModel.ts'

// The words of « Mes années 60 à 70 » live outside the eager dictionaries (a budget reason: bridgeCopy.ts), so the
// dictionary parity test does not see them. This one does the same job for them: every text present in both languages,
// none empty, none left in the other language, and the claims the copy makes are the ones the engine pins.

const { fr, en } = BRIDGE_COPY

const FACTS = (() => {
  const P = paramsFor(2026, { inflation: 0.021, wageGrowth: 0.031 })
  return { rrqPerMonth: P.rrq.latePerMonth, rrqLateMax: P.rrq.latePerMonth * P.rrq.lateMaxMonths, oasPerMonth: P.oas.deferralPerMonth, oasLateMax: P.oas.deferralPerMonth * P.oas.deferralMaxMonths }
})()
const whyArgs = (lang: 'fr' | 'en') => ({ rrqPerMonth: formatPct(FACTS.rrqPerMonth, lang, 1), rrqMax: formatPct(FACTS.rrqLateMax, lang, 1), oasPerMonth: formatPct(FACTS.oasPerMonth, lang, 1), oasMax: formatPct(FACTS.oasLateMax, lang, 0) })

const VERDICTS: Verdict[] = [
  { kind: 'holds', defers: false, horizonAge: 95 },
  { kind: 'holds', defers: true, horizonAge: 95 },
  { kind: 'fails', defers: true, age: 78, standardHolds: true, standardAge: null },
  { kind: 'fails', defers: true, age: 78, standardHolds: false, standardAge: 81 },
  { kind: 'fails', defers: false, age: 78, standardHolds: false, standardAge: 78 },
  { kind: 'fails', defers: true, age: 78, standardHolds: false, standardAge: null },
]

/** Every text the copy can print, rendered with sample arguments. */
function texts(c: BridgeCopy): [string, string][] {
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(c)) {
    if (k === 'sweep') {
      const s = c.sweep
      out.push(['sweep.title.alone', s.title(null)], ['sweep.title.named', s.title('Camille')], ['sweep.hint.alone', s.hint(null)], ['sweep.hint.named', s.hint('Camille')])
      for (const [kk, vv] of Object.entries(s.tabs)) out.push([`sweep.tabs.${kk}`, vv])
      for (const [kk, vv] of Object.entries(s.tabHint)) out.push([`sweep.tabHint.${kk}`, vv])
      out.push(['sweep.diesAt', s.diesAt], ['sweep.agesNote', s.agesNote], ['sweep.unitsNote', s.unitsNote], ['sweep.best', s.best], ['sweep.bestNarrow', s.bestNarrow], ['sweep.short', s.short], ['sweep.shortCell', s.shortCell(81)], ['sweep.empty', s.empty], ['sweep.pending', s.pending])
    } else if (typeof v === 'string') out.push([k, v])
    else if (Array.isArray(v)) v.forEach((line, i) => out.push([`${k}.${i}`, line]))
    else if (typeof v === 'function') {
      if (k === 'why') c.why(whyArgs(c === en ? 'en' : 'fr')).forEach((line, i) => out.push([`why.${i}`, line]))
      else if (k === 'verdict') VERDICTS.forEach((verdict, i) => out.push([`verdict.${i}`, c.verdict(verdict)]))
      else if (k === 'nestHint') out.push([k, c.nestHint(65, 70)])
      else if (k === 'applied') out.push([k, c.applied({ name: 'Camille', rrq: c.age(70), oas: c.age(70), prevRrq: c.age(65), prevOas: c.age(65), both: true })])
      else if (k === 'tooltip') out.push([k, c.tooltip(62, 2054)])
      else if (k === 'barsFigure' || k === 'nestFigure') out.push([k, (v as (a: number, b: number) => string)(60, 70)])
      else out.push([k, (v as (a: never, b: never) => string)(7 as never, 8 as never)])
    } else for (const [kk, vv] of Object.entries(v as Record<string, string>)) out.push([`${k}.${kk}`, vv])
  }
  return out
}

describe('the bridge copy, in both languages', () => {
  it('has the same keys, a text for every strategy and status, and nothing empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const c of [fr, en]) {
      for (const [k, v] of texts(c)) expect(v.trim().length, k).toBeGreaterThan(0)
      expect(Object.keys(c.strategyName).sort()).toEqual([...STRATEGY_KEYS].sort())
      expect(Object.keys(c.strategyLine).sort()).toEqual([...STRATEGY_KEYS].sort())
      expect(Object.keys(c.status).sort()).toEqual(['covered', 'drawing', 'short'])
    }
    expect(en.why(whyArgs('en')).length).toBe(fr.why(whyArgs('fr')).length)
    expect(en.caveats.length).toBe(fr.caveats.length)
  })

  it('English is not French pasted in: every sentence-length text differs between the languages', () => {
    const frTexts = new Map(texts(fr))
    for (const [k, v] of texts(en)) if (v.length > 30) expect(v, k).not.toBe(frTexts.get(k))
  })

  it('the six strategies have six different names, in each language', () => {
    for (const c of [fr, en]) expect(new Set(Object.values(c.strategyName)).size).toBe(6)
  })

  it('every verdict names the age it speaks of, and the failing ones say what starting at 65 would do', () => {
    for (const c of [fr, en]) {
      expect(c.verdict(VERDICTS[0])).toContain('95')
      expect(c.verdict(VERDICTS[1])).toContain('95')
      for (const v of VERDICTS.slice(2)) expect(c.verdict(v)).toContain('78')
      expect(c.verdict(VERDICTS[2])).toContain('65')
      expect(c.verdict(VERDICTS[3])).toContain('81')
    }
  })

  it('says what the rules pin: +0.7 % a month for the QPP up to 58.8 %, +0.6 % a month for the OAS up to 36 %', () => {
    const P = paramsFor(2026, { inflation: 0.021, wageGrowth: 0.031 })
    expect(P.rrq.latePerMonth).toBeCloseTo(0.007, 10)
    expect(P.rrq.latePerMonth * P.rrq.lateMaxMonths).toBeCloseTo(0.588, 10)
    expect(P.oas.deferralPerMonth).toBeCloseTo(0.006, 10)
    expect(P.oas.deferralPerMonth * P.oas.deferralMaxMonths).toBeCloseTo(0.36, 10)
    // The copy is handed the rates (view.facts, from the cited params): it prints them in the reader's language …
    const norm = (t: string) => t.replace(/[  ]/g, ' ')
    const f = norm(fr.why(whyArgs('fr'))[0])
    for (const t of ['0,7 %', '58,8 %', '0,6 %', '36 %']) expect(f).toContain(t)
    const e = norm(en.why(whyArgs('en'))[0])
    for (const t of ['0.7%', '58.8%', '0.6%', '36%']) expect(e).toContain(t)
    // … and never types them: a rate retyped in the copy would drift from the params without a test noticing.
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bridgeCopy.ts'), 'utf8')
    expect(source).not.toMatch(/0,7 %|58,8 %|0,6 %|36 %|0.7%|58.8%|0.6%|36%/)
  })

})

describe('canary: the « not French pasted in » check can fail', () => {
  it('French used as the English copy is caught by the very comparison the real test makes', () => {
    const frTexts = new Map(texts(fr))
    const pastedIn = texts(fr).filter(([k, v]) => v.length > 30 && v === frTexts.get(k))
    expect(pastedIn.length).toBeGreaterThan(5)
    const real = texts(en).filter(([k, v]) => v.length > 30 && v === frTexts.get(k))
    expect(real).toEqual([])
  })
})
