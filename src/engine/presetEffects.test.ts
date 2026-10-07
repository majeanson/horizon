import { describe, expect, it, vi } from 'vitest'
import { ASSUMPTION_PRESETS, PRESET_KEYS, presetOf, withPreset, type PresetKey } from './assumptionPresets.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import { everyoneAt, retireAt } from './retireAt.ts'
import { presetVerdicts, sensitivityCells, shifted } from './simulate.ts'
import type { Assumptions, YearRow } from './types.ts'

// The grid test runs ~27 projections (5.6 s alone, 8 s on a busy machine) — over vitest's 5 s default, so it flaked.
vi.setConfig({ testTimeout: 60_000 })

// WHY THE THREE SETS GIVE SUCH DIFFERENT GRAPHS — pinned, so no difference is unexplained.
//
// prudent / neutral / bold change exactly four things (inflation, wage growth, the three returns, the horizon age) and
// nothing else. The first year is therefore identical; the gap is pure COMPOUNDING over 50 years, and it is dominated by
// the returns (1,5 pt either way). The horizon only changes how long the chart runs. Inflation inflates every nominal
// figure, so a nominal chart of « prudent » looks BIGGER than « neutral » even though it is worse in today's dollars.

const H = GOLDEN_HOUSEHOLD
const NEUTRAL: Assumptions = withPreset(GOLDEN_ASSUMPTIONS, 'neutral')
const at = (age: number, a: Assumptions): YearRow[] => project(H, a, everyoneAt(H, age))
const real = (rows: readonly YearRow[], a: Assumptions, year: number): number =>
  rows.find((r) => r.year === year)!.household.netWorthEnd / (1 + a.inflation) ** (year - a.today.year)

type Lever = 'inflation' | 'wageGrowth' | 'returns'
const LEVERS: readonly Lever[] = ['inflation', 'wageGrowth', 'returns']
/** Neutral, with ONE lever moved to a preset's value (the horizon is kept, so the rows line up year for year). */
const onlyLever = (lever: Lever, key: PresetKey): Assumptions => ({ ...NEUTRAL, [lever]: ASSUMPTION_PRESETS[key][lever] })

const AGES = [60, 65] as const
const PROBE_YEAR = 2050

describe('the starting point is the same under every set — only compounding separates them', () => {
  it('the first year (this one) has the same spending, employment, income and tax under prudent, neutral and bold', () => {
    const first = PRESET_KEYS.map((k) => at(60, withPreset(GOLDEN_ASSUMPTIONS, k))[0])
    for (const r of first.slice(1)) {
      expect(r.household.spending).toBe(first[0].household.spending)
      expect(r.household.grossIncome).toBe(first[0].household.grossIncome)
      expect(r.household.tax).toBe(first[0].household.tax)
      for (const id of ['self', 'spouse'] as const) {
        expect(r.persons[id]!.employment).toBe(first[0].persons[id]!.employment)
        expect(r.persons[id]!.netIncome).toBe(first[0].persons[id]!.netIncome)
      }
    }
  })

  it('in today\'s dollars the spending is the SAME every year under every set — inflation only rescales the nominal chart', () => {
    for (const k of PRESET_KEYS) {
      const a = withPreset(GOLDEN_ASSUMPTIONS, k)
      for (const r of at(60, a)) {
        const todays = r.household.spending / (1 + a.inflation) ** (r.year - a.today.year)
        // retired figure once both have left work, the working figure before — never anything else
        expect([88_000, 100_000].some((v) => Math.abs(todays - v) < 1), `${k} ${r.year}`).toBe(true)
      }
    }
  })

  it('so in NOMINAL dollars prudent spends MORE than neutral, and neutral more than bold, by 2060 — the chart that looks « bigger » is not better', () => {
    const nominal = (k: PresetKey) => at(60, withPreset(GOLDEN_ASSUMPTIONS, k)).find((r) => r.year === 2060)!.household.spending
    expect(nominal('prudent')).toBeGreaterThan(nominal('neutral'))
    expect(nominal('neutral')).toBeGreaterThan(nominal('bold'))
  })
})

