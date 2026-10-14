import { describe, expect, it } from 'vitest'
import { HOUSE_COST_SHARE, SHS_TENURE, STARTER_IDS, UPKEEP_PER_YEAR, VEHICLES_PER_YEAR, VEHICLE_UNTIL_AGE, isStarterId, plannedStarters, tenureOf, type Starter, type StarterId } from './plannedExpenses.ts'
import { LIFE_COPY } from './lifeCopy.ts'
import { defaultProfile, validateProfile, type Profile } from './schema.ts'

// WHERE EACH STARTING POINT'S FIGURE COMES FROM, pinned. A statistic is a figure read on a published page and a rule is a rule: a wrong tenure, a sign error in the
// renovation reserve or a house still being repaired after it is sold would each move the answer without any test noticing.

const NOW = 2026
const labels = Object.fromEntries(STARTER_IDS.map((id) => [id, `name:${id}`])) as Record<StarterId, string>

/** A household of one born in 1992, with the home the test asks for. */
function household(home: { value: number; balance: number; sale?: { age: number; replacementCost: number } } | null, horizonAge = 95): Profile {
  const p = defaultProfile({ year: NOW })
  p.household.persons[0].birth = { year: 1992, month: 4 }
  p.assumptions.horizonAge = horizonAge
  p.household.home = home && { value: home.value, mortgage: { balance: home.balance, rate: 0.05, monthlyPayment: 1700 }, sale: home.sale ?? null }
  return p
}
const byId = (list: readonly Starter[], id: StarterId): Starter => {
  const s = list.find((x) => x.id === id)
  if (!s) throw new Error(`no starting point « ${id} »`)
  return s
}

describe('which group of households this one is in', () => {
  it('an owner with a mortgage still to pay, an owner without, and — with no home entered — a renter', () => {
    expect(tenureOf(household({ value: 650000, balance: 266000 }))).toBe('ownerWithMortgage')
    expect(tenureOf(household({ value: 650000, balance: 0 }))).toBe('ownerWithoutMortgage')
    expect(tenureOf(household(null))).toBe('renter')
    expect(tenureOf(household({ value: 0, balance: 0 }))).toBe('renter')
  })
})

describe('the house: upkeep (a statistic) and renovations (a rule built on it)', () => {
  it('an owner with a mortgage: upkeep is the Statistics Canada average of owners with a mortgage, renovations are the rule less that upkeep, to the hundred', () => {
    const list = plannedStarters(household({ value: 650000, balance: 266000 }), NOW, labels)
    const upkeep = byId(list, 'upkeep')
    expect(upkeep.flow.amount).toBe(1667)
    expect(upkeep.basis).toEqual({ kind: 'statistic', tenure: 'ownerWithMortgage', figure: 1667, source: SHS_TENURE })
    const renovation = byId(list, 'renovation')
    // 1 % of 650 000 = 6 500, less the 1 667 the upkeep already counts = 4 833 → 4 800
    expect(renovation.flow.amount).toBe(4800)
    expect(renovation.basis).toEqual({ kind: 'rule', share: HOUSE_COST_SHARE, homeValue: 650000, upkeep: 1667, source: SHS_TENURE })
  })

  it('together the two make the rule\'s whole 1 %, within the hundred it is rounded to: the same dollar is never counted twice', () => {
    for (const value of [300000, 650000, 1200000]) {
      const list = plannedStarters(household({ value, balance: 100000 }), NOW, labels)
      expect(Math.abs(byId(list, 'upkeep').flow.amount + byId(list, 'renovation').flow.amount - value * HOUSE_COST_SHARE)).toBeLessThanOrEqual(50)
    }
  })

  it('an owner without a mortgage takes the other group\'s average', () => {
    const list = plannedStarters(household({ value: 650000, balance: 0 }), NOW, labels)
    expect(byId(list, 'upkeep').flow.amount).toBe(UPKEEP_PER_YEAR.ownerWithoutMortgage)
    expect(UPKEEP_PER_YEAR.ownerWithoutMortgage).toBe(1139)
    expect(byId(list, 'renovation').flow.amount).toBe(5400) // 6 500 − 1 139 = 5 361
  })

  it('a modest home is already covered by the statistic: the reserve is 0, never negative', () => {
    const list = plannedStarters(household({ value: 100000, balance: 50000 }), NOW, labels)
    expect(byId(list, 'renovation').flow.amount).toBe(0)
  })

  it('a household with no home gets neither of the two', () => {
    const ids = plannedStarters(household(null), NOW, labels).map((s) => s.id)
    expect(ids).not.toContain('upkeep')
    expect(ids).not.toContain('renovation')
  })

  it('both run from this year to the horizon, or to the year BEFORE the home is sold', () => {
    const kept = plannedStarters(household({ value: 650000, balance: 266000 }), NOW, labels)
    expect([byId(kept, 'upkeep').flow.fromYear, byId(kept, 'upkeep').flow.toYear]).toEqual([NOW, 1992 + 95])
    const sold = plannedStarters(household({ value: 650000, balance: 266000, sale: { age: 70, replacementCost: 0 } }), NOW, labels)
    expect(byId(sold, 'upkeep').flow.toYear).toBe(1992 + 70 - 1)
    expect(byId(sold, 'renovation').flow.toYear).toBe(1992 + 70 - 1)
  })

  it('a home sold before this year is not repaired: the event is one year, never a range that ends before it starts', () => {
    const early = plannedStarters(household({ value: 650000, balance: 266000, sale: { age: 20, replacementCost: 0 } }), NOW, labels)
    expect(byId(early, 'upkeep').flow.toYear).toBe(NOW)
  })
})

