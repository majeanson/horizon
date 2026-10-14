import type { AgesLedger } from './ledger.ts'
import { KNOWN, LAST_KNOWN_YEAR } from './params/index.ts'

// « D'où vient ce chiffre ? » — the PROVENANCE of a computed figure, as data. A Trace is the figure's formula with this
// household's numbers (the parts), the choices behind it (the inputs, each with the door to the field that sets it), and
// the official page the rule comes from. It carries RAW numbers and label KEYS only: the engine formats nothing (no Intl,
// no language), and lib/traceView.ts + lib/traceCopy.ts write the sentence for the reader.
//
// The parts RECOMPOSE to the value — (Σ the `add` parts, or 1 when there are none) × (Π the `mul` parts) — and
// trace.test.ts holds every builder to that, so a trace can never say a calculation the engine did not run.

export type TraceKind = 'money' | 'pct' | 'age'

export interface TracePart {
  labelKey: string
  value: number
  kind: TraceKind
  /** `add`: summed with the other `add` parts, then multiplied. `mul`: a factor. */
  op: 'add' | 'mul'
}

export interface TraceInput {
  labelKey: string
  /** Omitted when the input is a whole record, not one number (the earnings history). */
  value?: number
  kind: TraceKind
  /** Where the reader changes it: a fact id (`self:salary`), `person:<id>` (that person's own page), or `assumptions`. Omitted: a rule, not a choice. */
  door?: string
}

/** The official page a rule was read on, as cited in engine/params (the lib picks the reader's language edition: params/twins.ts). */
export interface TraceSource {
  title: string
  url: string
}

export interface Trace {
  labelKey: string
  /** What the parts make, in the dollars of `start`'s year. */
  value: number
  /** The same amount in today's dollars, when it differs: the figure the reader sees. */
  today: number
  start: { year: number; month: number }
  parts: TracePart[]
  inputs: TraceInput[]
  source?: TraceSource
}

/** What the parts make: the figure's own recomposition, the check trace.test.ts runs. */
export function recompose(parts: readonly TracePart[]): number {
  const adds = parts.filter((p) => p.op === 'add')
  const sum = adds.length === 0 ? 1 : adds.reduce((s, p) => s + p.value, 0)
  return parts.filter((p) => p.op === 'mul').reduce((m, p) => m * p.value, sum)
}

const cited = (page: { source: { title: string; url: string } }): TraceSource => ({ title: page.source.title, url: page.source.url })

/** The QPP pension: (base + 1st additional + 2nd additional) × the start-age adjustment. The rule is the Retraite Québec leaflet that sets the adjustment. */
export function rrqTrace(l: AgesLedger): Trace {
  const r = l.rrq
  return {
    labelKey: 'rrq',
    value: r.monthly,
    today: r.monthlyToday,
    start: r.start,
    parts: [
      { labelKey: 'rrqBase', value: r.base, kind: 'money', op: 'add' },
      { labelKey: 'rrqFirst', value: r.additionalFirst, kind: 'money', op: 'add' },
      { labelKey: 'rrqSecond', value: r.additionalSecond, kind: 'money', op: 'add' },
      { labelKey: 'rrqAdjustment', value: r.adjustment, kind: 'pct', op: 'mul' },
    ],
    inputs: [
      { labelKey: 'earnings', kind: 'money', door: `${l.id}:earnings` },
      { labelKey: 'retirement', value: l.retirement.age, kind: 'age', door: `person:${l.id}` },
      { labelKey: 'rrqStart', value: r.startAge, kind: 'age', door: `person:${l.id}` },
    ],
    source: cited(KNOWN[LAST_KNOWN_YEAR].rrq.earlyBase),
  }
}

/** The OAS pension: the full amount × the share the residence earns × the deferral multiplier. The rule is the Service Canada page for the amount. */
export function oasTrace(l: AgesLedger): Trace {
  const o = l.oas
  return {
    labelKey: 'oas',
    value: o.monthly,
    today: o.monthlyToday,
    start: o.start,
    parts: [
      { labelKey: 'oasFull', value: o.full, kind: 'money', op: 'mul' },
      { labelKey: 'oasResidence', value: o.residence, kind: 'pct', op: 'mul' },
      { labelKey: 'oasDeferral', value: o.multiplier, kind: 'pct', op: 'mul' },
    ],
    inputs: [
      { labelKey: 'residence', value: o.residence, kind: 'pct', door: `person:${l.id}` },
      { labelKey: 'oasStart', value: o.startAge, kind: 'age', door: `person:${l.id}` },
    ],
    source: cited(KNOWN[LAST_KNOWN_YEAR].oas.monthly65to74),
  }
}
