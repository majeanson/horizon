import { describe, expect, it } from 'vitest'
import { EXAMPLES, type ExampleId } from '../engine/golden/examples.ts'
import { retireAt } from '../engine/retireAt.ts'
import { exampleProfile } from './example.ts'
import { factId } from './facts.ts'
import { assumptionsOf } from './resultsModel.ts'
import { defaultProfile, type Profile } from './schema.ts'
import { MOVERS_SHOWN, SCALE, SLOT_GROUP, sheetModel, unconfirmedFacts, type SheetStat } from './sheetModel.ts'

const TODAY = { year: 2026, month: 10 }
const profileOf = (id: ExampleId): Profile => exampleProfile(id)
// The search and the model are pure and slow (a dozen projections each), and a slow CI runner is several times slower than this machine: each is worked out once.
const earliestCache = new Map<ExampleId, number | null>()
const earliestOf = (id: ExampleId): number | null => {
  if (!earliestCache.has(id)) {
    const p = profileOf(id)
    earliestCache.set(id, retireAt(p.household, assumptionsOf(p, TODAY), { stopAtFirstOk: true }).earliestOk)
  }
  return earliestCache.get(id)!
}
const sheetCache = new Map<string, ReturnType<typeof sheetModel>>()
// `...asked` so that an explicit `undefined` (« still being worked out ») is not replaced by the default.
const sheet = (id: ExampleId, ...asked: [(number | null | undefined)?]) => {
  const earliest = asked.length > 0 ? asked[0] : earliestOf(id)
  const key = `${id}|${String(earliest)}`
  if (!sheetCache.has(key)) {
    const p = profileOf(id)
    sheetCache.set(key, sheetModel(p, assumptionsOf(p, TODAY), earliest))
  }
  return sheetCache.get(key)!
}
const stat = (m: ReturnType<typeof sheet>, id: SheetStat['id']): SheetStat => m.stats.find((s) => s.id === id)!

