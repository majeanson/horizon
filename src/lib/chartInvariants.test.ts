import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples.ts'
import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { AgeResult } from '../engine/types.ts'
import { SOURCE_SEGMENTS, balanceBars, chartSeries, deflator, expenseBars, idleStretch, metricValue, sourceBars, survivorJump } from './chartData.ts'

// THE PICTURES CAN BE TRUSTED. Every chart of the « Détail » view and the two lines are read from the engine's year rows by lib/chartData.ts; flowBars.test.ts
// holds the cash identity of the sources against the uses. This file holds everything ELSE a reader relies on, for ALL eleven example households and three
// retirement ages each (the earliest-age search runs the same rows): nothing is NaN, infinite or (where it must not be) negative; one person's bars plus
// the other's are the household's; « par mois » is a twelfth of « par année »; today's dollars are the year's dollars deflated by the inflation since now;
// the years are consecutive; a plan the verdict calls « ok » has no unmet bar, and one it does not has one; the stretch of empty years the page explains
// really is empty and really sits between two years with a bar.

const AGES = [55, 60, 65] as const
const runs: { id: ExampleId; age: number; result: AgeResult }[] = []
for (const id of EXAMPLE_IDS) {
  const { household, assumptions } = EXAMPLES[id]
  for (const age of AGES) runs.push({ id, age, result: runScenario(household, assumptions, everyoneAt(household, age), age) })
}
const label = (r: (typeof runs)[number]) => `${r.id} retiring at ${r.age}`
const scale = (id: ExampleId, extra: { dollars?: 'today' | 'nominal'; per?: 'year' | 'month' } = {}) => ({ dollars: extra.dollars ?? ('nominal' as const), todayYear: EXAMPLES[id].assumptions.today.year, inflation: EXAMPLES[id].assumptions.inflation, per: extra.per })
const sum = (o: Record<string, number>, keys: readonly string[]) => keys.reduce((s, k) => s + o[k], 0)
const numbers = (o: object): number[] => Object.values(o).filter((v): v is number => typeof v === 'number')

describe('every figure the charts draw is a real number', { timeout: 120_000 }, () => {
  it('no bar or point is NaN or infinite, in either kind of dollar, per year or per month', () => {
    for (const r of runs) {
      const rows = r.result.rows
      for (const dollars of ['nominal', 'today'] as const) {
        for (const per of ['year', 'month'] as const) {
          const s = scale(r.id, { dollars, per })
          for (const who of [null, ...rows[0] ? Object.keys(rows[0].persons) : []]) {
            for (const b of [...sourceBars(rows, who, s), ...balanceBars(rows, who, s)]) for (const v of numbers(b)) expect(Number.isFinite(v), `${label(r)} ${dollars} ${per} ${who}`).toBe(true)
          }
          for (const b of expenseBars(rows, s)) for (const v of numbers(b)) expect(Number.isFinite(v), `${label(r)} expenses ${dollars} ${per}`).toBe(true)
        }
        for (const metric of ['netWorth', 'income'] as const) {
          const series = chartSeries([{ selection: r.age, result: r.result }], { metric, dollars, todayYear: EXAMPLES[r.id].assumptions.today.year, inflation: EXAMPLES[r.id].assumptions.inflation, label: String })
          for (const p of series[0].points) expect(Number.isFinite(p.y), `${label(r)} ${metric} ${dollars}`).toBe(true)
        }
      }
    }
  })

  it('what is received, drawn, owed or kept is never negative, and an account never shows below nothing (to the cent)', () => {
    for (const r of runs) {
      const rows = r.result.rows
      const s = scale(r.id)
      for (const who of [null, ...Object.keys(rows[0].persons)]) {
        sourceBars(rows, who, s).forEach((b) => {
          for (const k of SOURCE_SEGMENTS) expect(b[k], `${label(r)} ${who} ${b.x} ${k}`).toBeGreaterThanOrEqual(-0.005)
        })
        balanceBars(rows, who, s).forEach((b) => {
          for (const k of ['rrsp', 'rrspLocked', 'tfsa', 'nonReg'] as const) expect(b[k], `${label(r)} ${who} ${b.x} ${k}`).toBeGreaterThanOrEqual(-0.005)
        })
      }
      expenseBars(rows, s).forEach((b) => {
        for (const k of ['living', 'children', 'events', 'mortgage', 'tax', 'deductions', 'saved', 'unmet'] as const) expect(b[k], `${label(r)} ${b.x} ${k}`).toBeGreaterThanOrEqual(-0.005)
      })
    }
  })
})

