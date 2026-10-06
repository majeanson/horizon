// VERIFIED-AGAINST
// source:    https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html
// title:     Chart - Prescribed factors
// retrieved: 2026-10-06
// tolerance: exact (the chart prints four decimals)
//
// Further sources, all read on 2026-10-06 (canada.ca, Canada Revenue Agency):
//   · .../topics/tax-free-savings-account/contributing/before.html — « Before you contribute to a TFSA »: the annual-limit history.
//   · .../topics/tax-free-savings-account/contributing/calculate-room.html — « Calculate your TFSA contribution room »: the room formula.
//   · .../topics/rrsps-related-plans/rrsp-options-when-you-turn-71.html — « RRSP options when you turn 71 ».
//   · .../topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html — the RRSP room formula.
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { ageAtJan1, firstRrifYear, grow, nonRegContribute, nonRegWithdraw, rrifFactor, rrifMinimum, rrspNextRoom, tfsaContribute, tfsaNextRoom, tfsaWithdraw, type AccountRules } from '../accounts.ts'

const R: AccountRules = knownYear(2026).accounts

describe('RRIF prescribed factors — the CRA chart, row by row (a second transcription, « All other RRIFs »)', () => {
  // The chart as printed: age at 1 January → factor.
  const CHART: Record<number, number> = {
    71: 0.0528, 72: 0.054, 73: 0.0553, 74: 0.0567, 75: 0.0582, 76: 0.0598, 77: 0.0617, 78: 0.0636, 79: 0.0658,
    80: 0.0682, 81: 0.0708, 82: 0.0738, 83: 0.0771, 84: 0.0808, 85: 0.0851, 86: 0.0899, 87: 0.0955, 88: 0.1021,
    89: 0.1099, 90: 0.1192, 91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879, 95: 0.2,
  }

  it.each(Object.entries(CHART).map(([age, f]) => [Number(age), f] as const))('age %d → %f', (age, expected) => {
    expect(rrifFactor(age, R)).toBe(expected)
  })

  it('95 and over stay at 20 %', () => {
    for (const age of [95, 96, 100, 110]) expect(rrifFactor(age, R)).toBe(0.2)
  })

  it('below 71 the factor is 1 ÷ (90 − age): « If the age is 70 years or younger … 1 divided by (90 minus the age) »', () => {
    expect(rrifFactor(65, R)).toBeCloseTo(1 / 25, 12) // 4.00 %
    expect(rrifFactor(60, R)).toBeCloseTo(1 / 30, 12) // 3.33 %
    expect(rrifFactor(70, R)).toBeCloseTo(1 / 20, 12) // 5.00 %
    expect(rrifFactor(55, R)).toBeCloseTo(1 / 35, 12)
  })

  it('the formula meets the table at 71: 1/(90−70) = 5.00 % and then 5.28 % — the factors rise with age, strictly to 95 and flat after', () => {
    let prev = 0
    for (let age = 40; age <= 100; age++) {
      const f = rrifFactor(age, R)
      if (age <= 95) expect(f, `age ${age}`).toBeGreaterThan(prev)
      else expect(f, `age ${age}`).toBe(prev)
      prev = f
    }
  })

  it('the minimum is the JANUARY balance × the factor: $500 000 at 72 → $27 000', () => {
    expect(rrifMinimum(72, 500_000, R)).toBe(27_000)
    expect(rrifMinimum(71, 100_000, R)).toBe(5_280)
    expect(rrifMinimum(95, 40_000, R)).toBe(8_000)
    expect(rrifMinimum(75, 0, R)).toBe(0)
    expect(rrifMinimum(75, -10, R)).toBe(0)
  })
})

describe('when the minimum starts — « December 31 of the year you turn 71 » converts the RRSP; the minimum begins the year after', () => {
  it('a person born in 1955 turns 71 in 2026, converts by 31 December 2026, and owes the first minimum in 2027 at the age-71 factor', () => {
    expect(firstRrifYear(1955, R)).toBe(2027)
    expect(ageAtJan1(2027, 1955)).toBe(71)
    expect(rrifFactor(ageAtJan1(2027, 1955), R)).toBe(0.0528)
  })

  it('the age at 1 January is the age attained in the year, less one', () => {
    expect(ageAtJan1(2026, 1960)).toBe(65) // born 1960: turns 66 during 2026, is 65 on 1 January
    expect(ageAtJan1(2026, 2026)).toBe(-1)
  })
})

