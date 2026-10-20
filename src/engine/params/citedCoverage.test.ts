import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { P2026 } from './2026.ts'
import { citedLeaves } from './cited.ts'

// EVERY CITED FIGURE, AND WHETHER A WORKED EXAMPLE FROM AN OFFICIAL PAGE USES IT. 2026.test.ts holds each figure to its literal (so a typo in the params fails); the files in `verified/` hold the engine to
// worked examples printed by the official pages (each opens with a VERIFIED-AGAINST header naming the page). A figure that appears in NO worked example is held by nothing but its own literal: change the
// number and the literal test fails with it, and the engine is never asked whether the figure does what the page says. This inventories them: the figure's VALUE as a literal in any verified test (a
// worked example states what the page prints, not the name of the parameter), and holds the list that has none as a ratchet. A NEW cited figure must be used by a worked example or be added below with its
// reason; a figure that GAINS an example must be taken off the list (a stale entry reads as permission).

const dir = 'src/engine/verified'
const text = readdirSync(dir)
  .filter((f) => f.endsWith('.verified.test.ts'))
  .map((f) => readFileSync(`${dir}/${f}`, 'utf8'))
  .join('\n')
  .replace(/[_   ]/g, '')

const numbersIn = (v: unknown): number[] => (typeof v === 'number' ? [v] : Array.isArray(v) ? v.flatMap(numbersIn) : v !== null && typeof v === 'object' ? Object.values(v).flatMap(numbersIn) : [])
const appears = (n: number) => [...new Set([String(n), String(Math.round(n * 100) / 100)])].some((form) => new RegExp('(^|[^0-9.])' + form.replace('.', '\\.') + '([^0-9]|$)').test(text))

/** The cited figures none of the worked examples states. */
const uncovered = citedLeaves(P2026)
  .filter((l) => numbersIn(l.cited.value).length > 0 && !numbersIn(l.cited.value).some(appears))
  .map((l) => l.path)

const OPEN = 'no worked example from the official page under verified/: held only by its literal in 2026.test.ts'
const ALONE = `${OPEN}, and no test of behaviour states its value either`

/** path → why it has no worked example. The reason IS the entry; the list only shrinks. */
const NO_WORKED_EXAMPLE: Record<string, string> = {
  'rrq.rateSecond': OPEN,
  'rrq.survivorOwnPensionOffset': OPEN,
  'parentalLeave.rateLow': OPEN,
  'longTermCare.chsldPrivateRoom': `${OPEN} (an official monthly rate, not a calculation: an example would be the page's own table; lib/careModel.test.ts states each one)`,
  'longTermCare.chsldSemiPrivateRoom': `${OPEN} (an official monthly rate, not a calculation: an example would be the page's own table; lib/careModel.test.ts states each one)`,
  'longTermCare.chsldWard': `${OPEN} (an official monthly rate, not a calculation: an example would be the page's own table; lib/careModel.test.ts states each one)`,
  'childBenefits.ccb.maxUnder6': OPEN,
  'childBenefits.ccb.max6to17': OPEN,
  'childBenefits.ccb.threshold1': OPEN,
  'childBenefits.ccb.threshold2': OPEN,
  'childBenefits.ccb.topFixedOne': OPEN,
  'childBenefits.ccb.topFixedTwo': OPEN,
  'childBenefits.ccb.topFixedThree': OPEN,
  'childBenefits.ccb.topFixedFourPlus': OPEN,
  'childBenefits.familyAllowance.reductionRate': OPEN,
  'accounts.lifUnlockShareOfMga': OPEN,
}

describe('the cited figures and the worked examples that state them', () => {
  it('walks the figures and the examples (a floor, so an empty walk cannot pass)', () => {
    expect(citedLeaves(P2026).length).toBeGreaterThan(120)
    expect(text.length).toBeGreaterThan(20_000)
  })

  it('most figures are stated by a worked example: the figures with none are the known few, and no new one has slipped in', () => {
    const unknown = uncovered.filter((p) => !(p in NO_WORKED_EXAMPLE))
    expect(unknown, 'a cited figure no worked example from an official page uses: write the example under verified/, or add it to NO_WORKED_EXAMPLE with the reason').toEqual([])
  })

  it('a figure that has gained an example is off the list (a stale entry reads as permission)', () => {
    const stale = Object.keys(NO_WORKED_EXAMPLE).filter((p) => !uncovered.includes(p))
    expect(stale, 'now stated by a worked example: delete the entry').toEqual([])
  })

  // 26 → 16 and 10 → 0 (2026-10-20): the survivor's flat rates and maxima (Retraite Québec's table, the third maximum predicted from two), the two Allowance cut-offs
  // (the official tables' last band), the Allocation famille's 2026 figures (the page's own amounts); the CHSLD rates were stated by lib/careModel.test.ts all along.
  it('the ratchet: at most 16 figures lack an example today, and none is held by nothing but its literal', () => {
    expect(uncovered.length).toBeLessThanOrEqual(16)
    expect(Object.values(NO_WORKED_EXAMPLE).filter((r) => r.startsWith(ALONE)).length).toBe(0)
  })

  it('canary: the detector finds a figure whose value is nowhere in the examples, and one whose value is', () => {
    expect(appears(31415.9265)).toBe(false)
    const bpa = P2026.federal.bpaMax.value
    expect(appears(bpa)).toBe(true)
  })
})