describe('one person plus the other is the household', { timeout: 120_000 }, () => {
  it('the sources, and each account of the balances, add up person by person to the household’s bars, in every year of every example', () => {
    for (const r of runs) {
      const rows = r.result.rows
      const s = scale(r.id)
      const ids = Object.keys(rows[0].persons)
      const whole = sourceBars(rows, null, s)
      const parts = ids.map((id) => sourceBars(rows, id, s))
      whole.forEach((w, i) => {
        for (const k of SOURCE_SEGMENTS) expect(parts.reduce((t, p) => t + p[i][k], 0), `${label(r)} ${w.x} ${k}`).toBeCloseTo(w[k], 4)
      })
      const wholeBal = balanceBars(rows, null, s)
      const partsBal = ids.map((id) => balanceBars(rows, id, s))
      wholeBal.forEach((w, i) => {
        for (const k of ['rrsp', 'rrspLocked', 'tfsa', 'nonReg'] as const) expect(partsBal.reduce((t, p) => t + p[i][k], 0), `${label(r)} ${w.x} ${k}`).toBeCloseTo(w[k], 4)
      })
    }
  })

  it('the accounts drawn (free REER + locked + CELI + non-registered) are the net worth the line chart draws, and the home is the only thing added to the household bars', () => {
    for (const r of runs) {
      const s = scale(r.id)
      const bars = balanceBars(r.result.rows, null, s)
      r.result.rows.forEach((row, i) => {
        const b = bars[i]
        expect(b.rrsp + b.rrspLocked + b.tfsa + b.nonReg, `${label(r)} ${row.year}`).toBeCloseTo(row.household.netWorthEnd, 4)
        expect(b.home, `${label(r)} ${row.year} home`).toBeCloseTo(row.household.homeValueEnd - row.household.mortgageBalanceEnd, 4)
        expect(metricValue(row, 'netWorth')).toBe(row.household.netWorthEnd)
      })
    }
  })
})

describe('the same figures in the other unit say the same thing', { timeout: 120_000 }, () => {
  it('« par mois » is exactly a twelfth of « par année », for the sources and for the expenses; the balances do not change', () => {
    for (const r of runs) {
      const rows = r.result.rows
      const year = sourceBars(rows, null, scale(r.id, { per: 'year' }))
      const month = sourceBars(rows, null, scale(r.id, { per: 'month' }))
      year.forEach((y, i) => {
        for (const k of [...SOURCE_SEGMENTS, 'need'] as const) expect(month[i][k] * 12, `${label(r)} ${y.x} ${k}`).toBeCloseTo(y[k], 6)
      })
      const eYear = expenseBars(rows, scale(r.id, { per: 'year' }))
      const eMonth = expenseBars(rows, scale(r.id, { per: 'month' }))
      eYear.forEach((y, i) => expect(sum(eMonth[i], ['living', 'children', 'events', 'mortgage', 'tax', 'deductions', 'saved', 'unmet']) * 12, `${label(r)} ${y.x}`).toBeCloseTo(sum(y, ['living', 'children', 'events', 'mortgage', 'tax', 'deductions', 'saved', 'unmet']), 5))
      expect(balanceBars(rows, null, scale(r.id, { per: 'month' }))).toEqual(balanceBars(rows, null, scale(r.id, { per: 'year' })))
    }
  })

  it('today’s dollars are the year’s dollars divided by the prices’ growth since now: the first year is untouched, the later ones never rise by inflation alone', () => {
    for (const r of runs) {
      const { today, inflation } = EXAMPLES[r.id].assumptions
      const rows = r.result.rows
      const nominal = sourceBars(rows, null, scale(r.id, { dollars: 'nominal' }))
      const real = sourceBars(rows, null, scale(r.id, { dollars: 'today' }))
      nominal.forEach((n, i) => {
        const k = (1 + inflation) ** (n.x - today.year) // written out, not read back from the helper under test
        for (const seg of SOURCE_SEGMENTS) expect(real[i][seg] * k, `${label(r)} ${n.x} ${seg}`).toBeCloseTo(n[seg], 4)
      })
      expect(deflator(today.year, today.year, inflation)).toBe(1)
      const s = chartSeries([{ selection: r.age, result: r.result }], { metric: 'netWorth', dollars: 'today', todayYear: today.year, inflation, label: String })[0]
      const first = rows.findIndex((x) => x.year === today.year)
      if (first >= 0) expect(s.points[first].y).toBeCloseTo(rows[first].household.netWorthEnd, 6)
    }
  })
})

