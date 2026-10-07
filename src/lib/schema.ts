import type { AccountKind, Assumptions, DbPension, Household, Person, PersonId } from '../engine/types.ts'

// THE SHAPE OF A SAVED PROFILE — what is written to this device's storage and to an exported file.
//
// Everything else (the engine's types, the pages) can change freely; THIS file cannot change without a
// ceremony, because a person's file made today must still open next year. `schemaVersion.test.ts` pins a
// hash of this file: any edit to it fails the build until SCHEMA_VERSION is raised, a migration written for
// the old version, and an example file of the old shape kept (src/lib/fixtures/). Comments and blank lines do
// not count — only the code does.
//
// `today` is NOT stored: it is read from the clock when a profile is used, so a saved profile never goes stale.

export const SCHEMA_VERSION = 5

/** The most a pension already in pay may be, per year, in today's dollars. NumberField bounds read this same figure. */
export const MAX_IN_PAY_ANNUAL = 1_000_000

export type StoredAssumptions = Omit<Assumptions, 'today'>

export interface Profile {
  /** Marks a file as a Horizon profile (an import refuses anything else). */
  app: 'horizon'
  version: number
  household: Household
  /** Birth years only: v1 has no child benefits, so a child changes nothing in the projection. */
  children: number[]
  assumptions: StoredAssumptions
}

/** What is wrong with one field of a profile read from outside (a file, or storage). The UI words each one. */
export interface ProfileProblem {
  path: string
  problem: 'missing' | 'type' | 'range' | 'enum' | 'count'
}

export type ProfileResult = { ok: true; profile: Profile } | { ok: false; problems: ProfileProblem[] }

export const ACCOUNT_KINDS: readonly AccountKind[] = ['nonReg', 'rrsp', 'tfsa']

export const blankPerson = (id: PersonId, today: { year: number }): Person => ({
  id,
  name: '',
  birth: { year: today.year - 45, month: 1 },
  retirementAge: 65,
  salaryToday: 0,
  earningsHistory: {},
  rrq: { startAge: 65 },
  oas: { startAge: 65, residentSince: today.year - 45 + 18 },
  accounts: {
    rrsp: { balance: 0, room: 0, annualContribution: 0 },
    tfsa: { balance: 0, room: 0, annualContribution: 0 },
    nonReg: { balance: 0, acb: 0, annualContribution: 0 },
  },
  pensions: [],
})

export const defaultProfile = (today: { year: number }): Profile => ({
  app: 'horizon',
  version: SCHEMA_VERSION,
  household: { livesAlone: true, persons: [blankPerson('self', today)], spending: { workingToday: 0, retiredToday: 0 } },
  children: [],
  assumptions: {
    inflation: 0.02,
    wageGrowth: 0.03,
    returns: { nonReg: 0.04, rrsp: 0.05, tfsa: 0.05 },
    horizonAge: 95,
    withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'],
    pensionSplitting: true,
  },
})

// ── Validation: the gate every outside file passes through ──────────────────────────────────────────

