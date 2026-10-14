import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { AgeResult } from '../engine/types.ts'
import { SOURCE_SEGMENTS, chartSeries, deflator, expenseBars, sourceBars } from './chartData.ts'
import { yearCsv, type YearCsvHeads } from './yearCsv.ts'
import { retiredRates } from './retiredRates.ts'
import { averageRateOf, lockedOf, yearTableModel } from './yearTable.ts'

// THE TABLE CAN BE TRUSTED. The year-by-year table and its spreadsheet are written from ONE model (lib/yearTable.ts). Held here, for all eleven example households and
// three retirement ages each: the model is the engine's row divided by the year's factor and nothing else; it agrees with the charts' bars and lines; a year is « short » exactly when
// the verdict says so; a column exists exactly when some year needs it; and the spreadsheet holds, cell by cell, the model's figures rounded — in today's dollars and in the year's own.

const HEADS: YearCsvHeads = { year: 'Année', ages: 'Âges', income: 'Revenu', tax: 'Impôt', spending: 'Dépenses', shortfall: 'Manque', netWorth: 'Valeur nette', rrspLocked: 'REER immobilisé', mortgage: 'Hypothèque', homeEquity: 'Valeur de la maison' }
const runs: { id: (typeof EXAMPLE_IDS)[number]; age: number; result: AgeResult }[] = []
for (const id of EXAMPLE_IDS) {
  const { household, assumptions } = EXAMPLES[id]
  for (const age of [55, 60, 65]) runs.push({ id, age, result: runScenario(household, assumptions, everyoneAt(household, age), age) })
}
const label = (r: (typeof runs)[number]) => `${r.id} at ${r.age}`
const factorOf = (id: (typeof EXAMPLE_IDS)[number]) => (year: number) => deflator(year, EXAMPLES[id].assumptions.today.year, EXAMPLES[id].assumptions.inflation)

describe('a row of the table is the engine’s row, in the dollars shown', { timeout: 120_000 }, () => {
  it('year, ages, income, tax, spending, shortfall, net worth, locked REER, mortgage and home equity are the engine’s, divided by the year’s factor', () => {
    for (const r of runs) {
      const f = factorOf(r.id)
      const model = yearTableModel(r.result.rows, f)
      expect(model.rows.length, label(r)).toBe(r.result.rows.length)
      model.rows.forEach((m, i) => {
        const row = r.result.rows[i]
        const h = row.household
        const k = f(row.year)
        expect(m.year).toBe(row.year)
        expect(m.ages, `${label(r)} ${row.year}`).toEqual(Object.values(row.persons).map((p) => p.age))
        expect(m.income).toBeCloseTo(h.grossIncome / k, 6)
        expect(m.tax).toBeCloseTo(h.tax / k, 6)
        expect(m.spending).toBeCloseTo(h.spending / k, 6)
        expect(m.shortfall).toBeCloseTo(h.shortfall / k, 6)
        expect(m.netWorth).toBeCloseTo(h.netWorthEnd / k, 6)
        expect(m.rrspLocked).toBeCloseTo(lockedOf(row) / k, 6)
        expect(m.mortgage).toBeCloseTo(h.mortgagePayment / k, 6)
        expect(m.homeEquity).toBeCloseTo((h.homeValueEnd - h.mortgageBalanceEnd) / k, 6)
      })
    }
  })

  it('every figure is a real number, and the year’s own dollars (no factor) are the engine’s figures untouched', () => {
    for (const r of runs) {
      const own = yearTableModel(r.result.rows)
      own.rows.forEach((m, i) => {
        for (const v of [m.income, m.tax, m.spending, m.shortfall, m.netWorth, m.rrspLocked, m.mortgage, m.homeEquity]) expect(Number.isFinite(v), `${label(r)} ${m.year}`).toBe(true)
        expect(m.income).toBe(r.result.rows[i].household.grossIncome)
        expect(m.netWorth).toBe(r.result.rows[i].household.netWorthEnd)
      })
    }
  })

  it('the years run one after another, and the first year in today’s dollars is the nominal one', () => {
    for (const r of runs) {
      const { today } = EXAMPLES[r.id].assumptions
      const nominal = yearTableModel(r.result.rows)
      const real = yearTableModel(r.result.rows, factorOf(r.id))
      nominal.rows.forEach((m, i) => i > 0 && expect(m.year, label(r)).toBe(nominal.rows[i - 1].year + 1))
      const first = nominal.rows.findIndex((m) => m.year === today.year)
      if (first >= 0) expect(real.rows[first].netWorth).toBeCloseTo(nominal.rows[first].netWorth, 6)
    }
  })
})

