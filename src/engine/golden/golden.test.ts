import { describe, expect, it } from 'vitest'
import { project } from '../projection.ts'
import { compare, everyoneAt, retireAt } from '../retireAt.ts'
import { sensitivity, sensitivityCells } from '../simulate.ts'
import type { Household } from '../types.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './household.fixture.ts'

// THE GOLDEN HOUSEHOLD — the whole engine, end to end, on one couple whose every input is in
// household.fixture.ts. The two JSON snapshots are the answer the app gives them TODAY; if any line of the
// engine changes what a household is told, a snapshot line changes and the diff is reviewed in the commit
// (`vitest -u` is a deliberate act, never a way to make a red test green).

describe('golden household — the committed answers', () => {
  it('the year-by-year projection, retiring as the profile says (60 and 62)', async () => {
    await expect(JSON.stringify(project(H, A, {}), null, 1)).toMatchFileSnapshot('./golden.projection.json')
  })

  it('« when can we retire »: every age from 18 (or the oldest person’s own age) to 70', async () => {
    const r = retireAt(H, A)
    const summary = { earliestOk: r.earliestOk, byAge: r.byAge.map(({ age, ok, firstShortfallYear, netWorthAtHorizon }) => ({ age, ok, firstShortfallYear, netWorthAtHorizon })) }
    await expect(JSON.stringify(summary, null, 1)).toMatchFileSnapshot('./golden.retireAt.json')
  })
})

describe('retireAt', () => {
  const result = retireAt(H, A)

  it('the earliest age is the first age that works, and every later age works too (the golden household)', () => {
    expect(result.earliestOk).not.toBeNull()
    const firstOk = result.byAge.find((r) => r.ok)!
    expect(result.earliestOk).toBe(firstOk.age)
    for (const r of result.byAge.filter((x) => x.age >= firstOk.age)) expect(r.ok, `${r.age}`).toBe(true)
    for (const r of result.byAge.filter((x) => x.age < firstOk.age)) {
      expect(r.ok).toBe(false)
      expect(r.firstShortfallYear).not.toBeNull()
    }
  })

  it('works later means richer at the end: net worth at the horizon rises with the retirement age among the ages that work', () => {
    const ok = result.byAge.filter((r) => r.ok)
    for (let i = 1; i < ok.length; i++) expect(ok[i].netWorthAtHorizon, `${ok[i].age}`).toBeGreaterThanOrEqual(ok[i - 1].netWorthAtHorizon)
  })

  it('never tries an age someone has already passed', () => {
    const r = retireAt(H, A, { from: 30, to: 52 })
    expect(r.byAge[0].age).toBe(A.today.year - 1978) // the older person is 48
  })

  it('stopAtFirstOk ends the search at the first age that works, with the same answer', () => {
    const quick = retireAt(H, A, { stopAtFirstOk: true })
    expect(quick.earliestOk).toBe(result.earliestOk)
    expect(quick.byAge[quick.byAge.length - 1].age).toBe(result.earliestOk)
  })

  it('a tried age is « everyone retires at that age » unless the caller says otherwise', () => {
    expect(everyoneAt(H, 58)).toEqual({ retirementAge: { self: 58, spouse: 58 } })
  })

  it('compare() runs the named scenarios in full: 60 vs 65, with their rows', () => {
    const [at60, at65] = compare(H, A, [
      { label: '60', scenario: everyoneAt(H, 60), age: 60 },
      { label: '65', scenario: everyoneAt(H, 65), age: 65 },
    ])
    expect(at60.result.rows.length).toBe(at65.result.rows.length)
    expect(at65.result.netWorthAtHorizon).toBeGreaterThan(at60.result.netWorthAtHorizon)
    expect(at60.result.rows.find((r) => r.year === 2045)!.persons.self!.employment).toBe(0)
    expect(at65.result.rows.find((r) => r.year === 2040)!.persons.self!.employment).toBeGreaterThan(0)
  })

  it('can the household retire earlier with much more saved? Triple the accounts and the earliest age falls', () => {
    const richer: Household = {
      ...H,
      persons: H.persons.map((p) => ({
        ...p,
        accounts: {
          rrsp: { ...p.accounts.rrsp, balance: p.accounts.rrsp.balance * 3 },
          tfsa: { ...p.accounts.tfsa, balance: p.accounts.tfsa.balance * 3 },
          nonReg: { ...p.accounts.nonReg, balance: p.accounts.nonReg.balance * 3, acb: p.accounts.nonReg.acb * 3 },
        },
      })),
    }
    expect(retireAt(richer, A, { stopAtFirstOk: true }).earliestOk!).toBeLessThan(result.earliestOk!)
  })

  it('spending more pushes the earliest age later', () => {
    const lavish: Household = { ...H, spending: { workingToday: H.spending.workingToday, retiredToday: H.spending.retiredToday * 1.4 } }
    const r = retireAt(lavish, A, { stopAtFirstOk: true }).earliestOk
    expect(r === null || r > result.earliestOk!).toBe(true)
  })
})

describe('sensitivity', () => {
  const cells = sensitivity(H, A, { returnsDeltas: [-0.01, 0, 0.01], inflationDeltas: [0], horizonAges: [95, 100] })
  const at = (returnsDelta: number, horizonAge: number) => cells.find((c) => c.returnsDelta === returnsDelta && c.horizonAge === horizonAge)!.earliestOk

  it('the centre cell is the plain verdict', () => {
    expect(at(0, 95)).toBe(retireAt(H, A, { stopAtFirstOk: true }).earliestOk)
  })

  it('a point less return, or five more years of life, never makes the answer earlier; a point more never makes it later', () => {
    const base = at(0, 95)!
    expect(at(-0.01, 95)!).toBeGreaterThanOrEqual(base)
    expect(at(0.01, 95)!).toBeLessThanOrEqual(base)
    expect(at(0, 100)!).toBeGreaterThanOrEqual(base)
  })

  it('the streamed cells are the grid, in the same order', () => {
    expect([...sensitivityCells(H, A, { returnsDeltas: [-0.01, 0, 0.01], inflationDeltas: [0], horizonAges: [95, 100] })]).toEqual(cells)
  })

  it('one row per combination, deterministically', () => {
    expect(cells).toHaveLength(6)
    expect(sensitivity(H, A, { returnsDeltas: [-0.01, 0, 0.01], inflationDeltas: [0], horizonAges: [95, 100] })).toEqual(cells)
  })
}, 60_000)
