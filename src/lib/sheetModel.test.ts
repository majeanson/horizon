import { describe, expect, it } from 'vitest'
import { EXAMPLES, type ExampleId } from '../engine/golden/examples.ts'
import { retireAt } from '../engine/retireAt.ts'
import { exampleProfile } from './example.ts'
import { factId } from './facts.ts'
import { assumptionsOf } from './resultsModel.ts'
import { defaultProfile, type Profile } from './schema.ts'
import { LEVEL_MAX, SCALE, sheetModel, type SheetStat } from './sheetModel.ts'

const TODAY = { year: 2026, month: 10 }
const profileOf = (id: ExampleId): Profile => exampleProfile(id)
const earliestOf = (id: ExampleId): number | null => {
  const p = profileOf(id)
  return retireAt(p.household, assumptionsOf(p, TODAY), { stopAtFirstOk: true }).earliestOk
}
// `...asked` so that an explicit `undefined` (« still being worked out ») is not replaced by the default.
const sheet = (id: ExampleId, ...asked: [(number | null | undefined)?]) => {
  const p = profileOf(id)
  return sheetModel(p, assumptionsOf(p, TODAY), asked.length > 0 ? asked[0] : earliestOf(id))
}
const stat = (m: ReturnType<typeof sheet>, id: SheetStat['id']): SheetStat => m.stats.find((s) => s.id === id)!

describe('the sheet of a household', () => {
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

  it('reads the margin as the later planned age less the earliest age, and the level as that margin kept between 0 and ten', () => {
    const m = sheet('golden', 54)
    const planned = Math.max(...profileOf('golden').household.persons.map((p) => p.retirementAge))
    expect(stat(m, 'runway').value).toBe(54)
    expect(m.margin).toBe(planned - 54)
    expect(m.level).toBe(Math.max(0, Math.min(LEVEL_MAX, planned - 54)))
    expect(sheet('golden', 18).level).toBe(LEVEL_MAX) // a margin past ten still draws a full bar, not more
    expect(sheet('golden', planned + 6).level).toBe(0) // a plan that does not hold at its own age has no margin to show — and no negative one
    expect(sheet('golden', planned + 6).margin).toBe(-6)
  })

  it('says « pending » while the earliest age is being worked out, and « none » when no age works', () => {
    expect(stat(sheet('golden', undefined), 'runway').status).toBe('pending')
    expect(sheet('golden', undefined).level).toBeNull()
    const none = stat(sheet('golden', null), 'runway')
    expect(none.status).toBe('none')
    expect(none.fill).toBe(0)
  })

  it('has no runway for a household already retired, and no saving for one nobody of whom earns', () => {
    const m = sheet('retired')
    expect(stat(m, 'runway').status).toBe('none')
    expect(m.level).toBeNull()
    expect(stat(m, 'saving').status).toBe('none')
    expect(stat(m, 'cover').status).toBe('ready')
    expect(m.heroes.every((x) => x.heroClass === 'retired')).toBe(true)
  })

  it('names a class from what the person is: retired, pensioned or a saver', () => {
    expect(sheet('golden').heroes.map((x) => x.heroClass)).toEqual(['pensioned', 'saver'])
    expect(sheet('average').heroes.map((x) => x.heroClass)).toEqual(['saver', 'saver'])
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

  it('lists what is left to do: complete the profile, confirm figures, use room, then look at the plan — and the plan is always last', () => {
    const blank = sheetModel(defaultProfile({ year: 2026 }), assumptionsOf(defaultProfile({ year: 2026 }), TODAY), undefined)
    expect(blank.quests[0].id).toBe('complete')
    expect(blank.quests[blank.quests.length - 1].id).toBe('plan')
    expect(blank.gaps.length).toBeGreaterThan(0)
    for (const s of blank.stats) expect(s.status === 'ready', `blank ${s.id}`).toBe(false)
    const m = sheet('average')
    expect(m.quests.some((q) => q.id === 'confirm' && q.remaining! > 0)).toBe(true)
    expect(m.quests.filter((q) => q.id === 'room').every((q) => q.room!.amount > 0)).toBe(true)
    expect(m.quests[m.quests.length - 1].id).toBe('plan')
  })

  it('earns an achievement only for what is true', () => {
    const got = (m: ReturnType<typeof sheet>, id: string) => m.achievements.find((a) => a.id === id)!.earned
    expect(got(sheet('heir'), 'holds')).toBe(true)
    expect(got(sheet('golden'), 'holds')).toBe(false) // holds under Neutre and Audacieux, not under Prudent
    expect(got(sheet('behind'), 'holds')).toBe(false)
    expect(got(sheet('rich'), 'diversified')).toBe(true)
    expect(got(sheet('modest'), 'diversified')).toBe(false)
    expect(got(sheet('average'), 'confirmed')).toBe(false)
    // the average couple's mortgage ends in 2041, before they stop: no debt when they retire
    expect(got(sheet('average'), 'debtFree')).toBe(true)
    expect(got(sheet('modest'), 'debtFree')).toBe(false) // no home at all: nothing was paid off
    expect(got(sheet('golden', 50), 'margin')).toBe(true)
    expect(got(sheet('golden', 99), 'margin')).toBe(false)
  })

  it('does not change the profile it reads', () => {
    const p = profileOf('planner')
    const before = JSON.stringify(p)
    sheetModel(p, assumptionsOf(p, TODAY), 56)
    expect(JSON.stringify(p)).toBe(before)
  })
})
