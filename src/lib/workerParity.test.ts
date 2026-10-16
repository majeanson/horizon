import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { PRESET_KEYS, withPreset } from '../engine/assumptionPresets.ts'
import { fillComparison } from '../engine/bracketFillCompare.ts'
import { factSwings } from '../engine/factImpact.ts'
import { bridgeMatrix, bridgeView, profileLevers } from '../engine/bridge.ts'
import { deathSweep } from '../engine/deathSweep.ts'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { leverRanking } from '../engine/levers.ts'
import { earliestEach, retireAt } from '../engine/retireAt.ts'
import { savingsNeeded } from '../engine/savingsNeeded.ts'
import { sensitivityCells } from '../engine/simulate.ts'
import { spouseBalance } from '../engine/spouseBalance.ts'
import { withdrawalOrders } from '../engine/withdrawalOrders.ts'
import { computeAnswer } from './answer.ts'
import { careAnswer } from './careModel.ts'
import { marketRange } from './marketRange.ts'
import { comparePlans } from './plansCompare.ts'
import { readProfileJson } from './migrations.ts'
import { runSelections } from './resultsModel.ts'
import { spendAnswer } from './spendModel.ts'
import { SCHEMA_VERSION } from './schema.ts'

// THE WORKER IS THE FUNCTION, WITH A LETTER ADDED. Seventeen workers carry the heavy questions off the page's thread, and each is five lines: take the message, call the pure function, post the result. The
// five lines can be wrong in ways no test of the function sees — an argument dropped or swapped, a field read from the wrong place, a result that cannot be cloned across the thread (a function, a class,
// a Map) and so arrives as an error or as nothing. For every worker: load its real file, hand it a real request exactly as the page does, and compare what it POSTS with the direct call — and that
// what it posts survives `structuredClone`, which is what the thread boundary does to it.