class Reader {
  problems: ProfileProblem[] = []
  private bad(path: string, problem: ProfileProblem['problem']): void {
    this.problems.push({ path, problem })
  }
  obj(v: unknown, path: string): Record<string, unknown> | null {
    if (v === undefined || v === null) return void this.bad(path, 'missing'), null
    if (typeof v !== 'object' || Array.isArray(v)) return void this.bad(path, 'type'), null
    return v as Record<string, unknown>
  }
  arr(v: unknown, path: string): unknown[] | null {
    if (v === undefined || v === null) return void this.bad(path, 'missing'), null
    if (!Array.isArray(v)) return void this.bad(path, 'type'), null
    return v
  }
  num(v: unknown, path: string, min: number, max: number, int = false): number {
    if (v === undefined || v === null) return void this.bad(path, 'missing'), min
    if (typeof v !== 'number' || !Number.isFinite(v)) return void this.bad(path, 'type'), min
    if (v < min || v > max || (int && !Number.isInteger(v))) return void this.bad(path, 'range'), min
    return v
  }
  optNum(v: unknown, path: string, min: number, max: number): number | undefined {
    return v === undefined || v === null ? undefined : this.num(v, path, min, max)
  }
  nullableNum(v: unknown, path: string, min: number, max: number): number | null {
    return v === null ? null : this.num(v, path, min, max)
  }
  str(v: unknown, path: string, max: number): string {
    if (v === undefined || v === null) return void this.bad(path, 'missing'), ''
    if (typeof v !== 'string') return void this.bad(path, 'type'), ''
    if (v.length > max) return void this.bad(path, 'range'), ''
    return v
  }
  bool(v: unknown, path: string): boolean {
    if (typeof v !== 'boolean') return void this.bad(path, v === undefined ? 'missing' : 'type'), false
    return v
  }
  oneOf<T extends string>(v: unknown, path: string, allowed: readonly T[]): T {
    if (typeof v !== 'string' || !allowed.includes(v as T)) return void this.bad(path, v === undefined ? 'missing' : 'enum'), allowed[0]
    return v as T
  }
  count(path: string): void {
    this.bad(path, 'count')
  }
}

function readPension(r: Reader, v: unknown, path: string): DbPension {
  const o = r.obj(v, path) ?? {}
  const coord = o.coordination === null ? null : r.obj(o.coordination, `${path}.coordination`)
  const unreduced = r.obj(o.unreduced, `${path}.unreduced`) ?? {}
  const factor = unreduced.factor === null ? null : r.obj(unreduced.factor, `${path}.unreduced.factor`)
  const bridge = o.bridge === null ? null : r.obj(o.bridge, `${path}.bridge`)
  const indexation = r.obj(o.indexation, `${path}.indexation`) ?? {}
  const inPay = o.inPay === undefined ? null : r.obj(o.inPay, `${path}.inPay`)
  const deferred = o.deferred === undefined ? null : r.obj(o.deferred, `${path}.deferred`)
  const deferredIndexation = deferred ? r.obj(deferred.indexation, `${path}.deferred.indexation`) ?? {} : null
  const after65 = inPay ? r.optNum(inPay.after65, `${path}.inPay.after65`, 0, MAX_IN_PAY_ANNUAL) : undefined
  const sinceRaw = inPay && inPay.since !== undefined ? r.obj(inPay.since, `${path}.inPay.since`) : null
  return {
    label: r.str(o.label, `${path}.label`, 60),
    accrualRate: r.num(o.accrualRate, `${path}.accrualRate`, 0, 0.1),
    maxServiceYears: r.nullableNum(o.maxServiceYears, `${path}.maxServiceYears`, 1, 60),
    serviceYearsToDate: r.num(o.serviceYearsToDate, `${path}.serviceYearsToDate`, 0, 60),
    serviceRatePerYear: r.num(o.serviceRatePerYear, `${path}.serviceRatePerYear`, 0, 1),
    averagingYears: r.num(o.averagingYears, `${path}.averagingYears`, 1, 10, true),
    coordination: coord && {
      rate: r.num(coord.rate, `${path}.coordination.rate`, 0, 0.05),
      fromAge: r.num(coord.fromAge, `${path}.coordination.fromAge`, 55, 75),
      maxYears: r.num(coord.maxYears, `${path}.coordination.maxYears`, 1, 60),
    },
    earliestAge: r.num(o.earliestAge, `${path}.earliestAge`, 45, 75),
    unreduced: {
      age: r.num(unreduced.age, `${path}.unreduced.age`, 45, 75),
      serviceYears: r.nullableNum(unreduced.serviceYears, `${path}.unreduced.serviceYears`, 1, 60),
      factor: factor && {
        minAge: r.num(factor.minAge, `${path}.unreduced.factor.minAge`, 45, 75),
        total: r.num(factor.total, `${path}.unreduced.factor.total`, 50, 120),
      },
    },
    earlyReductionPerYear: r.num(o.earlyReductionPerYear, `${path}.earlyReductionPerYear`, 0, 0.2),
    bridge: bridge && {
      share: r.num(bridge.share, `${path}.bridge.share`, 0, 1),
      untilAge: r.num(bridge.untilAge, `${path}.bridge.untilAge`, 55, 75),
    },
    indexation: {
      share: r.num(indexation.share, `${path}.indexation.share`, 0, 1),
      minus: r.num(indexation.minus, `${path}.indexation.minus`, 0, 0.1),
    },
    startAge: r.num(o.startAge, `${path}.startAge`, 45, 75, true),
    ...(deferred && deferredIndexation
      ? {
          deferred: {
            toAge: r.num(deferred.toAge, `${path}.deferred.toAge`, 55, 75),
            indexation: {
              share: r.num(deferredIndexation.share, `${path}.deferred.indexation.share`, 0, 1),
              minus: r.num(deferredIndexation.minus, `${path}.deferred.indexation.minus`, 0, 0.1),
            },
          },
        }
      : {}),
    ...(inPay
      ? {
          inPay: {
            annual: r.num(inPay.annual, `${path}.inPay.annual`, 0, MAX_IN_PAY_ANNUAL),
            ...(after65 === undefined ? {} : { after65 }),
            ...(sinceRaw ? { since: { year: r.num(sinceRaw.year, `${path}.inPay.since.year`, 1900, 2100, true), month: r.num(sinceRaw.month, `${path}.inPay.since.month`, 1, 12, true) } } : {}),
          },
        }
      : {}),
  }
}

