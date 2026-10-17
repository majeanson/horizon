import { describe, expect, it } from 'vitest'
import { payoffMonths, payoffYear } from '../engine/home.ts'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { calendarByYear, planCalendar, type CalendarKind } from './planCalendar.ts'
import { timelineOf } from './timeline.ts'

// THE PLAN AS A CALENDAR says what the profile says, in order, and says it the way the plan's line does: the dates the two share (retiring, the QPP, the OAS) are the SAME years.

const TODAY = 2026
const HORIZON = 95
const ALL = [GOLDEN_HOUSEHOLD, ...Object.values(EXAMPLES).map((e) => e.household)]
const kinds = (h: (typeof ALL)[number]) => planCalendar(h, TODAY, HORIZON).map((e) => e.kind)

describe('every household', () => {
  it('has dates in order, all still ahead, and one end of the plan for each person', () => {
    for (const h of ALL) {
      const events = planCalendar(h, TODAY, HORIZON)
      for (let i = 1; i < events.length; i++) expect(events[i].year).toBeGreaterThanOrEqual(events[i - 1].year)
      for (const e of events) expect(e.year).toBeGreaterThan(TODAY)
      expect(events.filter((e) => e.kind === 'end')).toHaveLength(h.persons.length)
    }
  })

  it('shares its retire / QPP / OAS years with the plan\'s line', () => {
    for (const h of ALL) {
      const events = planCalendar(h, TODAY, HORIZON)
      timelineOf(h, TODAY, HORIZON).forEach((t, i) => {
        for (const mark of t.marks) {
          const hit = events.find((e) => e.kind === mark.kind && (e.who === i || e.who === null))
          expect(hit?.year, `${mark.kind} of person ${i}`).toBe(t.birthYear + mark.age)
        }
      })
    }
  })

  it('names the person only when there are two', () => {
    for (const h of ALL) for (const e of planCalendar(h, TODAY, HORIZON)) if (h.persons.length === 1 && ['retire', 'rrq', 'oas', 'end'].includes(e.kind)) expect(e.who).toBeNull()
    expect(planCalendar(GOLDEN_HOUSEHOLD, TODAY, HORIZON).filter((e) => e.kind === 'retire').map((e) => e.who)).toEqual([0, 1])
  })
})

describe('what the profile adds', () => {
  it('a child to come is born on its year; a child at home leaves at the age the budget says', () => {
    const planner = EXAMPLES.planner.household
    const events = planCalendar(planner, TODAY, HORIZON)
    expect(events.find((e) => e.kind === 'childBorn')?.year).toBe(2028)
    if (planner.childSpending) expect(events.find((e) => e.kind === 'childLeaves')?.year).toBe(2028 + planner.childSpending.untilAge)
  })

  it('a dated flow begins on its year and, when it lasts, ends on its last', () => {
    const planner = EXAMPLES.planner.household
    const events = planCalendar(planner, TODAY, HORIZON)
    for (const f of planner.flows ?? []) {
      if (f.fromYear > TODAY) expect(events.some((e) => e.kind === 'flowStart' && e.year === f.fromYear && e.label === f.label)).toBe(true)
      if (f.kind !== 'windfall' && f.toYear > f.fromYear && f.toYear > TODAY) expect(events.some((e) => e.kind === 'flowEnd' && e.year === f.toYear && e.label === f.label)).toBe(true)
      if (f.kind === 'windfall') expect(events.some((e) => e.kind === 'flowEnd' && e.label === f.label)).toBe(false)
    }
    expect((planner.flows ?? []).length).toBeGreaterThan(0)
  })

  it('the mortgage is paid off on the year the engine\'s own arithmetic says', () => {
    const h = ALL.find((x) => x.home && x.home.mortgage.balance > 0 && x.home.sale === null)!
    expect(h, 'an example with a mortgage and no sale').toBeDefined()
    const months = payoffMonths(h.home!.mortgage, TODAY)!
    expect(planCalendar(h, TODAY, HORIZON).find((e) => e.kind === 'mortgageDone')?.year).toBe(payoffYear(TODAY, months))
  })

  it('a house sold at an age is sold the year the first person reaches it, and a payoff after that is not told', () => {
    const h = EXAMPLES.downsizer.household
    const events = planCalendar(h, TODAY, HORIZON)
    expect(events.find((e) => e.kind === 'homeSold')?.year).toBe(h.persons[0].birth.year + h.home!.sale!.age)
    const sold = events.find((e) => e.kind === 'homeSold')!.year
    for (const e of events) if (e.kind === 'mortgageDone') expect(e.year).toBeLessThan(sold)
  })

  it('a home owned outright, or none, has no mortgage date', () => {
    expect(kinds(EXAMPLES.heir.household)).not.toContain<CalendarKind>('mortgageDone')
    expect(kinds({ ...GOLDEN_HOUSEHOLD, home: null })).not.toContain<CalendarKind>('mortgageDone')
  })
})

describe('by year', () => {
  it('groups events of the same year, in order, and loses none', () => {
    const events = planCalendar(GOLDEN_HOUSEHOLD, TODAY, HORIZON)
    const years = calendarByYear(events)
    expect(years.flatMap((y) => y.events)).toEqual(events)
    expect(years.map((y) => y.year)).toEqual([...new Set(events.map((e) => e.year))])
    expect(calendarByYear([])).toEqual([])
  })
})
