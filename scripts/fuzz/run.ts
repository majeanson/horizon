import Anthropic from '@anthropic-ai/sdk'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Assumptions, Household, YearRow } from '../../src/engine/types.ts'
import { check } from './check.ts'
import { BATCH_SCHEMA, expand, type LifeSpec } from './spec.ts'

// `node scripts/fuzz/run.ts dry [--n 20] [--audit] [--cap 2]`
//
// generate → expand → run the engine and its checks → (optionally) have a second model read the year-by-year table like a tax
// accountant would. Everything lands in scripts/fuzz/out/<stamp>/ (gitignored). The key comes from .env (ANTHROPIC_API_KEY); it is
// never printed. Spend is counted from each response's `usage` and the run stops at --cap dollars.

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

// .env, read by hand: the harness has no dotenv and the key must never be echoed
const envFile = join(root, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const N = Number(flag('n', '20'))
export const CAP = Number(flag('cap', '2'))
const AUDIT = args.includes('--audit')
const BATCH = args.includes('--batch')
export const AUDIT_EFFORT = flag('effort', 'medium') as 'low' | 'medium' | 'high'
const GEN_MODEL = flag('gen-model', 'claude-haiku-5-5')
export const AUDIT_MODEL = flag('audit-model', 'claude-opus-5-5')

// $ per million tokens (input, output), from the claude-api skill's cached table of 2026-10-06
const PRICE: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
}
export let spent = 0
const ledger: { what: string; model: string; input: number; output: number; usd: number }[] = []
interface Usage { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }
export function pay(what: string, model: string, usage: Usage, discount = 1) {
  const [pi, po] = PRICE[model] ?? [10, 50]
  // a cache write costs 1.25x the input price, a cache read 0.1x; the Batch API takes half off everything
  const input = usage.input_tokens + 1.25 * (usage.cache_creation_input_tokens ?? 0) + 0.1 * (usage.cache_read_input_tokens ?? 0)
  const usd = ((input * pi + usage.output_tokens * po) / 1e6) * discount
  spent += usd
  ledger.push({ what, model, input: Math.round(input), output: usage.output_tokens, usd })
}

// The cap is checked BEFORE a call starts, against what is already spent plus a reserve for every call in flight (an audit has cost up to
// about $0.35): checking after the fact let five parallel audits overshoot a $2 cap to $2.85.
export const RESERVE = 0.35
let inFlight = 0
const canAfford = () => spent + (inFlight + 1) * RESERVE <= CAP

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set (put it in horizon/.env)')
  process.exit(1)
}
export const client = new Anthropic()

const ARCHETYPES = [
  'a single parent in their late 30s with one or two children at home, a mortgage, modest savings, mostly in the RRSP',
  'an immigrant couple who arrived in Canada in their 30s or 40s (partial OAS, a short QPP history), one of them with little pay',
  'a couple with a large age gap (8 to 18 years) and a pay gap, retiring at different ages',
  'someone in their mid 50s who started saving late, a plan that probably does not hold, a mortgage still running',
  'a couple where one has a public-sector RREGOP pension and the other is self-employed with only an RRSP and non-registered money',
  'a retired or nearly retired couple (63 to 72) living off savings, QPP and OAS not yet or just started, one still working part-time',
  'a high earner (150 000 to 300 000 $) aiming to retire early, big non-registered account, the house to be sold and downsized',
  'a household with unusual life events: an inheritance, rent from a flat, a care cost late in life, children to come, a parental leave',
]

