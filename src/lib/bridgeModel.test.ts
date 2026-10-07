import { describe, expect, it } from 'vitest'
import { bridgeRun, bridgeView, leversFor, profileLevers, type BridgeLevers } from '../engine/bridge.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { barRows, bridgeQuery, defers, parseBridgeParams, SEGMENTS, shownPlan, strategiesOf, verdictOf, windowRows } from './bridgeModel.ts'

const H = GOLDEN_HOUSEHOLD
const q = (s: string) => new URLSearchParams(s)

describe('what the view keeps in the address bar', () => {
  it('an empty address is the profile’s own plan for the first person', () => {
    const p = parseBridgeParams(q(''), H)
    expect(p.levers).toEqual(profileLevers(H, 'self'))
    expect(p.window).toBe('bridge')
  })

  it('reads who is looked at and the window from the address; the AGES always come from the profile, whatever the address says', () => {
    const own = profileLevers(H, 'spouse')
    expect(parseBridgeParams(q('bp=spouse&bw=plan'), H)).toEqual({ levers: own, window: 'plan' })
    // the ages are not a thing an address can set any more: an old link with them still opens on the profile's own plan
    expect(parseBridgeParams(q('bp=spouse&br=57&bq=70&bo=68'), H).levers).toEqual(own)
    expect(parseBridgeParams(q('bp=nobody'), H).levers.id).toBe('self')
    expect(parseBridgeParams(q('bw=whatever'), H).window).toBe('bridge')
  })

  it('writes only what differs from the default, and reads back what it wrote', () => {
    const own = parseBridgeParams(q(''), H)
    expect(bridgeQuery(own, H)).toEqual({ bp: null, bb: null, bw: null })
    const custom = { levers: profileLevers(H, 'spouse'), window: 'plan' as const }
    const written = bridgeQuery(custom, H)
    expect(written.bp).toBe('spouse')
    const url = new URLSearchParams(Object.entries(written).filter(([, v]) => v !== null) as [string, string][])
    expect(parseBridgeParams(url, H)).toEqual(custom)
  })

  it('« for both » is written as bb=1, read back, and ignored for a household of one', () => {
    const both = { levers: { ...profileLevers(H, 'self'), both: true }, window: 'bridge' as const }
    const written = bridgeQuery(both, H)
    expect(written.bb).toBe('1')
    const url = new URLSearchParams(Object.entries(written).filter(([, v]) => v !== null) as [string, string][])
    expect(parseBridgeParams(url, H)).toEqual(both)
    const solo = structuredClone(H)
    solo.persons = [solo.persons[0]]
    expect(parseBridgeParams(q('bb=1'), solo).levers.both).toBeUndefined()
  })

  it('a household of one has no « spouse » to look at', () => {
    const solo = structuredClone(H)
    solo.persons = [solo.persons[0]]
    expect(parseBridgeParams(q('bp=spouse'), solo).levers.id).toBe('self')
  })
})

describe('which strategy a set of levers is', () => {
  it('names every strategy whose start ages equal the levers (the retirement age is the same in all)', () => {
    const base = profileLevers(H, 'self')
    expect(strategiesOf({ ...base, rrqStartAge: 70, oasStartAge: 70 }, H)).toEqual(['bridge'])
    expect(strategiesOf({ ...base, rrqStartAge: 72, oasStartAge: 70 }, H)).toEqual(['max'])
    expect(strategiesOf({ ...base, rrqStartAge: 60, oasStartAge: 65 }, H)).toEqual(['asap'])
    // the profile’s own 65 / 65 is « my plan » AND « standard »: the same plan, so both are pressed
    expect(strategiesOf({ ...base, rrqStartAge: 65, oasStartAge: 65 }, H)).toEqual(expect.arrayContaining(['mine', 'standard']))
    // « both at 70 » is the bridge's ages PLUS the other person following: pressing one never presses the other
    expect(strategiesOf({ ...base, rrqStartAge: 70, oasStartAge: 70, both: true }, H)).toEqual(['both'])
    // anything else is none of them
    expect(strategiesOf({ ...base, rrqStartAge: 63, oasStartAge: 67 }, H)).toEqual([])
  })

  it('a strategy defers when either pension starts after 65', () => {
    expect(defers(leversFor('standard', H, 'self', 60))).toBe(false)
    expect(defers(leversFor('asap', H, 'self', 60))).toBe(false)
    expect(defers(leversFor('max', H, 'self', 60))).toBe(true)
    expect(defers(leversFor('bridge', H, 'self', 60))).toBe(true)
  })
})