describe('the horizon only changes how long the plan runs, never what happens before it', () => {
  it('a shorter horizon is exactly the first rows of a longer one', () => {
    const long = at(60, { ...NEUTRAL, horizonAge: 100 })
    for (const horizonAge of [90, 95]) {
      const short = at(60, { ...NEUTRAL, horizonAge })
      expect(short.length).toBe(1981 + horizonAge - NEUTRAL.today.year + 1)
      expect(short).toEqual(long.slice(0, short.length))
    }
  })

  it('each set\'s chart ends where its horizon says: prudent 100, neutral 95, bold 90 for the youngest (born 1981)', () => {
    const last = (k: PresetKey) => at(60, withPreset(GOLDEN_ASSUMPTIONS, k)).at(-1)!.year
    expect([last('prudent'), last('neutral'), last('bold')]).toEqual([2081, 2076, 2071])
  })
})

describe('each lever, moved alone from neutral, pushes the plan the way the label says', () => {
  for (const age of AGES) {
    const base = real(at(age, NEUTRAL), NEUTRAL, PROBE_YEAR)

    it(`retiring at ${age}: lower returns / higher inflation / lower wages are worse in ${PROBE_YEAR} (today's dollars); the other way is better`, () => {
      const nw = (lever: Lever, key: PresetKey) => real(at(age, onlyLever(lever, key)), onlyLever(lever, key), PROBE_YEAR)
      expect(nw('returns', 'prudent')).toBeLessThan(base)
      expect(nw('returns', 'bold')).toBeGreaterThan(base)
      expect(nw('inflation', 'prudent')).toBeLessThan(base)
      expect(nw('inflation', 'bold')).toBeGreaterThan(base)
      expect(nw('wageGrowth', 'prudent')).toBeLessThan(base)
      expect(nw('wageGrowth', 'bold')).toBeGreaterThan(base)
    })

    it(`retiring at ${age}: the RETURNS are the biggest lever, in both directions — what the eye reads as « huge »`, () => {
      for (const key of ['prudent', 'bold'] as const) {
        const gap = (lever: Lever) => Math.abs(real(at(age, onlyLever(lever, key)), onlyLever(lever, key), PROBE_YEAR) - base)
        expect(gap('returns')).toBeGreaterThan(gap('inflation'))
        expect(gap('returns')).toBeGreaterThan(gap('wageGrowth'))
      }
    })
  }

  it('the earliest age that works never moves the wrong way for any single lever', () => {
    const earliest = (a: Assumptions) => retireAt(H, a, { stopAtFirstOk: true }).earliestOk ?? Infinity
    const n = earliest(NEUTRAL)
    for (const lever of LEVERS) {
      expect(earliest(onlyLever(lever, 'prudent')), `${lever} prudent`).toBeGreaterThanOrEqual(n)
      expect(earliest(onlyLever(lever, 'bold')), `${lever} bold`).toBeLessThanOrEqual(n)
    }
    expect(earliest({ ...NEUTRAL, horizonAge: 100 })).toBeGreaterThanOrEqual(n)
    expect(earliest({ ...NEUTRAL, horizonAge: 90 })).toBeLessThanOrEqual(n)
  })
})

