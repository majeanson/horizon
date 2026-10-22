import type Anthropic from '@anthropic-ai/sdk'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from '../../src/engine/golden/examples.ts'
import { project } from '../../src/engine/projection.ts'
import { retireAt } from '../../src/engine/retireAt.ts'
import type { Assumptions, Flow, Household, YearRow } from '../../src/engine/types.ts'
import { bookProblems } from '../../src/lib/identities.ts'
import { AUDIT_EFFORT, AUDIT_MODEL, AUDIT_SYSTEM_FULL, CAP, RESERVE, client, digest, extractJson, pay, spent } from './run.ts'

// `node scripts/fuzz/stress.ts [--cap 12] [--n 40] [--no-audit]` — STRESS SCENARIOS (idea 9). Claude writes realistic crises as small, constrained changes to
// the example households; the engine runs them; each result is compared with its base and with the direction Claude itself expected; the audit reads each year table.
// Claude never computes anything and never writes engine JSON: it fills the fields below, and `apply` does the rest deterministically.

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flagValue = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const N = Number(flagValue('n', '40'))
const AUDIT = !args.includes('--no-audit')
// `--scenarios <scenarios.json>` reuses scenarios already written (no generation cost); `--only a,b` or `--affected` (the ones the three harness fixes below change) pick among them
const SCEN_FILE = flagValue('scenarios', '')
const ONLY = flagValue('only', '').split(',').filter(Boolean)
const AFFECTED = args.includes('--affected')

interface Scenario {
  id: string
  title: string
  story: string
  base: ExampleId
  retirementAgeSelf: number
  retirementAgeSpouse: number
  deathAgeSelf: number
  deathAgeSpouse: number
  marketPath: 'unchanged' | 'smooth' | 'badStart' | 'lostDecade' | 'boomBust'
  spendingFactorWorking: number
  spendingFactorRetired: number
  inflationDelta: number
  returnsDelta: number
  rrqStartSelf: number
  oasStartSelf: number
  flows: { label: string; kind: 'windfall' | 'expense' | 'income'; amount: number; fromYear: number; toYear: number; owner: 'self' | 'spouse'; taxable: boolean }[]
  expectedEffect: 'later' | 'earlier' | 'same' | 'fails' | 'unclear'
  whyExpected: string
}

const num = { type: 'number' } as const
const int = { type: 'integer' } as const
const str = { type: 'string' } as const
const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
const SCENARIO_SCHEMA = obj({
  scenarios: {
    type: 'array',
    items: obj({
      id: str, title: str, story: str,
      base: { type: 'string', enum: [...EXAMPLE_IDS] },
      retirementAgeSelf: int, retirementAgeSpouse: int, deathAgeSelf: int, deathAgeSpouse: int,
      marketPath: { type: 'string', enum: ['unchanged', 'smooth', 'badStart', 'lostDecade', 'boomBust'] },
      spendingFactorWorking: num, spendingFactorRetired: num, inflationDelta: num, returnsDelta: num, rrqStartSelf: int, oasStartSelf: int,
      flows: {
        type: 'array',
        items: obj({
          label: str, kind: { type: 'string', enum: ['windfall', 'expense', 'income'] }, amount: num, fromYear: int, toYear: int,
          owner: { type: 'string', enum: ['self', 'spouse'] }, taxable: { type: 'boolean' },
        }),
      },
      expectedEffect: { type: 'string', enum: ['later', 'earlier', 'same', 'fails', 'unclear'] },
      whyExpected: str,
    }),
  },
})

const ageNow = (birthYear: number) => 2026 - birthYear

function summaryOf(id: ExampleId): string {
  const { household: h, assumptions: a } = EXAMPLES[id]
  const who = h.persons
    .map((p) => `${p.id} age ${ageNow(p.birth.year)}, retires at ${p.retirementAge}, salary ${p.salaryToday}, savings ${Math.round(p.accounts.rrsp.balance + p.accounts.tfsa.balance + p.accounts.nonReg.balance)}${p.pensions.length ? ', has a defined-benefit pension' : ''}`)
    .join('; ')
  const base = retireAt(structuredClone(h), structuredClone(a), { from: 18, to: 70, stopAtFirstOk: true }).earliestOk
  return `${id}: ${who}; spending ${h.spending.workingToday} working / ${h.spending.retiredToday} retired; ${h.home ? 'owns a home' : 'no home'}; ${h.children?.length ?? 0} children; earliest age that works now: ${base ?? 'none up to 70'}.`
}