describe('the cars', () => {
  it('a yearly allowance equal to the average a household of its tenure spends on the vehicles it buys', () => {
    expect(byId(plannedStarters(household({ value: 650000, balance: 266000 }), NOW, labels), 'vehicle').flow.amount).toBe(5573)
    expect(byId(plannedStarters(household({ value: 650000, balance: 0 }), NOW, labels), 'vehicle').flow.amount).toBe(3640)
    expect(byId(plannedStarters(household(null), NOW, labels), 'vehicle').flow.amount).toBe(2839)
    expect(VEHICLES_PER_YEAR).toEqual({ ownerWithMortgage: 5573, ownerWithoutMortgage: 3640, renter: 2839 })
  })

  it('counted until the oldest person is 80 — or the horizon, if that comes first', () => {
    expect(byId(plannedStarters(household(null), NOW, labels), 'vehicle').flow.toYear).toBe(1992 + VEHICLE_UNTIL_AGE)
    expect(byId(plannedStarters(household(null, 75), NOW, labels), 'vehicle').flow.toYear).toBe(1992 + 75)
  })

  it('the oldest of a couple sets the end', () => {
    const p = household(null)
    p.household.persons.push({ ...p.household.persons[0], id: 'spouse', birth: { year: 1985, month: 1 } })
    expect(byId(plannedStarters(p, NOW, labels), 'vehicle').flow.toYear).toBe(1985 + VEHICLE_UNTIL_AGE)
  })
})

describe('the plain starting points are what the page always offered', () => {
  const list = plannedStarters(household({ value: 650000, balance: 266000 }), NOW, labels)
  const flowOf = (id: StarterId) => byId(list, id).flow

  it('an inheritance, a big expense, a car, a rent and care later on, with the same amounts and years as before', () => {
    expect(flowOf('heritage')).toMatchObject({ kind: 'windfall', amount: 100000, fromYear: NOW + 10, toYear: NOW + 10, taxable: false })
    expect(flowOf('roof')).toMatchObject({ kind: 'expense', amount: 25000, fromYear: NOW + 3, toYear: NOW + 3 })
    expect(flowOf('car')).toMatchObject({ kind: 'expense', amount: 35000, fromYear: NOW + 2, toYear: NOW + 2 })
    expect(flowOf('rent')).toMatchObject({ kind: 'income', amount: 12000, fromYear: NOW + 5, toYear: 1992 + 95, taxable: true })
    expect(flowOf('care')).toMatchObject({ kind: 'expense', amount: 30000, fromYear: 1992 + 85, toYear: 1992 + 95 })
  })

  it('a project of one\'s own: a once-only expense to be named and priced by the person', () => {
    expect(flowOf('project')).toMatchObject({ kind: 'expense', amount: 10000, fromYear: NOW + 2, toYear: NOW + 2 })
  })

  it('each says plainly that no statistic backs it', () => {
    for (const id of ['heritage', 'roof', 'car', 'rent', 'care', 'project'] as const) expect(byId(list, id).basis).toEqual({ kind: 'placeholder' })
  })
})

