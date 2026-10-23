import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from './golden/examples.ts'
import { project } from './projection.ts'
import { everyoneAt, retireAt, runScenario } from './retireAt.ts'
import type { Assumptions, Household } from './types.ts'

// THE ANSWER CAN BE TRUSTED. « You can retire at 58 » is a claim about a search over projections; these are the properties a reader silently relies on, held on
// all eleven example households: the answer is the EARLIEST age that works (every earlier age fails, and the age itself works); more money never makes it later,
// spending more never makes it earlier, a longer plan never makes it earlier; asking twice gives the same answer; and asking never changes what was asked
// about (the household and the assumptions are frozen below — a write anywhere in the engine throws).

const FROM = 50
const earliest = (h: Household, a: Assumptions): number => retireAt(h, a, { from: FROM, to: 70, stopAtFirstOk: true }).earliestOk ?? Infinity
const clone = <T>(x: T): T => structuredClone(x)
const ex = (id: ExampleId) => ({ h: clone(EXAMPLES[id].household), a: clone(EXAMPLES[id].assumptions) })

function deepFreeze<T>(x: T): T {
  if (x !== null && typeof x === 'object' && !Object.isFrozen(x)) {
    Object.freeze(x)
    for (const v of Object.values(x)) deepFreeze(v)
  }
  return x
}

describe('the answer is the earliest age that works', { timeout: 300_000 }, () => {
  it('the age found works, and every age tried before it fails — for every example, everyone retiring together', () => {
    for (const id of EXAMPLE_IDS) {
      const { h, a } = ex(id)
      const full = retireAt(h, a, { from: FROM, to: 70 })
      if (full.earliestOk === null) {
        expect(full.byAge.every((r) => !r.ok), `${id}: no age works`).toBe(true)
        continue
      }
      expect(full.byAge.find((r) => r.age === full.earliestOk)!.ok, `${id} at ${full.earliestOk}`).toBe(true)
      for (const r of full.byAge) if (r.age < full.earliestOk) expect(r.ok, `${id} fails at ${r.age}`).toBe(false)
      // the cheap search that stops at the first age that works must say the same thing
      expect(retireAt(h, a, { from: FROM, to: 70, stopAtFirstOk: true }).earliestOk, id).toBe(full.earliestOk)
    }
  })

  it('a verdict is « ok » exactly when no year of the plan has a shortfall, and the first short year is the first row with one', () => {
    for (const id of EXAMPLE_IDS) {
      const { h, a } = ex(id)
      for (const age of [55, 60, 65]) {
        const r = runScenario(h, a, everyoneAt(h, age), age)
        const short = r.rows.filter((row) => row.household.shortfall > 0)
        expect(r.ok, `${id} at ${age}`).toBe(short.length === 0)
        expect(r.firstShortfallYear, `${id} at ${age}`).toBe(short.length === 0 ? null : short[0].year)
      }
    }
  })
})

describe('the line between « works » and « does not » is exact', { timeout: 300_000 }, () => {
  it('walking the spending up through the point where a plan starts to fall short: « ok » is never said with a dollar unpaid, and the shortfall appears one step at a time', () => {
    for (const id of ['golden', 'average', 'modest'] as const) {
      const base = ex(id)
      const age = 62
      let sawBoth = false
      let lastOk: boolean | null = null
      for (let k = 0.7; k <= 2.0; k += 0.05) {
        const e = ex(id)
        e.h.spending = { workingToday: base.h.spending.workingToday, retiredToday: base.h.spending.retiredToday * k }
        const r = runScenario(e.h, e.a, everyoneAt(e.h, age), age)
        const worst = Math.max(0, ...r.rows.map((row) => row.household.shortfall))
        expect(r.ok, `${id} ×${k.toFixed(2)}: a plan with ${worst.toFixed(2)} unpaid is not ok`).toBe(worst === 0)
        // more spending never turns a failing plan into a working one
        if (lastOk === false) expect(r.ok, `${id} ×${k.toFixed(2)}`).toBe(false)
        if (lastOk !== null && lastOk !== r.ok) sawBoth = true
        lastOk = r.ok
      }
      expect(sawBoth, `${id}: the sweep crosses the line`).toBe(true)
    }
  })
})