describe('the table agrees with the charts', { timeout: 120_000 }, () => {
  it('its net worth is the line chart’s point in today’s dollars, and its income and tax with spending are the bars’ received and needed', () => {
    for (const r of runs) {
      const a = EXAMPLES[r.id].assumptions
      const model = yearTableModel(r.result.rows, factorOf(r.id))
      const line = chartSeries([{ selection: r.age, result: r.result }], { metric: 'netWorth', dollars: 'today', todayYear: a.today.year, inflation: a.inflation, label: String })[0]
      const bars = sourceBars(r.result.rows, null, { dollars: 'today', todayYear: a.today.year, inflation: a.inflation })
      model.rows.forEach((m, i) => {
        expect(m.netWorth, `${label(r)} ${m.year} net worth`).toBeCloseTo(line.points[i].y, 6)
        expect(m.spending + m.tax, `${label(r)} ${m.year} need`).toBeCloseTo(bars[i].need, 6)
        // the bars fold a few small taxable items into five segments: what they show received is never more than the table's gross income
        expect(SOURCE_SEGMENTS.reduce((s, k) => s + bars[i][k], 0), `${label(r)} ${m.year} income`).toBeLessThanOrEqual(m.income + 1)
      })
    }
  })

  it('a year is « short » exactly when the engine could not pay it: the tinted row, the « à combler » figure, the unmet bar and the verdict’s first short year agree', () => {
    for (const r of runs) {
      const a = EXAMPLES[r.id].assumptions
      const model = yearTableModel(r.result.rows, factorOf(r.id))
      const unmet = expenseBars(r.result.rows, { dollars: 'today', todayYear: a.today.year, inflation: a.inflation }).map((b) => b.unmet)
      model.rows.forEach((m, i) => {
        expect(m.short, `${label(r)} ${m.year}`).toBe(m.shortfall > 0)
        expect(m.short, `${label(r)} ${m.year} vs the unmet bar`).toBe(unmet[i] > 0.005)
        expect(m.shortfall, `${label(r)} ${m.year}`).toBeCloseTo(unmet[i], 6)
      })
      expect(model.hasShortfall, label(r)).toBe(!r.result.ok)
      expect(model.firstShortYear, label(r)).toBe(r.result.firstShortfallYear)
    }
  })
})

describe('a column exists exactly when some year needs it', { timeout: 120_000 }, () => {
  it('the home’s two columns with a home, the locked-in REER with a locked part, « à combler » with a shortfall — and each really occurs among the examples', () => {
    let homes = 0
    let locked = 0
    let short = 0
    for (const r of runs) {
      const m = yearTableModel(r.result.rows)
      expect(m.hasHome, label(r)).toBe(r.result.rows.some((x) => x.household.homeValueEnd > 0))
      expect(m.hasLocked, label(r)).toBe(r.result.rows.some((x) => lockedOf(x) > 0))
      if (!m.hasHome) m.rows.forEach((x) => expect(x.mortgage === 0 && x.homeEquity === 0, `${label(r)} ${x.year}: no home, no home figures`).toBe(true))
      if (!m.hasLocked) m.rows.forEach((x) => expect(x.rrspLocked, label(r)).toBe(0))
      if (!m.hasShortfall) m.rows.forEach((x) => expect(x.short, label(r)).toBe(false))
      homes += m.hasHome ? 1 : 0
      locked += m.hasLocked ? 1 : 0
      short += m.hasShortfall ? 1 : 0
    }
    expect(homes, 'some example has a home').toBeGreaterThan(0)
    expect(short, 'some example runs short').toBeGreaterThan(0)
    expect(homes, 'not every example has one').toBeLessThan(runs.length)
    expect(locked, 'locked-in is a rare column').toBeLessThan(runs.length)
  })
})