const { household: H, assumptions: A } = EXAMPLES.golden // a couple
const { household: S, assumptions: SA } = EXAMPLES.modest // one person: the heavy searches are quicker on it
const TODAY = { year: A.today.year, month: A.today.month }
const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const profile = (() => {
  const r = readProfileJson(readFileSync(join(dir, `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
  if (!r.ok) throw new Error('fixture unreadable')
  return r.profile
})()
const levers = profileLevers(H, H.persons[0].id)
const age = H.persons[0].retirementAge

const FACTS = [{ id: 'self:salary', owner: 'self' as const, kind: 'salary' as const }, { id: 'self:earnings', owner: 'self' as const, kind: 'earnings' as const }]

type Case = { name: string; module: string; request: unknown; expected: () => unknown[] }
const CASES: Case[] = [
  { name: 'answer', module: './answer.worker.ts', request: { household: S, assumptions: SA, firstAge: 55, youngest: 60, everyoneRetired: false }, expected: () => [computeAnswer({ household: S, assumptions: SA, firstAge: 55, youngest: 60, everyoneRetired: false })] },
  { name: 'bracketFill', module: './bracketFill.worker.ts', request: { household: S, assumptions: SA, firstAge: 55 }, expected: () => [{ answer: fillComparison(S, SA, 55) }] },
  { name: 'bridge (view)', module: './bridge.worker.ts', request: { household: H, assumptions: A, levers, what: 'view' }, expected: () => [{ what: 'view', view: bridgeView(H, A, levers) }] },
  { name: 'bridge (matrix)', module: './bridge.worker.ts', request: { household: S, assumptions: SA, levers: profileLevers(S, S.persons[0].id), what: 'matrix' }, expected: () => [{ what: 'matrix', matrix: bridgeMatrix(S, SA, profileLevers(S, S.persons[0].id)) }] },
  { name: 'deathSweep', module: './deathSweep.worker.ts', request: { household: H, assumptions: A, levers }, expected: () => [deathSweep(H, A, levers)] },
  { name: 'spouseBalance', module: './spouseBalance.worker.ts', request: { household: H, assumptions: A, age, firstAge: 55 }, expected: () => [{ answer: { balance: spouseBalance(H, A, age, 55) } }] },
  { name: 'careEarliest', module: './careEarliest.worker.ts', request: { household: S, assumptions: SA, care: { amount: 20_000, fromAge: 80, years: 5 }, age: 65 }, expected: () => [careAnswer(S, SA, { amount: 20_000, fromAge: 80, years: 5 }, 65)] },
  { name: 'earliestEach', module: './earliestEach.worker.ts', request: { household: H, assumptions: A }, expected: () => [{ each: earliestEach(H, A) }] },
  { name: 'leversEarliest', module: './leversEarliest.worker.ts', request: { household: S, assumptions: SA }, expected: () => [leverRanking(S, SA)] },
  { name: 'marketEarliest', module: './marketEarliest.worker.ts', request: { household: S, assumptions: SA }, expected: () => [marketRange(S, SA)] },
  { name: 'plansCompare', module: './plansCompare.worker.ts', request: { plans: [{ name: 'A', household: S, assumptions: SA }, { name: 'B', household: H, assumptions: A }] }, expected: () => [comparePlans([{ name: 'A', household: S, assumptions: SA }, { name: 'B', household: H, assumptions: A }])] },
  {
    name: 'presetEarliest',
    module: './presetEarliest.worker.ts',
    request: { household: S, assumptions: SA },
    expected: () => {
      const [prudent, neutral, bold] = PRESET_KEYS.map((p) => retireAt(S, withPreset(SA, p), { stopAtFirstOk: true }).earliestOk)
      return [{ prudent, neutral, bold }]
    },
  },
  { name: 'factImpact', module: './factImpact.worker.ts', request: { household: S, assumptions: SA, facts: FACTS }, expected: () => [factSwings(S, SA, FACTS)] },
  { name: 'runs', module: './runs.worker.ts', request: { profile, today: TODAY, selections: ['plan', 60] }, expected: () => [runSelections(profile, TODAY, ['plan', 60])] },
  { name: 'savingsNeeded', module: './savingsNeeded.worker.ts', request: { household: S, assumptions: SA, age: 62 }, expected: () => [{ answer: savingsNeeded(S, SA, 62) }] },
  { name: 'spendEarliest', module: './spendEarliest.worker.ts', request: { household: S, assumptions: SA, retiredToday: 30_000 }, expected: () => [spendAnswer(S, SA, 30_000)] },
  { name: 'withdrawalOrders', module: './withdrawalOrders.worker.ts', request: { household: H, assumptions: A, age, firstAge: 55 }, expected: () => [{ answer: withdrawalOrders(H, A, age, 55) }] },
  { name: 'sensitivity (a message per cell, then done)', module: './sensitivity.worker.ts', request: { household: S, assumptions: SA }, expected: () => [...[...sensitivityCells(S, SA)].map((cell) => ({ cell })), { done: true }] },
]

const stub = { onmessage: null as null | ((e: { data: unknown }) => void), postMessage: vi.fn() }
vi.stubGlobal('self', stub)
afterAll(() => vi.unstubAllGlobals())

/** What a worker posts for a request, from its own file. */
async function posted(module: string, request: unknown): Promise<unknown[]> {
  stub.postMessage.mockClear()
  stub.onmessage = null
  vi.resetModules()
  await import(/* @vite-ignore */ module)
  expect(typeof stub.onmessage, `${module} sets no onmessage`).toBe('function')
  stub.onmessage!({ data: request })
  return stub.postMessage.mock.calls.map((c) => c[0])
}
const plain = (x: unknown): unknown => JSON.parse(JSON.stringify(x === undefined ? null : x))

describe('every worker posts what the direct call returns, and it crosses the thread', { timeout: 600_000 }, () => {
  it('there are as many cases as there are worker files (a new worker is held the day it is added)', () => {
    const files = Object.keys(import.meta.glob('./*.worker.ts'))
    const covered = new Set(CASES.map((c) => c.module))
    expect(files.filter((f) => !covered.has(f)), 'a worker with no parity case').toEqual([])
    expect(files.length).toBeGreaterThanOrEqual(17)
  })

  for (const c of CASES) {
    it(c.name, async () => {
      const out = await posted(c.module, c.request)
      const want = c.expected()
      expect(out.length, `${c.name}: messages posted`).toBe(want.length)
      out.forEach((message, i) => {
        // the thread boundary: a structured clone must succeed and change nothing a reader can see
        expect(() => structuredClone(message), `${c.name} message ${i} cannot be cloned`).not.toThrow()
        expect(plain(structuredClone(message)), `${c.name} message ${i}`).toEqual(plain(want[i]))
      })
    })
  }
})
