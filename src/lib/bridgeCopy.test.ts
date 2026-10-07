import { describe, expect, it } from 'vitest'
import { STRATEGY_KEYS } from '../engine/bridge.ts'
import { paramsFor } from '../engine/params/index.ts'
import { BRIDGE_COPY, type BridgeCopy } from './bridgeCopy.ts'
import type { Verdict } from './bridgeModel.ts'

// The words of « Mes années 60 à 70 » live outside the eager dictionaries (a budget reason: bridgeCopy.ts), so the
// dictionary parity test does not see them. This one does the same job for them: every text present in both languages,
// none empty, none left in the other language, and the claims the copy makes are the ones the engine pins.

const { fr, en } = BRIDGE_COPY

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
    if (typeof v === 'string') out.push([k, v])
    else if (Array.isArray(v)) v.forEach((line, i) => out.push([`${k}.${i}`, line]))
    else if (typeof v === 'function') {
      if (k === 'verdict') VERDICTS.forEach((verdict, i) => out.push([`verdict.${i}`, c.verdict(verdict)]))
      else if (k === 'nestHint') out.push([k, c.nestHint(65, 70)])
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
    expect(en.why.length).toBe(fr.why.length)
    expect(en.caveats.length).toBe(fr.caveats.length)
  })

  it('English is not French pasted in: every sentence-length text differs between the languages', () => {
    const frTexts = new Map(texts(fr))
    for (const [k, v] of texts(en)) if (v.length > 30) expect(v, k).not.toBe(frTexts.get(k))
  })

  it('the five strategies have five different names, in each language', () => {
    for (const c of [fr, en]) expect(new Set(Object.values(c.strategyName)).size).toBe(5)
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
    expect(fr.why[0]).toContain('0,7 %')
    expect(fr.why[0]).toContain('58,8 %')
    expect(fr.why[0]).toContain('0,6 %')
    expect(fr.why[0]).toContain('36 %')
    expect(en.why[0]).toContain('0.7%')
    expect(en.why[0]).toContain('58.8%')
    expect(en.why[0]).toContain('0.6%')
    expect(en.why[0]).toContain('36%')
  })

  it('names the three sets of assumptions and the levers’ ranges as the page offers them', () => {
    for (const c of [fr, en]) expect(Object.keys(c.presetName).sort()).toEqual(['bold', 'neutral', 'prudent'])
    expect(fr.leverHint).toContain('60 à 72')
    expect(fr.leverHint).toContain('65 à 70')
    expect(en.leverHint).toContain('60 to 72')
    expect(en.leverHint).toContain('65 to 70')
  })
})