const GEN_SYSTEM = `You write test households for a Québec retirement planner. Each household is a "life spec": about forty plain numbers describing real-looking people, as of October 2026.

Rules:
- Dollar amounts are in 2026 dollars, whole numbers. Salaries are gross. Spending is the household's yearly budget (working years, then retired years); retired spending is usually 70 % to 100 % of working spending, never above 105 %. Spending plus saving must stay under 95 % of gross pay.
- Ages: people are 18 to 100 today; birthYear 1926 to 2008; retirementAge 40 to 75 (for someone already retired, an age they already reached, with salary 0 and pastSalary set); rrqStartAge 60 to 72; oasStartAge 65 to 70.
- A household has 1 or 2 persons. Use 0 as "none" for: salary, pastSalary, lockedIn, residentSince (0 = lifelong resident), rregopServiceYears, partTimeShare, homeValue, homeSaleAge, childCostPerYear.
- RRSP/TFSA yearly contributions: RRSP at most 18 % of pay and under 33 000; TFSA at most 7 000. TFSA balance under 110 000 for the oldest, much less for the young. Non-registered balance and contributions are free.
- A mortgage: rate 0.03 to 0.07, monthlyPayment must be a real payment for that balance; balance 0 for a paid-off home (rate and payment 0).
- RREGOP: serviceYears at most (age - 18) and rregopStartAge between 55 and 65; 0 service for none.
- children are birth years; a child still to come needs a birth year in 2027 to 2036 AND childCostPerYear above 0. Children born at least 14 years after the older parent.
- flows: dated one-offs or runs in 2026 dollars, years between 2026 and 2080 (an inheritance 'windfall', a 'expense' like care or a roof, an 'income' like rent). 0 to 3 of them.
- horizonAge 85 to 105; survivorSpending 0.6 to 1; withdrawalOrder is a permutation of nonReg, rrsp, tfsa.
- Vary the settings (preset, marketPath, bracketFill, splitting, drawTogether, surplusToRrsp) from household to household.
- Make each household different from the others in the batch, in age, income, structure and settings. Include some awkward but possible corners: zero pay, one spouse far younger, savings only in one account, an early retirement, a late one, retirement at an age already passed.
- "story" is one sentence in English describing the people.`

export function extractJson(message: Anthropic.Message): unknown {
  const text = message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('')
  return JSON.parse(text)
}

async function generate(count: number): Promise<{ archetype: string; spec: LifeSpec }[]> {
  const perCall = 5
  const calls = Math.ceil(count / perCall)
  const out: { archetype: string; spec: LifeSpec }[] = []
  for (let i = 0; i < calls; i++) {
    const archetype = ARCHETYPES[i % ARCHETYPES.length]
    const want = Math.min(perCall, count - out.length)
    const res = await client.messages.create({
      model: GEN_MODEL,
      max_tokens: 16000,
      system: GEN_SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: BATCH_SCHEMA } } as Anthropic.MessageCreateParams['output_config'],
      messages: [{ role: 'user', content: `Write ${want} households, all of this kind: ${archetype}. Batch ${i + 1} of ${calls}.` }],
    })
    pay(`generate ${i + 1}`, GEN_MODEL, res.usage)
    if (res.stop_reason !== 'end_turn') console.warn(`generate ${i + 1}: stop_reason ${res.stop_reason}`)
    const { households } = extractJson(res) as { households: LifeSpec[] }
    for (const spec of households) out.push({ archetype, spec })
    console.log(`generated batch ${i + 1}/${calls}: ${households.length} households, $${spent.toFixed(4)} so far`)
  }
  return out.slice(0, count)
}

// ── the digest the auditor reads ────────────────────────────────────────────────────────────────────────────────────────────────────────

const k = (x: number) => Math.round(x).toLocaleString('en-CA').replace(/ | /g, ' ')
const real = (a: Assumptions, year: number) => (1 + a.inflation) ** (year - a.today.year)