describe('TFSA — the CRA\'s room mechanics and the annual limits', () => {
  // « 2009 to 2012 $5,000 · 2013 and 2014 $5,500 · 2015 $10,000 · 2016 to 2018 $5,500 · 2019 to 2022 $6,000 · 2023 $6,500 · 2024 to 2026 $7,000 »
  const LIMITS: Record<number, number> = {}
  for (const [from, to, v] of [[2009, 2012, 5_000], [2013, 2014, 5_500], [2015, 2015, 10_000], [2016, 2018, 5_500], [2019, 2022, 6_000], [2023, 2023, 6_500], [2024, 2026, 7_000]] as const) {
    for (let y = from; y <= to; y++) LIMITS[y] = v
  }

  it('the cumulative room since 2009 is the sum of the annual limits — the 109 000 $ the parameters record (a derived total, flagged `verify`)', () => {
    expect(Object.values(LIMITS).reduce((s, v) => s + v, 0)).toBe(109_000)
    expect(R.tfsaCumulativeSince2009).toBe(109_000)
  })

  it('the 2026 limit is 7 000 $', () => {
    expect(R.tfsaLimit).toBe(7_000)
    expect(LIMITS[2026]).toBe(R.tfsaLimit)
  })

  it('room on 1 January = what was left + last year\'s withdrawals + the new limit (« Calculate your TFSA contribution room »)', () => {
    expect(tfsaNextRoom(1_000, 3_000, 7_000)).toBe(11_000)
    expect(tfsaNextRoom(0, 0, 7_000)).toBe(7_000)
  })

  it('a contribution is capped at the room, and the surplus is left for another account', () => {
    const r = tfsaContribute({ balance: 10_000, room: 4_000 }, 6_500)
    expect(r.contributed).toBe(4_000)
    expect(r.left).toBe(2_500)
    expect(r.state).toEqual({ balance: 14_000, room: 0 })
  })

  it('a withdrawal is not taxable and does NOT free room until next January', () => {
    const w = tfsaWithdraw({ balance: 20_000, room: 500 }, 5_000)
    expect(w.taken).toBe(5_000)
    expect(w.state).toEqual({ balance: 15_000, room: 500 })
  })

  it('cannot withdraw more than the balance, nor a negative amount', () => {
    expect(tfsaWithdraw({ balance: 100, room: 0 }, 500).taken).toBe(100)
    expect(tfsaWithdraw({ balance: 100, room: 0 }, -5).taken).toBe(0)
    expect(tfsaContribute({ balance: 0, room: 100 }, -5).contributed).toBe(0)
  })
})

describe('RRSP room — « 18 % of your earned income in the previous year, to the annual limit, less the pension adjustment »', () => {
  it('18 % of 100 000 $ = 18 000 $, under the 33 810 $ limit', () => {
    expect(rrspNextRoom(0, 100_000, 0, R, 33_810)).toBe(18_000)
  })

  it('is capped at the dollar limit: 250 000 $ of earnings gives 33 810 $, not 45 000 $', () => {
    expect(rrspNextRoom(0, 250_000, 0, R, 33_810)).toBe(33_810)
  })

  it('a pension adjustment uses room up, never below zero: a 2 % plan on 90 000 $ reports 9 × 1 800 − 600 = 15 600 $', () => {
    expect(rrspNextRoom(0, 90_000, 15_600, R, 33_810)).toBe(600)
    expect(rrspNextRoom(0, 40_000, 15_600, R, 33_810)).toBe(0)
  })

  it('unused room carries forward without limit (« You can carry forward indefinitely any part of your RRSP deduction room »)', () => {
    expect(rrspNextRoom(50_000, 100_000, 0, R, 33_810)).toBe(68_000)
  })
})

describe('non-registered — only the gain in what is withdrawn is taxable', () => {
  it('half the balance is gain: withdrawing 10 000 $ from 40 000 $ with a 20 000 $ cost base realises 5 000 $', () => {
    const w = nonRegWithdraw({ balance: 40_000, acb: 20_000 }, 10_000)
    expect(w.taken).toBe(10_000)
    expect(w.realizedGain).toBe(5_000)
    expect(w.state).toEqual({ balance: 30_000, acb: 15_000 }) // the cost base falls in proportion
  })

  it('a withdrawal from an account at a loss realises no gain (the engine does not claim the loss)', () => {
    expect(nonRegWithdraw({ balance: 10_000, acb: 15_000 }, 5_000).realizedGain).toBe(0)
  })

  it('withdrawing everything realises the whole gain and empties the cost base', () => {
    const w = nonRegWithdraw({ balance: 50_000, acb: 30_000 }, 80_000)
    expect(w.taken).toBe(50_000)
    expect(w.realizedGain).toBe(20_000)
    expect(w.state.balance).toBe(0)
    expect(w.state.acb).toBeCloseTo(0, 9)
  })

  it('a contribution raises balance and cost base together', () => {
    expect(nonRegContribute({ balance: 1_000, acb: 800 }, 500)).toEqual({ balance: 1_500, acb: 1_300 })
  })

  it('nothing to withdraw from nothing', () => {
    expect(nonRegWithdraw({ balance: 0, acb: 0 }, 100)).toEqual({ state: { balance: 0, acb: 0 }, taken: 0, realizedGain: 0 })
  })
})

describe('growth — the mid-year convention', () => {
  it('no flows: balance × (1 + r)', () => {
    expect(grow(100_000, 0, 0.05)).toBe(105_000)
  })

  it('a contribution grows for half a year, a withdrawal costs half a year of growth', () => {
    expect(grow(100_000, 10_000, 0.05)).toBeCloseTo(105_000 + 10_000 * 1.05 ** 0.5, 2)
    expect(grow(100_000, -10_000, 0.05)).toBeCloseTo(105_000 - 10_000 * 1.05 ** 0.5, 2)
  })

  it('at 0 % nothing grows and flows are exact', () => {
    expect(grow(50_000, -3_000, 0)).toBe(47_000)
  })
})
