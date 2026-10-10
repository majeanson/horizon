import { describe, expect, it } from 'vitest'
import { plain } from './cited.ts'
import { CHILD_COSTS, CHILD_COST_INCOME_LEVELS, CPI_ANNUAL, type CostBands } from './childCosts.ts'

// WHAT A CHILD COSTS, as Statistics Canada printed it. The paper prints each cell's four annual figures AND the lifetime totals (ages 0–17 and 0–22), so a
// mistyped cell cannot hide: the totals are worked out from the bands and held against the paper's own.

const years = { to17: [6, 7, 5, 0], to22: [6, 7, 6, 4] } as const
const total = (bands: CostBands, by: readonly number[]) => bands.reduce((s, b, i) => s + b * by[i], 0)

// [table, family, income level] → the totals the paper prints for ages 0–17 and 0–22.
const PRINTED: [string, 'oneChild' | 'twoChildren' | 'threeChildren', 'twoParent' | 'oneParent', string, number, number][] = [
  ['Table 1', 'twoChildren', 'twoParent', 'lower', 238_190, 308_710],
  ['Table 1', 'twoChildren', 'twoParent', 'medium', 293_000, 378_900],
  ['Table 1', 'twoChildren', 'twoParent', 'higher', 403_910, 521_270],
  ['Table 1', 'twoChildren', 'oneParent', 'lower', 231_260, 299_180],
  ['Table 1', 'twoChildren', 'oneParent', 'mediumHigh', 372_110, 479_830],
  ['Table 2', 'oneChild', 'twoParent', 'lower', 290_580, 379_510],
  ['Table 2', 'oneChild', 'twoParent', 'medium', 375_500, 488_390],
  ['Table 2', 'oneChild', 'twoParent', 'higher', 545_580, 706_660],
  ['Table 2', 'oneChild', 'oneParent', 'lower', 294_760, 383_230],
  ['Table 2', 'oneChild', 'oneParent', 'mediumHigh', 505_400, 653_870],
  ['Table 3', 'threeChildren', 'twoParent', 'lower', 216_790, 279_770],
  ['Table 3', 'threeChildren', 'twoParent', 'medium', 259_610, 334_640],
  ['Table 3', 'threeChildren', 'twoParent', 'higher', 348_060, 448_010],
  ['Table 3', 'threeChildren', 'oneParent', 'lower', 194_810, 251_450],
  ['Table 3', 'threeChildren', 'oneParent', 'mediumHigh', 308_410, 396_950],
]

describe('Statistics Canada, spending on children (11F0019M no. 2023007)', () => {
  const costs = plain(CHILD_COSTS)

  for (const [table, size, family, level, to17, to22] of PRINTED) {
    it(`${table}, ${size}, ${family} ${level}: the four bands add up to the paper's printed totals (${to17.toLocaleString('en')} · ${to22.toLocaleString('en')})`, () => {
      const bands = (costs[size][family] as Record<string, CostBands>)[level]
      expect(total(bands, years.to17)).toBe(to17)
      expect(total(bands, years.to22)).toBe(to22)
    })
  }

  it('the same family costs less per child the more children it has, and more the higher its income', () => {
    for (const [i, band] of [0, 1, 2, 3].entries()) {
      const one = costs.oneChild.twoParent.medium[band]
      const two = costs.twoChildren.twoParent.medium[band]
      const three = costs.threeChildren.twoParent.medium[band]
      expect(one, `band ${i}`).toBeGreaterThan(two)
      expect(two, `band ${i}`).toBeGreaterThan(three)
      const t = costs.twoChildren.twoParent
      expect(t.lower[band]).toBeLessThan(t.medium[band])
      expect(t.medium[band]).toBeLessThan(t.higher[band])
    }
  })

  it('the income levels and the price index are what the paper and the table print', () => {
    expect(plain(CHILD_COST_INCOME_LEVELS)).toEqual({ lowerBelow: 83_013, higherAbove: 135_790 })
    const cpi = plain(CPI_ANNUAL)
    expect(cpi[2017]).toBe(130.4)
    expect(cpi[2025]).toBe(164.2)
    expect(cpi[2025] / cpi[2017]).toBeCloseTo(1.259, 3)
  })
})