describe('the verdict says what the numbers say', () => {
  const run = (retirementAge: number, key: Parameters<typeof leversFor>[0]) => bridgeRun(H, GOLDEN_ASSUMPTIONS, leversFor(key, H, 'self', retirementAge))
  it('a plan that lasts says so, and says whether it defers', () => {
    const std = run(60, 'standard')
    const max = run(60, 'max')
    expect(verdictOf(std.levers, std.summary, std.summary, 95)).toEqual({ kind: 'holds', defers: false, horizonAge: 95 })
    expect(verdictOf(max.levers, max.summary, std.summary, 95)).toEqual({ kind: 'holds', defers: true, horizonAge: 95 })
  })

  it('a plan that runs out names the age, and whether starting at 65 would have avoided it', () => {
    // Retiring at 57 on this nest: starting at 65 runs out near 98 (deferring, as it happens, would last).
    const std = run(57, 'standard')
    expect(std.summary.ok).toBe(false)
    const v = verdictOf(std.levers, std.summary, std.summary, 95)
    expect(v).toMatchObject({ kind: 'fails', defers: false, age: std.summary.firstShortfallAge })
    const small = structuredClone(H)
    for (const p of small.persons) for (const k of ['rrsp', 'tfsa', 'nonReg'] as const) p.accounts[k].balance *= 0.7
    const a = bridgeRun(small, GOLDEN_ASSUMPTIONS, leversFor('standard', small, 'self', 55))
    const b = bridgeRun(small, GOLDEN_ASSUMPTIONS, leversFor('max', small, 'self', 55))
    expect(verdictOf(b.levers, b.summary, a.summary, 95)).toMatchObject({ kind: 'fails', defers: true, standardHolds: false, standardAge: a.summary.firstShortfallAge })
  })
})

describe('the rows a window shows', () => {
  const rows = bridgeRun(H, GOLDEN_ASSUMPTIONS, profileLevers(H, 'self')).rows
  it('the bridge years are the person’s 60th to 70th year; the plan is every year to the horizon', () => {
    const bridge = windowRows(rows, 'bridge')
    expect(bridge.map((r) => r.age)).toEqual([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70])
    expect(windowRows(rows, 'plan')).toEqual(rows)
    expect(rows.length).toBeGreaterThan(bridge.length)
  })

  it('the bar chart’s segments add up to what the household received that year, and the line is spending plus tax', () => {
    for (const [i, r] of windowRows(rows, 'bridge').entries()) {
      const bar = barRows(windowRows(rows, 'bridge'))[i]
      const total = SEGMENTS.reduce((s, id) => s + bar[id], 0)
      expect(total).toBeCloseTo(r.employment + r.guaranteed + r.drawn, 6)
      expect(bar.need).toBeCloseTo(r.spending + r.tax, 6)
      expect(bar.x).toBe(r.age)
    }
  })
})

describe('the sentence is about the answer on screen, not about the controls', () => {
  const A = GOLDEN_ASSUMPTIONS
  const done = { id: 'self' as const, retirementAge: 58, rrqStartAge: 65, oasStartAge: 65 }
  const view = bridgeViewOf(done)

  function bridgeViewOf(l: BridgeLevers) {
    return bridgeView(H, A, l)
  }

  it('while a deferral is being worked out, the old answer keeps its own levers (verdict, pressed strategy, markers)', () => {
    const controls = { ...done, rrqStartAge: 72, oasStartAge: 70 } // the person just tapped « reporter au maximum »
    const plan = shownPlan(view, controls, H, A.horizonAge)
    expect(plan.shown).toEqual(done)
    expect(plan.pressed).toContain('standard')
    expect(plan.pressed).not.toContain('max')
    expect(plan.verdict).not.toBeNull()
    expect(plan.verdict!.kind === 'holds' || plan.verdict!.kind === 'fails').toBe(true)
    // …and it is the verdict of the standard plan that was computed, whatever the controls now say
    expect(plan.verdict).toEqual(verdictOf(done, view.selected.summary, view.strategies.find((s) => s.key === 'standard')!.summary, plan.endAge))
  })

  it('with no answer yet, the controls are what is shown and there is no verdict', () => {
    const plan = shownPlan(null, done, H, 95)
    expect(plan.shown).toEqual(done)
    expect(plan.verdict).toBeNull()
    expect(plan.endAge).toBe(95)
  })

  it('« until age N » is the age of the person looked at in the plan\'s last year — the age the table and the matrix use', () => {
    const plan = shownPlan(view, done, H, A.horizonAge)
    const last = view.selected.rows[view.selected.rows.length - 1]
    expect(plan.endAge).toBe(last.age)
  })
})