const GEN_SYSTEM = `You design stress scenarios for a Québec retirement planner. Each scenario is a realistic crisis or turn of life applied to one of a list of example households. You fill a small set of fields; the engine does the arithmetic. You never compute results.

Fields (0 means "no change" for the integer fields; 1 means "no change" for the factors):
- retirementAgeSelf / retirementAgeSpouse: set the age that person stops working (a job loss at 55 = 55; a person cannot retire before the age they already have). Spouse fields are ignored for a household of one.
- deathAgeSelf / deathAgeSpouse: the age that person dies (the survivor's rules then apply); at least their current age + 1, at most 100.
- marketPath: the path of returns from the first retirement year: smooth (average), badStart (a crash right at retirement), lostDecade (a flat decade), boomBust.
- spendingFactorWorking / spendingFactorRetired: multiply the yearly budget (0.8 to 1.5).
- inflationDelta: added to yearly inflation (-0.01 to +0.04); wages follow prices, so wage growth moves by the same amount (real pay stays level). returnsDelta: added to every account's yearly return (-0.03 to +0.02): use it for the market side of an inflation story.
- An example that owns a home with a sale age already sells it: do NOT add a windfall for home equity to such an example.
- retirementAge changes (a job loss) are judged on the household's own plan (does it run short, and when), not on the headline "earliest age", which tries every age whatever you set.
- rrqStartSelf (60 to 72) and oasStartSelf (65 to 70): change when the first person starts the QPP / OAS.
- flows: dated one-offs or runs, in 2026 dollars, years 2026 to 2080: windfall (an inheritance), expense (care, a roof, a disabled child's costs, a divorce settlement), income (rent, a consulting contract). 0 to 3 per scenario; owner is 'self' or 'spouse'.
- expectedEffect: BEFORE any result is known, how you expect the earliest retirement age that works to move compared with the unchanged example: later, earlier, same, fails (no age up to 70 works), or unclear. whyExpected: one sentence.

Make the set varied: job loss, crashes, early death of each spouse, long care costs, inheritances, an inflation spike, retiring later, claiming the QPP early or late, windfalls, an expensive child, a parent's care. Use each example at least twice where it makes sense and spread scenarios across all of them. Each scenario changes one to three things, not ten. Ids are short slugs.`

function apply(s: Scenario): { household: Household; assumptions: Assumptions; notes: string[] } {
  const base = EXAMPLES[s.base]
  const household = structuredClone(base.household)
  const assumptions = structuredClone(base.assumptions)
  const notes: string[] = []
  const set = (i: number, age: number, field: 'retirementAge' | 'horizonAge') => {
    const p = household.persons[i]
    if (!p || age <= 0) return
    const now = ageNow(p.birth.year)
    const v = field === 'retirementAge' ? Math.max(age, now) : Math.min(100, Math.max(age, now + 1))
    if (v !== age) notes.push(`${field} of ${p.id} clamped from ${age} to ${v}`)
    p[field] = v
  }
  set(0, s.retirementAgeSelf, 'retirementAge')
  set(1, s.retirementAgeSpouse, 'retirementAge')
  set(0, s.deathAgeSelf, 'horizonAge')
  set(1, s.deathAgeSpouse, 'horizonAge')
  if (s.marketPath !== 'unchanged') assumptions.marketPath = { preset: s.marketPath, custom: [] }
  const clampF = (f: number) => Math.min(1.5, Math.max(0.8, f || 1))
  household.spending = { workingToday: Math.round(household.spending.workingToday * clampF(s.spendingFactorWorking)), retiredToday: Math.round(household.spending.retiredToday * clampF(s.spendingFactorRetired)) }
  const di = Math.min(0.04, Math.max(-0.01, s.inflationDelta))
  assumptions.inflation = Math.max(0, assumptions.inflation + di)
  if (di !== 0) {
    assumptions.wageGrowth = Math.max(0, assumptions.wageGrowth + di)
    notes.push(`wage growth moved with inflation by ${di}`)
  }
  const dr = Math.min(0.02, Math.max(-0.03, s.returnsDelta))
  assumptions.returns = { rrsp: assumptions.returns.rrsp + dr, tfsa: assumptions.returns.tfsa + dr, nonReg: assumptions.returns.nonReg + dr }
  if (s.rrqStartSelf >= 60 && s.rrqStartSelf <= 72) household.persons[0].rrq.startAge = s.rrqStartSelf
  if (s.oasStartSelf >= 65 && s.oasStartSelf <= 70) household.persons[0].oas.startAge = s.oasStartSelf
  const flows: Flow[] = [...(household.flows ?? [])]
  for (const f of s.flows.slice(0, 3)) {
    if (household.home?.sale && /home|house|maison|sale|equity|downsiz/i.test(f.label)) {
      notes.push(`dropped the flow "${f.label}": the example already sells its home at ${household.home.sale.age}`)
      continue
    }
    flows.push({ ...f, owner: household.persons.length === 1 ? 'self' : f.owner, fromYear: Math.max(2026, f.fromYear), toYear: Math.min(2080, Math.max(f.fromYear, f.toYear, 2026)), amount: Math.max(0, f.amount) })
  }
  household.flows = flows
  return { household, assumptions, notes }
}

