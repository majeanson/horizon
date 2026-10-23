// VERIFIED-AGAINST
// source:    https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1310011401
// title:     Life expectancy and other elements of the complete life table, three-year estimates, Canada, all provinces except Prince Edward Island
// retrieved: 2026-10-23
// tolerance: exact, to the person (the table gives whole numbers of survivors out of 100 000); the chance is their ratio
//
// Statistics Canada's table 13-10-0114-01, geography Québec, reference period 2022 to 2024 (released 2026-01-13). For both sexes it gives the number alive at each age out of 100 000 born; the same table
// gives it for men and for women apart: at 65, 89 035 men and 92 829 women (both sexes 90 864); at 90, 25 218 men and 36 976 women (both sexes 31 400); at 95, 8 698 men and 16 714 women. The engine's chance
// of reaching an age (survival.ts `chanceAlive`) must be the ratio of two of these, and the both-sexes table must lie between the men's and the women's at every point the page gives.
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { atLeastOneAlive, chanceAlive } from '../survival.ts'

const T = knownYear(2026).mortality.survivors

describe('the chance of reaching an age — Statistics Canada’s life table for Québec, 2022 to 2024', () => {
  it('the table holds the page’s survivors: 90 864 at 65, 31 400 at 90, 13 015 at 95, 2 889 at 100', () => {
    expect([T[65], T[90], T[95], T[100]]).toEqual([90_864, 31_400, 13_015, 2_889])
  })

  it('the chance of a 65-year-old being alive at 90 is 31 400 / 90 864, and at 95 is 13 015 / 90 864', () => {
    expect(chanceAlive(65, 90, T)).toBeCloseTo(31_400 / 90_864, 12)
    expect(chanceAlive(65, 95, T)).toBeCloseTo(13_015 / 90_864, 12)
    expect(chanceAlive(65, 90, T)).toBeCloseTo(0.3456, 4)
  })

  it('both sexes lie between the men’s and the women’s figures the same table gives', () => {
    const men = { 65: 89_035, 90: 25_218, 95: 8_698 }
    const women = { 65: 92_829, 90: 36_976, 95: 16_714 }
    for (const age of [65, 90, 95] as const) {
      expect(T[age], `at ${age}`).toBeGreaterThan(men[age])
      expect(T[age], `at ${age}`).toBeLessThan(women[age])
    }
    // so the chance of a 65-year-old reaching 90 lies between the men's 28,3 % and the women's 39,8 %
    expect(chanceAlive(65, 90, T)!).toBeGreaterThan(25_218 / 89_035)
    expect(chanceAlive(65, 90, T)!).toBeLessThan(36_976 / 92_829)
  })

  it('a couple of 65: at least one alive at 90 is about 57 %, at 95 about a quarter (independent lives)', () => {
    const at90 = chanceAlive(65, 90, T)!
    const at95 = chanceAlive(65, 95, T)!
    expect(atLeastOneAlive([at90, at90])).toBeCloseTo(1 - (1 - 31_400 / 90_864) ** 2, 10)
    expect(atLeastOneAlive([at90, at90])).toBeCloseTo(0.5715, 3)
    expect(atLeastOneAlive([at95, at95])).toBeCloseTo(1 - (1 - 13_015 / 90_864) ** 2, 10)
  })
})
