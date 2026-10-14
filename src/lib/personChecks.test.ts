import { describe, expect, it } from 'vitest'
import { GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { takeHome } from '../engine/takeHome.ts'
import type { Person } from '../engine/types.ts'
import { BELOW_BY, depositsCheck } from './deposits.ts'
import { SAME_WITHIN, netPayCheck } from './netPay.ts'
import { PERSON_CHECKS_COPY } from './personChecksCopy.ts'
import { setDeposited, setNetPay } from './profileEdit.ts'
import { defaultProfile, validateProfile } from './schema.ts'

// The two checks of « Vérifier avec mes relevés »: the year's net pay against what the salary leaves, and what was put into an account against what it is worth. Neither is read by the plan.

const NOW = 2026
const A = { inflation: 0.021, wageGrowth: 0.027 }
const person = (over: Partial<Person> = {}): Person => ({ ...structuredClone(GOLDEN_HOUSEHOLD.persons[0]), salaryToday: 120_000, birth: { year: 1992, month: 4 }, ...over })
const leaves = takeHome(120_000, NOW - 1992, NOW, A, false)

describe('the net pay beside what the salary leaves', () => {
  it('is null while nothing is typed, or there is no salary to compare with', () => {
    expect(netPayCheck(person(), A, false, NOW)).toBeNull()
    expect(netPayCheck(person({ netPayYearly: 0 }), A, false, NOW)).toBeNull()
    expect(netPayCheck(person({ netPayYearly: 70_000, salaryToday: 0 }), A, false, NOW)).toBeNull()
  })

  it('says the same within two percent of what the salary leaves, either way', () => {
    expect(netPayCheck(person({ netPayYearly: leaves }), A, false, NOW)!.kind).toBe('same')
    expect(netPayCheck(person({ netPayYearly: leaves * (1 - SAME_WITHIN + 0.001) }), A, false, NOW)!.kind).toBe('same')
    expect(netPayCheck(person({ netPayYearly: leaves * (1 + SAME_WITHIN - 0.001) }), A, false, NOW)!.kind).toBe('same')
  })

  it('a net pay well under the calculation is more withheld at the source than the calculation knows: the gap is the difference', () => {
    const c = netPayCheck(person({ netPayYearly: 73_773 }), A, false, NOW)!
    expect(c.kind).toBe('fewer')
    expect(c.expected).toBeCloseTo(leaves, 6)
    expect(c.gap).toBeCloseTo(leaves - 73_773, 6)
    expect(c.gap).toBeGreaterThan(7_000) // about 8 000 $ of retirement-plan and similar deductions
  })

  it('a net pay above the calculation says so', () => {
    const c = netPayCheck(person({ netPayYearly: leaves + 10_000 }), A, false, NOW)!
    expect(c.kind).toBe('more')
    expect(c.gap).toBeCloseTo(-10_000, 6)
  })

  it('a figure just past two percent is a gap, either way', () => {
    expect(netPayCheck(person({ netPayYearly: leaves * (1 - SAME_WITHIN - 0.002) }), A, false, NOW)!.kind).toBe('fewer')
    expect(netPayCheck(person({ netPayYearly: leaves * (1 + SAME_WITHIN + 0.002) }), A, false, NOW)!.kind).toBe('more')
  })

  it('reads the age at the year\'s end: past 65 the age amount leaves more of the same salary', () => {
    // At a low salary: the age amount is cut away above about 46 000 $ of income, so it does nothing for 120 000 $.
    const young = netPayCheck(person({ salaryToday: 40_000, netPayYearly: 30_000 }), A, false, NOW)!
    const old = netPayCheck(person({ salaryToday: 40_000, netPayYearly: 30_000, birth: { year: 1950, month: 4 } }), A, false, NOW)!
    expect(young.expected).toBeCloseTo(takeHome(40_000, NOW - 1992, NOW, A, false), 6)
    expect(old.expected).toBeGreaterThan(young.expected)
  })
})

describe('what was put into an account beside what it is worth', () => {
  it('is null while nothing was put in', () => {
    expect(depositsCheck(undefined, 30_000)).toBeNull()
    expect(depositsCheck(0, 30_000)).toBeNull()
  })

  it('is the change since the money went in, and a gain is not a warning', () => {
    expect(depositsCheck(100_000, 31_764)!.change).toBeCloseTo(-0.68236, 5)
    expect(depositsCheck(100_000, 120_000)!.change).toBeCloseTo(0.2, 12)
    expect(depositsCheck(100_000, 120_000)!.below).toBe(false)
    expect(depositsCheck(100_000, 100_000)!.below).toBe(false)
  })

  it('is « clearly below » once it has lost a fifth, not before', () => {
    expect(BELOW_BY).toBe(0.2)
    expect(depositsCheck(100_000, 80_001)!.below).toBe(false)
    expect(depositsCheck(100_000, 80_000)!.below).toBe(true)
    expect(depositsCheck(100_000, 0)).toEqual({ change: -1, below: true })
  })
})

describe('the edits', () => {
  it('set, clear, and give back the same person when nothing changes', () => {
    const p = person()
    const set = setNetPay(p, 73_773)
    expect(set.netPayYearly).toBe(73_773)
    expect(setNetPay(set, 73_773)).toBe(set)
    expect('netPayYearly' in setNetPay(set, null)).toBe(false)
    expect(setNetPay(p, null)).toBe(p)
    const d = setDeposited(p, 'tfsa', 103_800)
    expect(d.accounts.tfsa.deposited).toBe(103_800)
    expect(d.accounts.rrsp.deposited).toBeUndefined() // another account is left alone
    expect(setDeposited(d, 'tfsa', 103_800)).toBe(d)
    expect('deposited' in setDeposited(d, 'tfsa', null).accounts.tfsa).toBe(false)
    expect(setDeposited(p, 'nonReg', null)).toBe(p)
  })

  it('a saved profile keeps them through validation, and an older one has neither', () => {
    const base = defaultProfile({ year: NOW })
    const withBoth = structuredClone(base)
    withBoth.household.persons[0] = setDeposited(setNetPay(withBoth.household.persons[0], 70_000), 'rrsp', 50_000)
    const out = validateProfile(JSON.parse(JSON.stringify(withBoth)))
    expect(out.ok, JSON.stringify(out.ok ? '' : out.problems)).toBe(true)
    if (out.ok) {
      expect(out.profile.household.persons[0].netPayYearly).toBe(70_000)
      expect(out.profile.household.persons[0].accounts.rrsp.deposited).toBe(50_000)
    }
    const plain = validateProfile(JSON.parse(JSON.stringify(base)))
    expect(plain.ok && 'netPayYearly' in plain.profile.household.persons[0]).toBe(false)
  })

  it('refuses a net pay or a deposit that is not a sensible number', () => {
    for (const patch of [{ netPayYearly: -1 }, { netPayYearly: 'x' }, { netPayYearly: 1e9 }]) {
      const p = JSON.parse(JSON.stringify(defaultProfile({ year: NOW })))
      Object.assign(p.household.persons[0], patch)
      expect(validateProfile(p).ok, JSON.stringify(patch)).toBe(false)
    }
    for (const bad of [-5, 'x', 1e10]) {
      const p = JSON.parse(JSON.stringify(defaultProfile({ year: NOW })))
      p.household.persons[0].accounts.tfsa.deposited = bad
      expect(validateProfile(p).ok, String(bad)).toBe(false)
    }
  })
})

describe('the words', () => {
  it('say the figures they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = PERSON_CHECKS_COPY[lang]
      expect(c.netPay.same('E')).toContain('E')
      for (const f of [c.netPay.fewer, c.netPay.more]) for (const part of ['E', 'G']) expect(f('E', 'G')).toContain(part)
      expect(c.netPay.rrsp('R')).toContain('R')
      expect(c.deposits.label('A')).toContain('A')
      for (const part of ['D', 'B', 'C']) expect(c.deposits.line('D', 'B', 'C')).toContain(part)
      expect(c.deposits.below('X')).toContain('X')
    }
    expect(PERSON_CHECKS_COPY.fr.summary).not.toBe(PERSON_CHECKS_COPY.en.summary)
  })
})