const first = (rows: YearRow[]) => rows.find((r) => r.household.shortfall > 0)?.year ?? null
const earliest = (h: Household, a: Assumptions) => retireAt(structuredClone(h), structuredClone(a), { from: 18, to: 70, stopAtFirstOk: true }).earliestOk

const AUDIT_ADDENDUM = (s: Scenario, baseEarliest: number | null, scenEarliest: number | null, baseNet: number, scenNet: number, notes: string[], own: { baseShort: number | null; scenShort: number | null } | null) => `STRESS SCENARIO "${s.title}" (${s.id}), applied to the example household "${s.base}".
Story: ${s.story}
What was changed: ${JSON.stringify({ ...s, story: undefined, title: undefined, id: undefined, whyExpected: undefined, expectedEffect: undefined })}
${notes.length ? `Clamped by the harness: ${notes.join('; ')}\n` : ''}Before the scenario: earliest age that works ${baseEarliest ?? 'none up to 70'}, net worth at the horizon ${Math.round(baseNet)} (nominal dollars of that year). After: earliest age ${scenEarliest ?? 'none up to 70'}, net worth at the horizon ${Math.round(scenNet)}.
${own ? `This scenario changes retirement ages, which the headline answer ignores (its search retires everyone together at every age it tries), so do not judge it on the earliest age: judge the household's OWN plan. First year with a shortfall: before ${own.baseShort ?? 'none'}, after ${own.scenShort ?? 'none'}.\n` : ''}Expected direction when the scenario was written: ${s.expectedEffect} (${s.whyExpected}).

