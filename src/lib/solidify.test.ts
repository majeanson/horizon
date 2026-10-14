import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import { earliestEach } from '../engine/retireAt.ts'
import { LIFE_COPY } from './lifeCopy.ts'
import { STARTER_IDS, plannedStarters, type StarterId } from './plannedExpenses.ts'
import { addFlow, confirmFlow, updateFlow } from './profileLife.ts'
import { setDeposited, setNetPay } from './profileEdit.ts'
import { SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'

// THE NEW PIECES TOGETHER, on the committed household: what the plan reads, what it deliberately does not, and that nothing here breaks a saved file.

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const labels = Object.fromEntries(STARTER_IDS.map((id) => [id, `name:${id}`])) as Record<StarterId, string>
const NOW = 2026
// The clock is an input to the engine: stored assumptions carry no `today`, so the test supplies the year.
const engine = (p: Profile) => ({ ...p.assumptions, today: { year: NOW } }) as Parameters<typeof project>[1]
const rows = (p: Profile) => project(p.household, engine(p))
const earliest = (p: Profile) => earliestEach(p.household, engine(p)).map((e) => e.earliestOk)

describe('the figures kept only to check against a statement', () => {
  it('a net pay and a deposit total never move the plan: same rows, same earliest ages', () => {
    const p = golden()
    const checked = structuredClone(p)
    checked.household.persons[0] = setDeposited(setNetPay(checked.household.persons[0], 61_234), 'tfsa', 12_345)
    expect(rows(checked)).toEqual(rows(p))
    expect(earliest(checked)).toEqual(earliest(p))
  })
})

describe('a planned expense is a real expense', () => {
  it('adding every EXPENSE starting point can only keep or delay the earliest age, never advance it (a windfall or a rent income can)', () => {
    const base = golden()
    let p = base
    for (const s of plannedStarters(base, NOW, labels)) if (s.flow.kind === 'expense') p = addFlow(p, s.flow)
    const before = earliest(base)
    const after = earliest(p)
    before.forEach((b, i) => {
      if (b === null) expect(after[i]).toBeNull()
      else if (after[i] !== null) expect(after[i]).toBeGreaterThanOrEqual(b)
    })
  })

  it('confirming an estimate changes the label of its status, not the plan; editing its amount drops the estimate', () => {
    const base = golden()
    const [first] = plannedStarters(base, NOW, labels)
    const p = addFlow(base, first.flow)
    const i = p.household.flows.length - 1
    expect(p.household.flows[i].estimate).toBe(first.id)
    const confirmed = confirmFlow(p, i)
    expect(confirmed.household.flows[i].estimate).toBeUndefined()
    expect(rows(confirmed)).toEqual(rows(p))
    const edited = updateFlow(p, i, (f) => ({ ...f, amount: f.amount + 100 }))
    expect(edited.household.flows[i].estimate).toBeUndefined()
  })

  it('survives a save: validation keeps the estimate marker of every starting point', () => {
    let p = golden()
    for (const s of plannedStarters(p, NOW, labels)) p = addFlow(p, s.flow)
    const out = validateProfile(JSON.parse(JSON.stringify(p)))
    expect(out.ok, JSON.stringify(out.ok ? '' : out.problems)).toBe(true)
    if (out.ok) expect(out.profile.household.flows.map((f) => f.estimate)).toEqual(p.household.flows.map((f) => f.estimate))
  })

  it('every starting point has a name in both languages', () => {
    for (const lang of ['fr', 'en'] as const) for (const id of STARTER_IDS) expect(LIFE_COPY[lang].flows.starters[id], `${lang}/${id}`).toBeTruthy()
  })
})