describe('every starting point, whatever it rests on', () => {
  const list = plannedStarters(household({ value: 650000, balance: 266000 }), NOW, labels)

  it('is added as an estimate of its own id, under the name the copy gives it', () => {
    for (const s of list) {
      expect(s.flow.estimate, s.id).toBe(s.id)
      expect(s.flow.label, s.id).toBe(`name:${s.id}`)
    }
  })

  it('the ids are the closed list, in order, each once', () => {
    expect(list.map((s) => s.id)).toEqual(['upkeep', 'renovation', 'vehicle', 'heritage', 'roof', 'car', 'rent', 'care', 'project'])
    expect(new Set(STARTER_IDS).size).toBe(STARTER_IDS.length)
    for (const id of STARTER_IDS) expect(isStarterId(id)).toBe(true)
    expect(isStarterId('nope')).toBe(false)
  })

  it('a windfall is one year, an event never ends before it starts, an owner is the first person', () => {
    for (const s of list) {
      expect(s.flow.toYear, s.id).toBeGreaterThanOrEqual(s.flow.fromYear)
      expect(s.flow.owner).toBe('self')
      if (s.flow.kind === 'windfall') expect(s.flow.toYear).toBe(s.flow.fromYear)
    }
  })

  it('a saved profile holding all of them is one the validator accepts — a stored profile it refuses is wiped on the next launch', () => {
    const p = household({ value: 650000, balance: 266000 })
    p.household.flows = list.map((s) => s.flow)
    const result = validateProfile(JSON.parse(JSON.stringify(p)))
    expect(result.ok, JSON.stringify(result.ok ? '' : result.problems)).toBe(true)
    if (result.ok) expect((result.profile.household.flows ?? []).map((f) => f.estimate)).toEqual(list.map((s) => s.id))
  })
})

describe('the sources', () => {
  it('Statistics Canada\'s table, read on a stated day, with its page in each language', () => {
    expect(SHS_TENURE.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(SHS_TENURE.url.en).toBe('https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022501')
    expect(SHS_TENURE.url.fr).toBe('https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1110022501')
    expect(SHS_TENURE.title.fr).toContain('11-10-0225-01')
    expect(SHS_TENURE.title.en).toContain('11-10-0225-01')
  })

  it('only the two statistics and the rule carry one; a placeholder carries none, and says so', () => {
    const list = plannedStarters(household({ value: 650000, balance: 266000 }), NOW, labels)
    const sourced = list.filter((s) => s.basis.kind !== 'placeholder').map((s) => s.id)
    expect(sourced).toEqual(['upkeep', 'renovation', 'vehicle'])
  })
})

describe('the words', () => {
  it('every starting point has a name in both languages, short enough for the field it fills', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const id of STARTER_IDS) {
        const name = LIFE_COPY[lang].flows.starters[id]
        expect(name.trim(), `${lang} ${id}`).not.toBe('')
        expect(name.length, `${lang} ${id}`).toBeLessThanOrEqual(60)
      }
    }
  })

  it('the three kinds of basis are said with the figures they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = LIFE_COPY[lang].flows.planned
      for (const tenure of ['ownerWithMortgage', 'ownerWithoutMortgage', 'renter'] as const) expect(c.tenure[tenure].trim()).not.toBe('')
      expect(c.upkeep('T', 'F1')).toContain('F1')
      expect(c.vehicle('T', 'F2')).toContain('F2')
      const rule = c.renovation('S', 'V', 'U')
      for (const part of ['S', 'V', 'U']) expect(rule).toContain(part)
      expect(c.placeholder.trim()).not.toBe('')
    }
  })

  it('the two languages say different words — no French pasted into the English', () => {
    expect(LIFE_COPY.fr.flows.planned.placeholder).not.toBe(LIFE_COPY.en.flows.planned.placeholder)
    expect(LIFE_COPY.fr.flows.estimate.mark).not.toBe(LIFE_COPY.en.flows.estimate.mark)
    for (const id of STARTER_IDS) expect(LIFE_COPY.fr.flows.starters[id], id).not.toBe(LIFE_COPY.en.flows.starters[id])
  })
})