export function digest(h: Household, a: Assumptions, rows: YearRow[], earliest: number | null): string {
  const lines: string[] = []
  lines.push(`HOUSEHOLD (JSON): ${JSON.stringify({ ...h, persons: h.persons.map((p) => ({ ...p, earningsHistory: undefined, historyLastYears: Object.entries(p.earningsHistory).slice(-3) })) })}`)
  lines.push(`ASSUMPTIONS: ${JSON.stringify(a)}`)
  lines.push(`ENGINE ANSWER: earliest retirement age at which everyone can stop and the money lasts, trying 18..70 with everyone retiring together: ${earliest === null ? 'none works' : earliest}.`)
  lines.push('YEAR TABLE (all amounts in TODAY\'S dollars; "w/d" is withdrawals from accounts; per person: age, employment, QPP, OAS, GIS, employer pension, net income, tax):')
  const firstShort = rows.find((r) => r.household.shortfall > 0)
  const retireYears = h.persons.map((p) => p.birth.year + p.retirementAge)
  const key = new Set<number>([rows[0].year, rows[rows.length - 1].year, ...(firstShort ? [firstShort.year] : [])])
  for (const y of retireYears) for (const d of [-1, 0, 1, 2]) key.add(y + d)
  for (const p of h.persons) for (const age of [60, 65, 66, 70, 71]) key.add(p.birth.year + age)
  rows.forEach((r) => {
    if (!key.has(r.year) && (r.year - rows[0].year) % 5 !== 0) return
    const f = real(a, r.year)
    const ps = Object.entries(r.persons)
      .map(([id, p]) => {
        if (!p) return ''
        const w = p.withdrawals.rrsp + p.withdrawals.tfsa + p.withdrawals.nonReg
        // every field that moves money is printed, and a zero is left out: an auditor who cannot see the Allowance, the death benefit or the RRSP deduction will report them missing
        const extra = [
          ['allowance', p.allowance], ['survivorQpp', p.survivorPension], ['deathBenefit(in qpp)', p.deathBenefit], ['otherIncome', p.otherIncome ?? 0],
          ['rrspIn', p.contributions.rrsp], ['tfsaIn', p.contributions.tfsa], ['nonRegIn', p.contributions.nonReg], ['dbContrib', p.pensionContribution],
          ['qppContrib', p.rrqContribution], ['payroll', p.payrollContribution], ['rrifMin', p.rrifMinimum], ['oasRecovery', p.oasRecovery],
        ]
          .filter(([, v]) => (v as number) !== 0)
          .map(([n, v]) => `${n} ${k((v as number) / f)}`)
          .join(' ')
        return `${id}[age ${p.age} emp ${k(p.employment / f)} qpp ${k(p.rrq / f)} oas ${k(p.oas / f)} gis ${k(p.gis / f)} db ${k(p.db / f)} w/d ${k(w / f)} net ${k(p.netIncome / f)} tax ${k((p.federalTax + p.quebecTax) / f)} ${extra}]`
      })
      .join(' ')
    lines.push(`${r.year}: spend ${k(r.household.spending / f)} shortfall ${k(r.household.shortfall / f)} tax ${k(r.household.tax / f)} netWorth ${k(r.household.netWorthEnd / f)} home ${k(r.household.homeValueEnd / f)} | ${ps}`)
  })
  return lines.join('\n')
}

const AUDIT_SYSTEM = `You are a senior Québec/Canada retirement and tax reviewer checking the output of a retirement-planning engine.

You get one household, its assumptions, the engine's answer, and a year-by-year table in today's dollars. Look for figures that are WRONG or implausible against the 2026 Canadian and Québec rules: QPP/CPP amounts and the effect of the start age, OAS (including the deferral bonus, the residence share, and the recovery tax), GIS and its income test, RRIF minimums from age 71, federal and Québec income tax and credits, pension income splitting, RREGOP pensions and their coordination, the mortgage, children's costs and benefits, a home sale, windfalls and dated flows, survivor rules after a death, and plain arithmetic (does the year's spending plus tax match what came in?).

What the engine deliberately does NOT model: charitable gifts, medical expenses, probate and estate costs, rental-property depreciation, and the Québec-specific tax credits not listed above. Do not report those as missing. Amounts are rounded; differences of a few percent from a hand calculation are not findings.

Report only things you can point at with specific numbers from the table, and say what you would expect instead and why. Do not pad: if nothing looks wrong, return an empty findings list. severity: "bug" = clearly contradicts a rule or the arithmetic; "suspect" = looks off and deserves a hand check; "note" = a modelling observation worth knowing. confidence 0 to 1.`

// What the first audit got wrong, written down so the second does not: conventions that look like bugs from the table alone. Then the
// engine's own contract (ENGINE.md §1 conventions and §2 official-vs-simplified), whole: the auditor is told what is KNOWN before it is asked what is wrong.
const CONVENTIONS = `HOW THE TABLE IS BUILT (conventions of this engine, not defects):
- The first row is the calendar year of "today" (October 2026) and is a full year: yearly amounts, and a mortgage's 12 payments a year count from January of that year, so a mortgage ends in the calendar year its last payment falls in counting from January 2026.
- A child's cost (childSpending.perChild) is INSIDE the working budget (spending.workingToday) unless onTop is set: it drops out of the budget when the child reaches untilAge. A child still to come adds its cost from birth.
- Retired spending replaces working spending once EVERY person has reached their retirementAge (a person with no pay still has a retirementAge).
- Flows (windfall, expense, income) and the home value are in today's dollars and grow with prices; the home value shown is at the END of the year.
- 'qpp' in the table includes the survivor's pension after a death AND, in the first year after a spouse's death only, the one-off QPP death benefit (shown as deathBenefit(in qpp)). Do not read that year as a change in the pension.
- The Allowance (60-64 spouse of a GIS pensioner) is modelled: it is printed as 'allowance' when it is paid.
- 'rrspIn' / 'tfsaIn' / 'nonRegIn' are this year's contributions: the RRSP one is deducted from net income. surplusToRrsp sends a working year's leftover cash to the RRSP first.
- The reported answer is the earliest age, tried from the oldest person's current age (never below it) to 70, at which EVERYONE retiring together keeps every year free of shortfall. For a household whose oldest person is already past 70 the search tries that age alone, so the answer is that person's current age. The table shows the household's OWN retirement ages, not the answer's.
- Amounts in the table are deflated to today's dollars with the assumed inflation; a figure that is flat in nominal terms (a mortgage payment, an inPay pension without indexation) therefore falls in the table, correctly.`