describe('the sets diverge steadily — a gap that compounds, not a jump', () => {
  it('retiring at 65, the real net worth ordering bold > neutral > prudent holds from 2030 on, and the bold–prudent gap only widens while working', () => {
    const rows = Object.fromEntries(PRESET_KEYS.map((k) => [k, at(65, withPreset(GOLDEN_ASSUMPTIONS, k))])) as Record<PresetKey, YearRow[]>
    const a = (k: PresetKey) => withPreset(GOLDEN_ASSUMPTIONS, k)
    const gaps: number[] = []
    for (const y of [2030, 2040, 2050]) {
      const [p, n, b] = (['prudent', 'neutral', 'bold'] as const).map((k) => real(rows[k], a(k), y))
      expect(b, `${y}`).toBeGreaterThan(n)
      expect(n, `${y}`).toBeGreaterThan(p)
      gaps.push(b - p)
    }
    expect(gaps[1]).toBeGreaterThan(gaps[0])
    expect(gaps[2]).toBeGreaterThan(gaps[1])
  })

  it('every set\'s rows are sane: balanced books, finite numbers, no negative account (a harsh set must not break the engine)', () => {
    for (const k of PRESET_KEYS) {
      for (const age of AGES) {
        for (const r of at(age, withPreset(GOLDEN_ASSUMPTIONS, k))) {
          const people = Object.values(r.persons)
          const putAway = people.reduce((s, p) => s + p.rrqContribution + p.payrollContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
          expect(r.household.grossIncome - r.household.tax - putAway, `${k} ${age} ${r.year}`).toBeCloseTo(r.household.spending - r.household.shortfall, 1)
          expect(Number.isFinite(r.household.netWorthEnd), `${k} ${age} ${r.year}`).toBe(true)
          for (const p of people) for (const v of Object.values(p.balancesEnd)) expect(v, `${k} ${age} ${r.year}`).toBeGreaterThanOrEqual(-0.005)
        }
      }
    }
  })
})

describe('inflation and wage growth reach the government figures the way each one\'s index rule says', () => {
  it('a bracket threshold 34 years out is the 2026 one × (1 + inflation)^34, so the tax scale keeps pace in real terms', () => {
    const base = paramsFor(2026, { inflation: 0.02, wageGrowth: 0.03 })
    for (const k of PRESET_KEYS) {
      const p = ASSUMPTION_PRESETS[k]
      const far = paramsFor(2060, { inflation: p.inflation, wageGrowth: p.wageGrowth })
      expect(far.projected).toBe(true)
      expect(far.federal.bpaMax / base.federal.bpaMax, k).toBeCloseTo((1 + p.inflation) ** 34, 2)
    }
  })

  it('the wage-indexed RRQ ceiling follows WAGE growth, not inflation', () => {
    const base = paramsFor(2026, { inflation: 0.02, wageGrowth: 0.03 }).rrq.mga
    for (const k of PRESET_KEYS) {
      const p = ASSUMPTION_PRESETS[k]
      const far = paramsFor(2060, { inflation: p.inflation, wageGrowth: p.wageGrowth }).rrq.mga
      expect(far / base, k).toBeCloseTo((1 + p.wageGrowth) ** 34, 2)
    }
  })
})

describe('applying a set', () => {
  it('withPreset does not mutate its input and does not share the returns object with the preset table or the result with the input', () => {
    const input = structuredClone(GOLDEN_ASSUMPTIONS)
    const out = withPreset(input, 'prudent')
    expect(input).toEqual(GOLDEN_ASSUMPTIONS)
    expect(out.returns).not.toBe(ASSUMPTION_PRESETS.prudent.returns)
    expect(out.returns).not.toBe(input.returns)
    out.returns.rrsp = 0.99
    expect(ASSUMPTION_PRESETS.prudent.returns.rrsp).toBe(0.03)
  })

  it('it changes the four things and only those: today, the order and the splitting stay', () => {
    for (const k of PRESET_KEYS) {
      const out = withPreset(GOLDEN_ASSUMPTIONS, k)
      expect(out.today).toEqual(GOLDEN_ASSUMPTIONS.today)
      expect(out.withdrawalOrder).toEqual(GOLDEN_ASSUMPTIONS.withdrawalOrder)
      expect(out.pensionSplitting).toBe(GOLDEN_ASSUMPTIONS.pensionSplitting)
    }
  })

  it('is idempotent, and every set is recognised as itself and as no other', () => {
    for (const k of PRESET_KEYS) {
      const once = withPreset(GOLDEN_ASSUMPTIONS, k)
      expect(withPreset(once, k)).toEqual(once)
      expect(presetOf(once)).toBe(k)
      for (const other of PRESET_KEYS) if (other !== k) expect(presetOf(withPreset(GOLDEN_ASSUMPTIONS, other))).not.toBe(k)
    }
  })

  it('the golden household\'s own assumptions are none of the three (so the page shows « personnalisé » for them)', () => {
    expect(presetOf(GOLDEN_ASSUMPTIONS)).toBeNull()
  })
})

describe('the verdict under each set', () => {
  it('presetVerdicts is exactly retireAt run on the set laid over the person\'s assumptions', () => {
    for (const v of presetVerdicts(H, GOLDEN_ASSUMPTIONS)) {
      expect(v.earliestOk, v.preset).toBe(retireAt(H, withPreset(GOLDEN_ASSUMPTIONS, v.preset), { stopAtFirstOk: true }).earliestOk)
    }
  })

  it('golden household snapshot: prudent 66 · neutral 61 · bold 58 — an 8-year spread is the expected size of the difference', () => {
    const v = Object.fromEntries([...presetVerdicts(H, GOLDEN_ASSUMPTIONS)].map((x) => [x.preset, x.earliestOk]))
    expect(v).toEqual({ prudent: 66, neutral: 61, bold: 58 })
  })

  it('a verdict is the first age with no shortfall, and the years after a failing age fail at or before the horizon', () => {
    const r = retireAt(H, withPreset(GOLDEN_ASSUMPTIONS, 'prudent'))
    const first = r.byAge.find((x) => x.ok)!
    expect(first.age).toBe(r.earliestOk)
    expect(first.firstShortfallYear).toBeNull()
    for (const x of r.byAge.filter((y) => !y.ok)) expect(x.firstShortfallYear).not.toBeNull()
  })
})

describe('the sensitivity grid', () => {
  it('shifted moves every return by the same amount and inflation by its own, leaving the rest alone', () => {
    const s = shifted(GOLDEN_ASSUMPTIONS, 0.01, -0.005, 90)
    expect(s.returns.nonReg).toBeCloseTo(0.055, 12)
    expect(s.returns.rrsp).toBeCloseTo(0.06, 12)
    expect(s.returns.tfsa).toBeCloseTo(0.06, 12)
    expect(s.inflation).toBeCloseTo(0.015, 12)
    expect(s.horizonAge).toBe(90)
    expect(s.wageGrowth).toBe(GOLDEN_ASSUMPTIONS.wageGrowth)
    expect(s.withdrawalOrder).toEqual(GOLDEN_ASSUMPTIONS.withdrawalOrder)
  })

  it('the middle cell is the person\'s own verdict, and each axis only ever moves the age the right way', () => {
    const cells = [...sensitivityCells(H, NEUTRAL, { returnsDeltas: [-0.01, 0, 0.01], inflationDeltas: [-0.01, 0, 0.01], horizonAges: [90, 95, 100] })]
    const cell = (returnsDelta: number, inflationDelta: number, horizonAge: number) =>
      (cells.find((c) => c.returnsDelta === returnsDelta && c.inflationDelta === inflationDelta && c.horizonAge === horizonAge)?.earliestOk ?? Infinity)
    expect(cells).toHaveLength(27)
    expect(cell(0, 0, 95)).toBe(retireAt(H, NEUTRAL, { stopAtFirstOk: true }).earliestOk ?? Infinity)
    for (const h of [90, 95, 100]) for (const i of [-0.01, 0, 0.01]) {
      expect(cell(0.01, i, h)).toBeLessThanOrEqual(cell(0, i, h))
      expect(cell(0, i, h)).toBeLessThanOrEqual(cell(-0.01, i, h))
    }
    for (const h of [90, 95, 100]) for (const r of [-0.01, 0, 0.01]) {
      expect(cell(r, -0.01, h)).toBeLessThanOrEqual(cell(r, 0, h))
      expect(cell(r, 0, h)).toBeLessThanOrEqual(cell(r, 0.01, h))
    }
    for (const r of [-0.01, 0, 0.01]) for (const i of [-0.01, 0, 0.01]) {
      expect(cell(r, i, 90)).toBeLessThanOrEqual(cell(r, i, 95))
      expect(cell(r, i, 95)).toBeLessThanOrEqual(cell(r, i, 100))
    }
  }, 60_000)
})
