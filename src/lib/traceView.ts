import { pageFor } from '../engine/params/twins.ts'
import type { Trace, TraceKind } from '../engine/trace.ts'
import type { Lang } from '../i18n.ts'
import { formatDecimal, formatPct } from './format.ts'
import { formatMoney } from './money.ts'
import { TRACE_COPY } from './traceCopy.ts'

// A Trace (engine/trace.ts: raw numbers and label keys) written for a reader: the formula with this household's numbers, each input with the route to the
// field that sets it, and the official page in the reader's language. The engine formats nothing; this is where the figures become words — through the cached
// formatters, never an inline Intl.

export interface TraceLines {
  /** The label of the figure itself (« Rente du RRQ »), for the button's accessible name. */
  label: string
  /** The figure the button shows: the amount in today's dollars. */
  shown: string
  /** The accessible name of the button. */
  name: string
  /** The whole calculation, one sentence. */
  formula: string
  inputs: { label: string; value: string; to: string }[]
  source?: { title: string; url: string; inReaderLanguage: boolean; pageLang: Lang }
}

/** A fact id (`self:salary`), `person:<id>` or `assumptions` → the route that holds the field. */
export function doorTo(door: string): string {
  if (door === 'assumptions') return '/hypotheses'
  if (door.startsWith('person:')) return `/profil?person=${encodeURIComponent(door.slice('person:'.length))}`
  return `/profil?fact=${encodeURIComponent(door)}`
}

const monthYear = (ym: { year: number; month: number }) => `${String(ym.month).padStart(2, '0')}/${ym.year}`

export function traceLines(trace: Trace, lang: Lang): TraceLines {
  const c = TRACE_COPY[lang]
  const word = (key: string) => c.labels[key] ?? key
  const write = (value: number, kind: TraceKind, cents = true) =>
    kind === 'money' ? formatMoney(value, lang, { cents }) : kind === 'pct' ? formatPct(value, lang, 1) : c.age(formatDecimal(value, lang, 0))

  const piece = (p: Trace['parts'][number]) => `${word(p.labelKey)} ${write(p.value, p.kind)}`
  const adds = trace.parts.filter((p) => p.op === 'add')
  const muls = trace.parts.filter((p) => p.op === 'mul')
  // (base 1 000 $ + 1ʳᵉ supplémentaire …) × ajustement 85,0 %  ·  pension complète 762,50 $ × résidence 50,0 % × report 100,0 %
  const sum = adds.length > 1 ? `(${adds.map(piece).join(' + ')})` : adds.map(piece).join('')
  const expr = [...(sum ? [sum] : []), ...muls.map(piece)].join(' × ')
  const formula = c.formula(word(`${trace.labelKey}Lead`), monthYear(trace.start), expr, write(trace.value, 'money'), write(trace.today, 'money'))

  const shown = formatMoney(trace.today, lang, { cents: false })
  const src = trace.source ? pageFor(trace.source, lang) : undefined
  return {
    label: word(trace.labelKey),
    shown,
    name: c.figureName(shown, word(trace.labelKey)),
    formula,
    inputs: trace.inputs.map((i) => ({ label: word(i.labelKey), value: i.value === undefined ? '' : write(i.value, i.kind), to: i.door === undefined ? '' : doorTo(i.door) })),
    source: src && { title: src.title, url: src.url, inReaderLanguage: src.inReaderLanguage, pageLang: src.pageLang },
  }
}