function readAccount<K extends string>(r: Reader, v: unknown, path: string, keys: readonly K[]): Record<K, number> {
  const o = r.obj(v, path) ?? {}
  const out = {} as Record<K, number>
  for (const k of keys) out[k] = r.num(o[k], `${path}.${k}`, 0, 1e9)
  return out
}

function readPerson(r: Reader, v: unknown, path: string, expected: PersonId): Person {
  const o = r.obj(v, path) ?? {}
  const birth = r.obj(o.birth, `${path}.birth`) ?? {}
  const rrq = r.obj(o.rrq, `${path}.rrq`) ?? {}
  const oas = r.obj(o.oas, `${path}.oas`) ?? {}
  const accounts = r.obj(o.accounts, `${path}.accounts`) ?? {}
  const history = r.obj(o.earningsHistory, `${path}.earningsHistory`) ?? {}
  const earningsHistory: Record<number, number> = {}
  for (const [k, val] of Object.entries(history)) {
    const year = Number(k)
    // The key must BE the year's canonical spelling: « 0x7CF », « 1999.0 » and « 1.999e3 » all read as 1999 and would
    // silently overwrite the real figure.
    if (!Number.isInteger(year) || String(year) !== k || year < 1966 || year > 2100) r.count(`${path}.earningsHistory.${k}`)
    else earningsHistory[year] = r.num(val, `${path}.earningsHistory.${k}`, 0, 1e9)
  }
  // Counted BEFORE they are read: a file with a million plans must be refused, not parsed a million times.
  const rawPensions = r.arr(o.pensions, `${path}.pensions`) ?? []
  if (rawPensions.length > 8) r.count(`${path}.pensions`)
  const pensions = rawPensions.slice(0, 8).map((p, i) => readPension(r, p, `${path}.pensions[${i}]`))
  return {
    id: r.oneOf(o.id, `${path}.id`, [expected]),
    name: r.str(o.name, `${path}.name`, 60),
    birth: { year: r.num(birth.year, `${path}.birth.year`, 1900, 2100, true), month: r.num(birth.month, `${path}.birth.month`, 1, 12, true) },
    retirementAge: r.num(o.retirementAge, `${path}.retirementAge`, 40, 80, true),
    salaryToday: r.num(o.salaryToday, `${path}.salaryToday`, 0, 1e8),
    earningsHistory,
    rrq: {
      startAge: r.num(rrq.startAge, `${path}.rrq.startAge`, 60, 72, true),
      ...(rrq.statementAt60 != null ? { statementAt60: r.optNum(rrq.statementAt60, `${path}.rrq.statementAt60`, 0, 1e5) } : {}),
      ...(rrq.statementAt65 != null ? { statementAt65: r.optNum(rrq.statementAt65, `${path}.rrq.statementAt65`, 0, 1e5) } : {}),
    },
    oas: {
      startAge: r.num(oas.startAge, `${path}.oas.startAge`, 65, 70, true),
      residentSince: r.num(oas.residentSince, `${path}.oas.residentSince`, 1900, 2100, true),
    },
    accounts: {
      rrsp: readAccount(r, accounts.rrsp, `${path}.accounts.rrsp`, ['balance', 'room', 'annualContribution'] as const),
      tfsa: readAccount(r, accounts.tfsa, `${path}.accounts.tfsa`, ['balance', 'room', 'annualContribution'] as const),
      nonReg: readAccount(r, accounts.nonReg, `${path}.accounts.nonReg`, ['balance', 'acb', 'annualContribution'] as const),
    },
    pensions,
  }
}