describe('the sheet of a household', { timeout: 120_000 }, () => {
  it('has the five stats in a fixed order, and every ready one has a figure and a bar inside its scale', () => {
    for (const id of Object.keys(EXAMPLES) as ExampleId[]) {
      const m = sheet(id)
      expect(m.stats.map((s) => s.id), id).toEqual(['runway', 'cover', 'saving', 'keep', 'resilience'])
      for (const s of m.stats) {
        if (s.status !== 'ready') continue
        expect(Number.isFinite(s.value), `${id} ${s.id} value`).toBe(true)
        expect(s.fill!, `${id} ${s.id} fill`).toBeGreaterThanOrEqual(0)
        expect(s.fill!, `${id} ${s.id} fill`).toBeLessThanOrEqual(1)
        expect(s.scale, `${id} ${s.id} scale`).toBe(SCALE[s.id])
      }
    }
  })

  it('draws each bar as its figure over the stated scale, never anything else', () => {
    const m = sheet('golden')
    const cover = stat(m, 'cover')
    expect(cover.fill).toBeCloseTo(Math.min(1, cover.value! / SCALE.cover), 10)
    const saving = stat(m, 'saving')
    expect(saving.fill).toBeCloseTo(Math.min(1, saving.value! / SCALE.saving), 10)
    const keep = stat(m, 'keep')
    expect(keep.fill).toBeCloseTo(keep.value!, 10)
    const resilience = stat(m, 'resilience')
    expect(resilience.fill).toBeCloseTo(resilience.value! / SCALE.resilience, 10)
    expect(Number.isInteger(resilience.value)).toBe(true)
    const runway = stat(m, 'runway')
    expect(runway.fill).toBeCloseTo(Math.max(0, Math.min(1, runway.detail.margin! / SCALE.runway)), 10)
  })

  it('reads the margin as the later planned age less the earliest age, and a negative one when the plan does not hold at its own age', () => {
    const m = sheet('golden', 54)
    const planned = Math.max(...profileOf('golden').household.persons.map((p) => p.retirementAge))
    expect(stat(m, 'runway').value).toBe(54)
    expect(m.margin).toBe(planned - 54)
    expect(stat(sheet('golden', 18), 'runway').fill).toBe(1) // a margin past the scale still draws a full bar, not more
    expect(stat(sheet('golden', planned + 6), 'runway').fill).toBe(0) // …and a negative one an empty bar
    expect(sheet('golden', planned + 6).margin).toBe(-6)
  })

  it('totals the money to live on apart from the home and the pensions, and every balance leads to the profile field behind it', () => {
    const m = sheet('golden', 54)
    const investable = m.slots.filter((x) => SLOT_GROUP[x.kind] === 'investable')
    expect(m.investable).toBeCloseTo(investable.reduce((sum, x) => sum + (x.amount ?? 0), 0), 6)
    expect(m.investable).toBeGreaterThan(0)
    for (const x of m.slots) expect(x.fact === null, x.kind).toBe(x.kind === 'pension')
    // the home is a value, not money to live on: it is never in the total
    const average = sheet('average')
    const home = average.slots.find((x) => x.kind === 'home')!
    expect(home.amount).toBeGreaterThan(0)
    expect(average.investable).toBeCloseTo(average.slots.filter((x) => x.kind !== 'home' && x.kind !== 'pension').reduce((sum, x) => sum + x.amount!, 0), 6)
  })

  it('says « pending » while the earliest age is being worked out, and « none » when no age works', () => {
    expect(stat(sheet('golden', undefined), 'runway').status).toBe('pending')
    expect(sheet('golden', undefined).margin).toBeNull()
    const none = stat(sheet('golden', null), 'runway')
    expect(none.status).toBe('none')
    expect(none.fill).toBe(0)
  })

  it('has no runway for a household already retired, and no saving for one nobody of whom earns', () => {
    const m = sheet('retired')
    expect(stat(m, 'runway').status).toBe('none')
    expect(m.margin).toBeNull()
    expect(stat(m, 'saving').status).toBe('none')
    expect(stat(m, 'cover').status).toBe('ready')
    expect(m.people.every((x) => x.retired)).toBe(true)
  })

  it('says who is already retired, and when a pension starts', () => {
    expect(sheet('golden').people.map((x) => x.retired)).toEqual([false, false])
    expect(sheet('retired').people.every((x) => x.retired)).toBe(true)
    const pensions = sheet('golden').slots.filter((x) => x.kind === 'pension')
    expect(pensions.length).toBeGreaterThan(0)
    for (const x of pensions) expect(x.startAge).toBeGreaterThan(0)
  })

  it('counts the scenarios the plan as stated holds under, and says which', () => {
    // a plan that holds under Prudent holds under the two kinder scenarios, and the count is the number of scenarios that hold
    for (const id of Object.keys(EXAMPLES) as ExampleId[]) {
      const m = sheet(id)
      if (m.scenarios.prudent) expect(m.scenarios.neutral && m.scenarios.bold, id).toBe(true)
      if (m.scenarios.neutral) expect(m.scenarios.bold, id).toBe(true)
      expect(stat(m, 'resilience').value, id).toBe(Object.values(m.scenarios).filter(Boolean).length)
    }
    expect(sheet('heir').scenarios).toEqual({ prudent: true, neutral: true, bold: true })
    expect(stat(sheet('heir'), 'resilience').value).toBe(3)
    const golden = sheet('golden')
    expect(golden.scenarios).toEqual({ prudent: false, neutral: true, bold: true })
    expect(stat(golden, 'resilience').value).toBe(2)
    const behind = sheet('behind')
    expect(Object.values(behind.scenarios).every((x) => !x)).toBe(true)
    expect(stat(behind, 'resilience').value).toBe(0)
  })

  it('shows what the household holds, and whether each figure is read off a document', () => {
    const p = profileOf('average')
    const before = sheetModel(p, assumptionsOf(p, TODAY), 60)
    const rrsp = before.slots.find((s) => s.kind === 'rrsp' && s.owner === 'self')!
    expect(rrsp.amount).toBe(p.household.persons[0].accounts.rrsp.balance)
    expect(rrsp.confirmed).toBe(false)
    const confirmed = { ...p, confirmed: [factId('self', 'rrspBalance')] }
    expect(sheetModel(confirmed, assumptionsOf(confirmed, TODAY), 60).slots.find((s) => s.kind === 'rrsp' && s.owner === 'self')!.confirmed).toBe(true)
    expect(before.slots.some((s) => s.kind === 'home' && s.owner === 'household')).toBe(true)
    const golden = sheet('golden')
    expect(golden.slots.some((s) => s.kind === 'pension' && s.label !== null)).toBe(true)
  })

  it('ranks the unconfirmed figures by how far the answer moves, biggest first, keeping only those that move it', () => {
    const p = profileOf('average')
    const a = assumptionsOf(p, TODAY)
    const open = unconfirmedFacts(p)
    expect(open.length).toBeGreaterThan(4)
    const swings = Object.fromEntries(open.map((f, i) => [f.id, { years: i === 0 ? 0 : (i % 4) + 1 }]))
    const m = sheetModel(p, a, 60, swings)
    expect(m.sharpen.status).toBe('ready')
    expect(m.sharpen.remaining).toBe(open.length)
    expect(m.sharpen.movers.length).toBe(MOVERS_SHOWN)
    expect(m.sharpen.movers.map((x) => x.years)).toEqual([...m.sharpen.movers.map((x) => x.years)].sort((x, y) => y - x))
    expect(m.sharpen.movers.every((x) => x.years > 0 && !x.fact.confirmed)).toBe(true)
    expect(m.sharpen.movers.some((x) => x.fact.id === open[0].id)).toBe(false) // a swing of nothing is not worth a line
  })

  it('names what the profile plainly lacks — a statement, balances, working spending — and nothing for a complete one', () => {
    const p = profileOf('average')
    const a = assumptionsOf(p, TODAY)
    const bare = structuredClone(p)
    for (const person of bare.household.persons) {
      person.salaryToday = 90_000
      person.earningsHistory = {}
      person.accounts.rrsp.balance = 0
      person.accounts.tfsa.balance = 0
      person.accounts.nonReg.balance = 0
    }
    bare.household.spending.workingToday = 0
    expect(sheetModel(bare, assumptionsOf(bare, TODAY), 60, undefined).sharpen.absent).toEqual(['statement', 'accounts', 'spendingWork'])
    expect(sheetModel(p, a, 60, undefined).sharpen.absent).not.toContain('accounts')
  })

  it('says the ranking is pending until it is in, and has nothing to rank for a profile with gaps or a household already retired', () => {
    const p = profileOf('average')
    expect(sheetModel(p, assumptionsOf(p, TODAY), 60, undefined).sharpen.status).toBe('pending')
    const blank = defaultProfile({ year: 2026 })
    const b = sheetModel(blank, assumptionsOf(blank, TODAY), undefined)
    expect(b.gaps.length).toBeGreaterThan(0)
    expect(b.sharpen.status).toBe('none')
    for (const s of b.stats) expect(s.status === 'ready', `blank ${s.id}`).toBe(false)
    expect(sheet('retired').sharpen.status).toBe('none')
  })

  it('lists the contribution room still unused, each with an amount', () => {
    const m = sheet('average')
    expect(m.rooms.length).toBeGreaterThan(0)
    expect(m.rooms.every((r) => r.amount > 0)).toBe(true)
  })

  it('reports what is already true, and only that', () => {
    expect(sheet('rich').diversified).toBe(true)
    expect(sheet('modest').diversified).toBe(false)
    // the average couple's mortgage ends in 2041, before they stop: no debt when they retire
    expect(sheet('average').mortgageFree).toBe(true)
    expect(sheet('modest').mortgageFree).toBeNull() // no home at all: nothing was paid off, and nothing to say
  })

  it('does not change the profile it reads', () => {
    const p = profileOf('planner')
    const before = JSON.stringify(p)
    sheetModel(p, assumptionsOf(p, TODAY), 56)
    expect(JSON.stringify(p)).toBe(before)
  })
})