Besides your normal review, answer two more things:
- directionPlausible: is the change in the answer (and in the table) in a direction and of a size that makes sense for this scenario? If not, say what looks wrong in findings.
- explanationFr: three or four sentences in Québécois French for a layperson, saying what this scenario does to the plan and why, using ONLY numbers that appear in the table or in the before/after line above.`

const STRESS_AUDIT_SCHEMA = obj({
  verdict: str,
  directionPlausible: { type: 'boolean' },
  explanationFr: str,
  findings: {
    type: 'array',
    items: obj({ severity: { type: 'string', enum: ['bug', 'suspect', 'note'] }, year: int, topic: str, observed: str, expected: str, reasoning: str, confidence: num }),
  },
})

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dir = join(here, 'out', `stress-${stamp}`)
  mkdirSync(dir, { recursive: true })
  console.log(`stress run: ${N} scenarios from ${AUDIT_MODEL}${AUDIT ? '' : ' (no audit)'}, cap $${CAP}. Output: ${dir}`)

  let scenarios: Scenario[]
  if (SCEN_FILE) scenarios = JSON.parse(readFileSync(SCEN_FILE, 'utf8')) as Scenario[]
  else {
    const res = await client.messages.create({
      model: AUDIT_MODEL,
      max_tokens: 16000,
      system: GEN_SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCENARIO_SCHEMA } } as Anthropic.MessageCreateParams['output_config'],
      messages: [{ role: 'user', content: `Write ${N} stress scenarios over these example households:\n${EXAMPLE_IDS.map(summaryOf).join('\n')}` }],
    })
    pay('stress scenarios', AUDIT_MODEL, res.usage)
    scenarios = (extractJson(res) as { scenarios: Scenario[] }).scenarios
  }
  // the scenarios the three harness fixes (own-plan reading of retirement ages, wages following inflation, no second home sale) and the survivor fix can change
  const affected = (s: Scenario) =>
    s.retirementAgeSelf > 0 || s.retirementAgeSpouse > 0 || s.inflationDelta !== 0 || s.deathAgeSelf > 0 || s.deathAgeSpouse > 0 || EXAMPLES[s.base].household.home?.sale != null
  if (ONLY.length) scenarios = scenarios.filter((s) => ONLY.includes(s.id))
  else if (AFFECTED) scenarios = scenarios.filter(affected)
  writeFileSync(join(dir, 'scenarios.json'), JSON.stringify(scenarios, null, 2))
  console.log(`${scenarios.length} scenarios written, $${spent.toFixed(3)} so far`)

  const results: Record<string, unknown>[] = []
  const queue: { slot: Record<string, unknown>; text: string; s: Scenario }[] = []
  for (const s of scenarios) {
    const slot: Record<string, unknown> = { id: s.id, title: s.title, base: s.base, expectedEffect: s.expectedEffect, audit: null }
    results.push(slot)
    try {
      const { household, assumptions, notes } = apply(s)
      const rows = project(structuredClone(household), structuredClone(assumptions))
      const baseRows = project(structuredClone(EXAMPLES[s.base].household), structuredClone(EXAMPLES[s.base].assumptions))
      const e0 = earliest(EXAMPLES[s.base].household, EXAMPLES[s.base].assumptions)
      const e1 = earliest(household, assumptions)
      // A scenario that sets retirement ages cannot move the headline answer (the search retires everyone together at every age it tries), so it is judged on the household's OWN plan.
      const ownPlan = s.retirementAgeSelf > 0 || s.retirementAgeSpouse > 0
      const baseShort = first(baseRows)
      const scenShort = first(rows)
      const move = (e1 ?? 71) - (e0 ?? 71)
      const actual = ownPlan
        ? scenShort !== null && (baseShort === null || scenShort < baseShort) ? 'fails' : 'same'
        : e0 === null && e1 === null ? 'same' : e1 === null ? 'fails' : move > 0 ? 'later' : move < 0 ? 'earlier' : 'same'
      const contradicts = ownPlan
        ? ((s.expectedEffect === 'same' || s.expectedEffect === 'earlier') && actual === 'fails') || ((s.expectedEffect === 'later' || s.expectedEffect === 'fails') && actual === 'same')
        : (s.expectedEffect === 'later' && actual === 'earlier') || (s.expectedEffect === 'earlier' && actual === 'later') || (s.expectedEffect === 'same' && actual !== 'same' && actual !== 'fails' && Math.abs(move) > 2)
      Object.assign(slot, {
        baseEarliest: e0, earliest: e1, actual, contradictsExpectation: contradicts, notes,
        problems: bookProblems(rows, assumptions).slice(0, 6), firstShortfallYear: first(rows), baseFirstShortfallYear: first(baseRows),
        netWorthEnd: Math.round(rows[rows.length - 1].household.netWorthEnd),
      })
      if (AUDIT) queue.push({ slot, s, text: `${AUDIT_ADDENDUM(s, e0, e1, baseRows[baseRows.length - 1].household.netWorthEnd, rows[rows.length - 1].household.netWorthEnd, notes, ownPlan ? { baseShort, scenShort } : null)}\n\n${digest(household, assumptions, rows, e1)}` })
    } catch (err) {
      slot.error = (err as Error).message
    }
  }
  const save = () => writeFileSync(join(dir, 'report.json'), JSON.stringify({ stamp, spentUsd: Number(spent.toFixed(3)), results }, null, 2))
  save()
  console.log(`engine runs done: ${results.filter((r) => r.error).length} errors, ${results.filter((r) => r.contradictsExpectation).length} contradict their expectation, ${results.filter((r) => (r.problems as string[] | undefined)?.length).length} break the books`)

  let next = 0
  let inFlight = 0
  const worker = async () => {
    while (next < queue.length) {
      if (spent + (inFlight + 1) * RESERVE > CAP) {
        if (inFlight === 0) {
          console.log(`stopping: $${spent.toFixed(3)} spent, the next audit could cross the $${CAP} cap`)
          next = queue.length
        } else await new Promise((r) => setTimeout(r, 3000))
        continue
      }
      const q = queue[next++]
      inFlight++
      try {
        const r = await client.messages.create({
          model: AUDIT_MODEL,
          max_tokens: 16000,
          system: [{ type: 'text', text: AUDIT_SYSTEM_FULL, cache_control: { type: 'ephemeral' } }],
          output_config: { effort: AUDIT_EFFORT, format: { type: 'json_schema', schema: STRESS_AUDIT_SCHEMA } } as Anthropic.MessageCreateParams['output_config'],
          messages: [{ role: 'user', content: q.text }],
        })
        pay(`stress audit ${q.s.id}`, AUDIT_MODEL, r.usage)
        q.slot.audit = extractJson(r)
        console.log(`${q.s.id} audited, $${spent.toFixed(3)} so far`)
      } catch (err) {
        q.slot.auditError = (err as Error).message
        console.log(`${q.s.id} audit failed: ${(err as Error).message}`)
      } finally {
        inFlight--
      }
      save()
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker))
  save()
  console.log(`done: $${spent.toFixed(3)} spent`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  console.error(`spent so far: $${spent.toFixed(3)}`)
  process.exit(1)
})