/** Reads an unknown value as a profile of the CURRENT schema: every field checked, nothing trusted. */
export function validateProfile(raw: unknown): ProfileResult {
  const r = new Reader()
  const root = r.obj(raw, 'profile')
  if (!root) return { ok: false, problems: r.problems }
  if (root.app !== 'horizon') r.problems.push({ path: 'app', problem: root.app === undefined ? 'missing' : 'enum' })
  const version = r.num(root.version, 'version', 1, SCHEMA_VERSION, true)

  const household = r.obj(root.household, 'household') ?? {}
  const rawPersons = r.arr(household.persons, 'household.persons') ?? []
  if (rawPersons.length < 1 || rawPersons.length > 2) r.count('household.persons')
  const persons = rawPersons.slice(0, 2).map((p, i) => readPerson(r, p, `household.persons[${i}]`, i === 0 ? 'self' : 'spouse'))
  const spending = r.obj(household.spending, 'household.spending') ?? {}
  const spendingNow = {
    workingToday: r.num(spending.workingToday, 'household.spending.workingToday', 0, 1e8),
    retiredToday: r.num(spending.retiredToday, 'household.spending.retiredToday', 0, 1e8),
  }
  const livesAlone = r.bool(household.livesAlone, 'household.livesAlone')

  const rawChildren = r.arr(root.children, 'children') ?? []
  if (rawChildren.length > 12) r.count('children')
  const children = rawChildren.slice(0, 12).map((c, i) => r.num(c, `children[${i}]`, 1950, 2100, true))

  const a = r.obj(root.assumptions, 'assumptions') ?? {}
  const returns = r.obj(a.returns, 'assumptions.returns') ?? {}
  const orderRaw = r.arr(a.withdrawalOrder, 'assumptions.withdrawalOrder') ?? []
  const order = orderRaw.map((k, i) => r.oneOf(k, `assumptions.withdrawalOrder[${i}]`, ACCOUNT_KINDS))
  if (order.length !== 3 || new Set(order).size !== 3) r.count('assumptions.withdrawalOrder')
  const assumptions: StoredAssumptions = {
    inflation: r.num(a.inflation, 'assumptions.inflation', -0.02, 0.15),
    wageGrowth: r.num(a.wageGrowth, 'assumptions.wageGrowth', -0.02, 0.15),
    returns: {
      nonReg: r.num(returns.nonReg, 'assumptions.returns.nonReg', -0.2, 0.3),
      rrsp: r.num(returns.rrsp, 'assumptions.returns.rrsp', -0.2, 0.3),
      tfsa: r.num(returns.tfsa, 'assumptions.returns.tfsa', -0.2, 0.3),
    },
    horizonAge: r.num(a.horizonAge, 'assumptions.horizonAge', 80, 110, true),
    withdrawalOrder: order,
    pensionSplitting: r.bool(a.pensionSplitting, 'assumptions.pensionSplitting'),
  }

  if (r.problems.length > 0) return { ok: false, problems: r.problems }
  return { ok: true, profile: { app: 'horizon', version, household: { livesAlone, persons, spending: spendingNow }, children, assumptions } }
}