export const AUDIT_SYSTEM_FULL = (() => {
  const md = readFileSync(join(root, 'ENGINE.md'), 'utf8')
  const from = md.indexOf('## 1. Conventions')
  const to = md.indexOf('## 3. How a number earns trust')
  return `${AUDIT_SYSTEM}\n\n${CONVENTIONS}\n\nTHE ENGINE'S OWN CONTRACT (ENGINE.md §1-§2). Anything listed there as a simplification is KNOWN: report it only if the table shows an effect clearly larger than the size the contract states, and say so.\n\n${md.slice(from, to)}`
})()

const AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['bug', 'suspect', 'note'] },
          year: { type: 'integer' },
          topic: { type: 'string' },
          observed: { type: 'string' },
          expected: { type: 'string' },
          reasoning: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['severity', 'year', 'topic', 'observed', 'expected', 'reasoning', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['verdict', 'findings'],
  additionalProperties: false,
}

interface Finding { severity: string; year: number; topic: string; observed: string; expected: string; reasoning: string; confidence: number }

async function audit(text: string, label: string): Promise<{ verdict: string; findings: Finding[] }> {
  const res = await client.messages.create({
    model: AUDIT_MODEL,
    max_tokens: 16000,
    system: [{ type: 'text', text: AUDIT_SYSTEM_FULL, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: AUDIT_EFFORT, format: { type: 'json_schema', schema: AUDIT_SCHEMA } } as Anthropic.MessageCreateParams['output_config'],
    messages: [{ role: 'user', content: text }],
  })
  pay(`audit ${label}`, AUDIT_MODEL, res.usage)
  return extractJson(res) as { verdict: string; findings: Finding[] }
}

/** The same audits through the Batch API: half price, results within the hour or so, no concurrency to manage. Keyed by custom_id, never by position. */
async function auditBatch(items: { id: string; text: string }[]): Promise<Map<string, { verdict: string; findings: Finding[] } | string>> {
  const out = new Map<string, { verdict: string; findings: Finding[] } | string>()
  if (items.length === 0) return out
  const batch = await client.messages.batches.create({
    requests: items.map((t) => ({
      custom_id: t.id,
      params: {
        model: AUDIT_MODEL,
        max_tokens: 16000,
        system: [{ type: 'text' as const, text: AUDIT_SYSTEM_FULL, cache_control: { type: 'ephemeral' as const } }],
        output_config: { effort: AUDIT_EFFORT, format: { type: 'json_schema', schema: AUDIT_SCHEMA } } as Anthropic.MessageCreateParams['output_config'],
        messages: [{ role: 'user' as const, content: t.text }],
      },
    })),
  })
  console.log(`batch ${batch.id} submitted: ${items.length} audits`)
  for (;;) {
    await new Promise((r) => setTimeout(r, 30_000))
    const b = await client.messages.batches.retrieve(batch.id)
    console.log(`batch ${b.processing_status}: ${b.request_counts.succeeded} done, ${b.request_counts.processing} processing, ${b.request_counts.errored} errored`)
    if (b.processing_status === 'ended') break
  }
  for await (const entry of await client.messages.batches.results(batch.id)) {
    if (entry.result.type !== 'succeeded') {
      out.set(entry.custom_id, `batch result: ${entry.result.type}`)
      continue
    }
    pay(`audit ${entry.custom_id} (batch)`, AUDIT_MODEL, entry.result.message.usage, 0.5)
    try {
      out.set(entry.custom_id, extractJson(entry.result.message) as { verdict: string; findings: Finding[] })
    } catch (err) {
      out.set(entry.custom_id, `unparseable: ${(err as Error).message}`)
    }
  }
  return out
}

// ── the run ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dir = join(here, 'out', stamp)
  mkdirSync(dir, { recursive: true })
  console.log(`dry run: ${N} households from ${GEN_MODEL}${AUDIT ? `, audited by ${AUDIT_MODEL}` : ' (no audit)'}, cap $${CAP}. Output: ${dir}`)

  const specsPath = flag('specs', '')
  const specs: { archetype: string; spec: LifeSpec }[] = specsPath ? JSON.parse(readFileSync(specsPath, 'utf8')) : await generate(N)
  writeFileSync(join(dir, 'specs.json'), JSON.stringify(specs, null, 2))

  const results: Record<string, unknown>[] = []
  const tally = { run: 0, implausible: 0, engineProblems: 0, audited: 0, bugs: 0, suspects: 0, threw: 0 }
  const implausibleRules: Record<string, number> = {}
  const toAudit: { slot: Record<string, unknown>; text: string; id: string }[] = []

  for (const [i, { archetype, spec }] of specs.entries()) {
    const id = `h${String(i).padStart(3, '0')}`
    let e
    try {
      e = expand(spec)
    } catch (err) {
      tally.threw++
      results.push({ id, archetype, story: spec.story, expandError: (err as Error).message })
      continue
    }
    const c = check(e)
    if (c.implausible.length > 0) {
      tally.implausible++
      for (const v of c.implausible) implausibleRules[v.split(':')[0]] = (implausibleRules[v.split(':')[0]] ?? 0) + 1
      results.push({ id, archetype, story: spec.story, implausible: c.implausible })
      continue
    }
    tally.run++
    if (c.problems.length > 0) tally.engineProblems++
    const slot: Record<string, unknown> = { id, archetype, story: spec.story, earliest: c.earliest, problems: c.problems, audit: null }
    results.push(slot)
    if (AUDIT && c.rows && c.rows.length > 0) toAudit.push({ slot, text: digest(e.household, e.assumptions, c.rows, c.earliest), id })
    console.log(`${id} ${c.problems.length ? 'PROBLEMS ' + c.problems.length : 'checks ok'}`)
  }
  writeFileSync(join(dir, 'digests.json'), JSON.stringify(toAudit.map((t) => ({ id: t.id, text: t.text })), null, 2))

  // the audits are slow (a minute or two each at medium effort) and independent: five at a time, each result saved the moment it lands
  let next = 0
  const saveReport = () => {
    const report = { stamp, models: { GEN_MODEL, AUDIT_MODEL: AUDIT ? AUDIT_MODEL : null }, tally, implausibleRules, spentUsd: Number(spent.toFixed(4)), ledger, results }
    writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2))
    return report
  }
  const worker = async () => {
    while (next < toAudit.length) {
      if (!canAfford()) {
        if (inFlight === 0) {
          console.log(`stopping: $${spent.toFixed(3)} spent, the next audit could cross the $${CAP} cap`)
          next = toAudit.length
        } else await new Promise((r) => setTimeout(r, 3000))
        continue
      }
      const t = toAudit[next++]
      inFlight++
      try {
        const out = await audit(t.text, t.id)
        t.slot.audit = out
        tally.audited++
        tally.bugs += out.findings.filter((f) => f.severity === 'bug').length
        tally.suspects += out.findings.filter((f) => f.severity === 'suspect').length
        console.log(`${t.id} audited: ${out.findings.length} findings, $${spent.toFixed(3)} so far`)
      } catch (err) {
        t.slot.auditError = (err as Error).message
        console.log(`${t.id} audit failed: ${(err as Error).message}`)
      } finally {
        inFlight--
      }
      saveReport()
    }
  }
  if (BATCH) {
    // batch: submitted once, so the cap is checked up front against the worst case (half price, about $0.10 an audit at medium effort; reserve double that)
    const worst = toAudit.length * RESERVE * 0.5
    if (spent + worst > CAP) throw new Error(`a batch of ${toAudit.length} audits could cost $${worst.toFixed(2)} and the cap is $${CAP}: lower --n or raise --cap`)
    const done = await auditBatch(toAudit.map((t) => ({ id: t.id, text: t.text })))
    for (const t of toAudit) {
      const r = done.get(t.id)
      if (typeof r === 'string' || r === undefined) t.slot.auditError = r ?? 'no result'
      else {
        t.slot.audit = r
        tally.audited++
        tally.bugs += r.findings.filter((f) => f.severity === 'bug').length
        tally.suspects += r.findings.filter((f) => f.severity === 'suspect').length
      }
    }
    saveReport()
  } else await Promise.all(Array.from({ length: 3 }, worker))

  const report = saveReport()
  console.log('\n' + JSON.stringify({ tally, implausibleRules, spentUsd: report.spentUsd }, null, 2))
}

if (import.meta.main) main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  console.error(`spent so far: $${spent.toFixed(4)}`)
  process.exit(1)
})