describe('the exact edge of « works »', { timeout: 300_000 }, () => {
  it('bisecting the spending to the dollar: just under the edge the plan works with nothing unpaid; just over it, a few dollars unpaid is already « does not work »', () => {
    for (const id of ['golden', 'average', 'modest'] as const) {
      const base = ex(id)
      const age = 62
      const at = (k: number) => {
        const e = ex(id)
        e.h.spending = { workingToday: base.h.spending.workingToday, retiredToday: base.h.spending.retiredToday * k }
        const r = runScenario(e.h, e.a, everyoneAt(e.h, age), age)
        return { r, worst: Math.max(0, ...r.rows.map((row) => row.household.shortfall)) }
      }
      let lo = 0.5
      let hi = 3
      expect(at(lo).r.ok, `${id} ×${lo} works`).toBe(true)
      expect(at(hi).r.ok, `${id} ×${hi} does not`).toBe(false)
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (at(mid).r.ok) lo = mid
        else hi = mid
      }
      expect(at(lo).worst, id).toBe(0)
      const over = at(hi)
      expect(over.worst, `${id}: just over the edge something is unpaid`).toBeGreaterThan(0)
      expect(over.r.ok, `${id}: ${over.worst.toFixed(2)} unpaid is not ok`).toBe(false)
      // the edge is a continuous one: the first unpaid amount is small, so this check is exercised at the size a tolerance bug would hide
      expect(over.worst, `${id}: the first unpaid amount`).toBeLessThan(100)
    }
  })
})

describe('more money never makes the answer later; spending more never makes it earlier', { timeout: 300_000 }, () => {
  it('adding $100 000 to a person’s accounts never delays the earliest age', () => {
    for (const id of EXAMPLE_IDS) {
      const base = ex(id)
      const richer = ex(id)
      richer.h.persons[0].accounts.tfsa.balance += 100_000
      expect(earliest(richer.h, richer.a), id).toBeLessThanOrEqual(earliest(base.h, base.a))
    }
  })

  it('spending 10 % more (while working and once retired) never brings the earliest age forward', () => {
    for (const id of EXAMPLE_IDS) {
      const base = ex(id)
      const dearer = ex(id)
      dearer.h.spending = { workingToday: base.h.spending.workingToday * 1.1, retiredToday: base.h.spending.retiredToday * 1.1 }
      expect(earliest(dearer.h, dearer.a), id).toBeGreaterThanOrEqual(earliest(base.h, base.a))
    }
  })

  it('a plan that must last longer (a later horizon age) never brings the earliest age forward', () => {
    for (const id of EXAMPLE_IDS) {
      const base = ex(id)
      const longer = ex(id)
      longer.a.horizonAge = base.a.horizonAge + 5
      expect(earliest(longer.h, longer.a), id).toBeGreaterThanOrEqual(earliest(base.h, base.a))
    }
  })

  it('the net worth left at the horizon grows with what the household starts with, for the same retirement age', () => {
    for (const id of EXAMPLE_IDS) {
      const base = ex(id)
      const richer = ex(id)
      richer.h.persons[0].accounts.rrsp.balance += 100_000
      const age = Math.max(60, ...base.h.persons.map((p) => base.a.today.year - p.birth.year))
      const left = (e: ReturnType<typeof ex>) => runScenario(e.h, e.a, everyoneAt(e.h, age), age).netWorthAtHorizon
      expect(left(richer), `${id} at ${age}`).toBeGreaterThanOrEqual(left(base) - 0.01)
    }
  })
})

describe('asking is repeatable and harmless', { timeout: 300_000 }, () => {
  it('the same question twice gives the very same rows', () => {
    for (const id of EXAMPLE_IDS) {
      const { h, a } = ex(id)
      expect(JSON.stringify(project(h, a)), id).toBe(JSON.stringify(project(h, a)))
    }
  })

  it('the engine writes nothing into the household or the assumptions it is given (frozen inputs: a write would throw)', () => {
    for (const id of EXAMPLE_IDS) {
      const { h, a } = ex(id)
      const before = JSON.stringify({ h, a })
      deepFreeze(h)
      deepFreeze(a)
      expect(() => retireAt(h, a, { from: FROM, to: 62 }), id).not.toThrow()
      expect(() => project(h, a), id).not.toThrow()
      expect(JSON.stringify({ h, a }), id).toBe(before)
    }
  })

  it('a person’s id and the order of the household do not change the answer: the couple read the other way round gives the same earliest age', () => {
    for (const id of EXAMPLE_IDS) {
      const base = ex(id)
      if (base.h.persons.length < 2) continue
      const flipped = ex(id)
      // The sale of the home happens when the FIRST person reaches an age — keyed to the first person by design (lib/metamorphic.test.ts says the same) — so a sale is taken out of both runs:
      // it is the one place the order of the household may move the answer, and where it falls inside a one-year step depends on the money around it.
      for (const x of [base, flipped]) if (x.h.home) x.h.home = { ...x.h.home, sale: null }
      flipped.h.persons.reverse()
      expect(earliest(flipped.h, flipped.a), id).toBe(earliest(base.h, base.a))
    }
  })
})