describe('the spreadsheet holds the table’s figures, cell by cell', { timeout: 120_000 }, () => {
  for (const lang of ['fr', 'en'] as const) {
    it(`${lang}: every money cell is the model’s figure rounded to the dollar, in today’s dollars and in the year’s own; the columns follow the model’s`, () => {
      const sep = lang === 'fr' ? ';' : ','
      for (const r of runs) {
        for (const factor of [undefined, factorOf(r.id)]) {
          const model = yearTableModel(r.result.rows, factor)
          const lines = yearCsv(r.result, HEADS, lang, { factor, unit: 'x' }).replace('﻿', '').trimEnd().split('\r\n')
          expect(lines.length, label(r)).toBe(model.rows.length + 1)
          const columns = 7 + (model.hasLocked ? 1 : 0) + (model.hasHome ? 2 : 0)
          lines.forEach((l) => expect(l.split(sep).length, `${label(r)} columns`).toBe(columns))
          model.rows.forEach((m, i) => {
            const cells = lines[i + 1].split(sep)
            const expected = [String(m.year), m.ages.join(' / '), ...[m.income, m.tax, m.spending, m.shortfall, m.netWorth, ...(model.hasLocked ? [m.rrspLocked] : []), ...(model.hasHome ? [m.mortgage, m.homeEquity] : [])].map((v) => String(Math.round(v)))]
            expect(cells, `${label(r)} ${m.year}`).toEqual(expected)
          })
        }
      }
    })
  }
})

describe('the edge of « short »', { timeout: 120_000 }, () => {
  it('a year with only a few dollars unpaid is already a short year in the table, its « à combler » figure and the verdict', () => {
    const { household, assumptions } = EXAMPLES.golden
    const at = (k: number) => {
      const h = { ...household, spending: { ...household.spending, retiredToday: household.spending.retiredToday * k } }
      return runScenario(h, assumptions, everyoneAt(h, 62), 62)
    }
    let lo = 0.5
    let hi = 3
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (at(mid).ok) lo = mid
      else hi = mid
    }
    const result = at(hi)
    const model = yearTableModel(result.rows)
    const worst = Math.max(...model.rows.map((r) => r.shortfall))
    expect(worst, 'the first unpaid amount is small').toBeLessThan(100)
    expect(worst).toBeGreaterThan(0)
    expect(model.hasShortfall).toBe(true)
    expect(model.rows.find((r) => r.shortfall === worst)!.short).toBe(true)
    expect(model.firstShortYear).toBe(result.firstShortfallYear)
    // and just under the edge, nothing is short anywhere
    expect(yearTableModel(at(lo).rows).hasShortfall).toBe(false)
  })
})

describe('the average tax rate of a year', { timeout: 120_000 }, () => {
  it('is the household’s tax over everyone’s net income, a share that no dollar factor touches — and null when nobody has a net income', () => {
    for (const r of runs) {
      const f = factorOf(r.id)
      const model = yearTableModel(r.result.rows, f)
      model.rows.forEach((m, i) => {
        const row = r.result.rows[i]
        const net = Object.values(row.persons).reduce((s, p) => s + (p?.netIncome ?? 0), 0)
        if (net > 0) {
          expect(m.avgRate, `${label(r)} ${m.year}`).toBeCloseTo(row.household.tax / net, 10)
          expect(m.avgRate!, `${label(r)} ${m.year}`).toBeGreaterThanOrEqual(0)
          expect(m.avgRate!, `${label(r)} ${m.year}`).toBeLessThan(1)
        } else expect(m.avgRate, `${label(r)} ${m.year}`).toBeNull()
        expect(yearTableModel(r.result.rows).rows[i].avgRate).toBe(m.avgRate)
      })
    }
    const none = structuredClone(runs[0].result.rows.slice(0, 1))
    for (const p of Object.values(none[0].persons)) if (p) p.netIncome = 0
    expect(yearTableModel(none).rows[0].avgRate).toBeNull()
    expect(averageRateOf(none[0])).toBeNull()
  })
})

describe('the average rate beside the marginal rate of a retired year', { timeout: 120_000 }, () => {
  it('names the first year with no salary, and the cost of one more dollar is a real share (a hair under nought where the first 2 000 $ of RRIF income earn the pension credit) that there', () => {
    let seen = 0
    for (const r of runs) {
      const { assumptions } = EXAMPLES[r.id]
      const rates = retiredRates(r.result.rows, assumptions)
      if (!rates) continue
      seen++
      const row = r.result.rows.find((x) => x.year === rates.year)!
      expect(Object.values(row.persons).every((p) => (p?.employment ?? 0) === 0), label(r)).toBe(true)
      expect(rates.average, label(r)).toBe(averageRateOf(row))
      for (const k of ['tax', 'oasRecovery', 'gisLost', 'rate'] as const) expect(Number.isFinite(rates.marginal[k]) && rates.marginal[k] >= -0.05, `${label(r)} ${k}`).toBe(true)
      expect(rates.marginal.rate, label(r)).toBeLessThan(1.5)
    }
    expect(seen, 'most examples retire inside their plan').toBeGreaterThan(runs.length / 2)
  })
})