describe('the plan, as the pictures show it, agrees with its verdict', { timeout: 120_000 }, () => {
  it('years run one after another to the end of the plan, and the verdict’s net worth at the horizon is the last bar', () => {
    for (const r of runs) {
      const rows = r.result.rows
      rows.forEach((row, i) => i > 0 && expect(row.year, `${label(r)}`).toBe(rows[i - 1].year + 1))
      expect(r.result.netWorthAtHorizon, label(r)).toBe(rows[rows.length - 1].household.netWorthEnd)
    }
  })

  it('a plan the verdict says works has no unmet bar anywhere; one that does not has one, and in its first short year', () => {
    for (const r of runs) {
      const unmet = expenseBars(r.result.rows, scale(r.id)).map((b) => b.unmet)
      if (r.result.ok) {
        expect(Math.max(...unmet), label(r)).toBeLessThan(0.005)
        expect(r.result.firstShortfallYear).toBeNull()
      } else {
        const first = r.result.rows.find((_, i) => unmet[i] > 0.005)
        expect(first?.year, label(r)).toBe(r.result.firstShortfallYear)
      }
    }
  })

  it('the stretch the page explains as « nothing from this person » is empty in every year of it, and has a bar on both sides', () => {
    let found = 0
    for (const r of runs) {
      const rows = r.result.rows
      for (const who of Object.keys(rows[0].persons)) {
        const bars = sourceBars(rows, who, scale(r.id))
        const stretch = idleStretch(bars)
        if (stretch === null) continue
        found++
        const empty = (b: (typeof bars)[number]) => SOURCE_SEGMENTS.every((k) => b[k] < 0.5)
        const inside = bars.filter((b) => b.x >= stretch.from && b.x <= stretch.to)
        expect(inside.length, `${label(r)} ${who}`).toBeGreaterThanOrEqual(2)
        inside.forEach((b) => expect(empty(b), `${label(r)} ${who} ${b.x}`).toBe(true))
        const before = bars.find((b) => b.x === stretch.from - 1)
        const after = bars.find((b) => b.x === stretch.to + 1)
        expect(before !== undefined && !empty(before), `${label(r)} ${who} before`).toBe(true)
        expect(after !== undefined && !empty(after), `${label(r)} ${who} after`).toBe(true)
      }
    }
    // Eleven households × three ages × their people: a couple whose second person lives off the first's draw exists among them — the check ran on real data, not on nothing.
    expect(found).toBeGreaterThan(0)
  })
})

describe('the note under a person’s bars when the two lives end in different years', { timeout: 120_000 }, () => {
  it('names the year the engine really stops the first person: nothing is drawn for them after it, and something is drawn up to it', () => {
    let couples = 0
    for (const r of runs) {
      const { household, assumptions } = EXAMPLES[r.id]
      const jump = survivorJump(household, assumptions.horizonAge)
      if (jump === null) continue
      couples++
      const rows = r.result.rows
      const s = scale(r.id)
      const gone = sourceBars(rows, jump.goneId, s)
      const goneBal = balanceBars(rows, jump.goneId, s)
      rows.forEach((row, i) => {
        const drawn = SOURCE_SEGMENTS.some((k) => gone[i][k] > 0.5) || goneBal[i].rrsp + goneBal[i].tfsa + goneBal[i].nonReg > 0.5
        if (row.year > jump.lastYear) expect(drawn, `${label(r)} ${row.year}: nothing for the first to go after ${jump.lastYear}`).toBe(false)
      })
      const upTo = rows.filter((row) => row.year <= jump.lastYear)
      expect(upTo.some((_, i) => SOURCE_SEGMENTS.some((k) => gone[i][k] > 0.5)), `${label(r)}: something is drawn for them up to ${jump.lastYear}`).toBe(true)
    }
    expect(couples, 'the examples hold couples whose plans end in different years').toBeGreaterThan(0)
  })

  it('is silent for one person, for two plans that end in the same year, and honours each person’s own age', () => {
    const { household } = EXAMPLES.golden
    const [a, b] = household.persons
    expect(survivorJump({ ...household, persons: [a] }, 95)).toBeNull()
    // born in different years, both to 95: the older one goes first
    expect(survivorJump(household, 95)).toEqual({ goneId: a.birth.year < b.birth.year ? a.id : b.id, otherId: a.birth.year < b.birth.year ? b.id : a.id, lastYear: Math.min(a.birth.year, b.birth.year) + 95 })
    // each to the age that ends them in the same calendar year: no jump
    const same = { ...household, persons: [{ ...a, horizonAge: 90 }, { ...b, horizonAge: 90 + (a.birth.year - b.birth.year) }] }
    expect(survivorJump(same, 95)).toBeNull()
    // one person's own, shorter age makes them the first to go
    const own = { ...household, persons: [{ ...a, horizonAge: 70 }, b] }
    expect(survivorJump(own, 95)).toEqual({ goneId: a.id, otherId: b.id, lastYear: a.birth.year + 70 })
  })
})
