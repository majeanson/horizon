import { useMemo, useState, type ReactNode } from 'react'
import { ASSUMPTION_PRESETS } from '../../engine/assumptionPresets'
import { impactOf, impactOfReturn } from '../../engine/assumptionImpact'
import { agesLedger, planGlance } from '../../engine/ledger'
import type { AccountKind, Assumptions, Household, PersonId } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import { formatPct, formatYearAge } from '../../lib/format'
import { LEDGER_COPY } from '../../lib/ledgerCopy'
import { formatMoney } from '../../lib/money'
import { mapPerson, setAssumptions, setReturn, setSpending } from '../../lib/profileEdit'
import { MAX_AGE, MIN_AGE } from '../../lib/resultsModel'
import { updateProfile } from '../../lib/store'
import { Chip } from '../Chip'
import { ImpactMeter } from '../ImpactMeter'
import { Slider, type SliderMark } from '../Slider'

// « Mes données et leur calcul »: every number that sets the answer, as a slider, with the calculation it triggers and the
// amount it becomes — and what the plan does as the slider moves. The ages (when the pay stops, when the QPP starts, when
// the OAS starts), then the spending and the economy (inflation, returns). A value is saved in the profile when the slider
// is released (the same place Profil edits), and the verdict above, which reads the profile, follows. While the thumb moves,
// the panel previews from ONE projection on a copy of the household.

type AgeField = 'retirement' | 'rrq' | 'oas'
type SpendKey = 'spend:workingToday' | 'spend:retiredToday'
type Key = `${PersonId}:${AgeField}` | SpendKey | 'inflation' | `return:${AccountKind}`
type Preview = Partial<Record<Key, number>>

const RANGES = { retirement: { min: MIN_AGE, max: MAX_AGE }, rrq: { min: 60, max: 72 }, oas: { min: 65, max: 70 } } as const
// Where the rules turn, printed under the track: the QPP at 60 · 65 · 70, the OAS at 65 · 70.
const AGE_MARKS: Record<AgeField, readonly SliderMark[] | undefined> = {
  retirement: undefined,
  rrq: [60, 65, 70].map((v) => ({ value: v, label: String(v) })),
  oas: [65, 70].map((v) => ({ value: v, label: String(v) })),
}
const KINDS: readonly AccountKind[] = ['rrsp', 'tfsa', 'nonReg']

const isSpend = (key: Key): key is SpendKey => key === 'spend:workingToday' || key === 'spend:retiredToday'
const spendField = (key: SpendKey) => (key === 'spend:workingToday' ? 'workingToday' : 'retiredToday')

/** The household and assumptions as they would be with one slider at `value` (ages in years, money in dollars, rates in per-mille). */
function applied(h: Household, a: Assumptions, key: Key, value: number): [Household, Assumptions] {
  if (isSpend(key)) return [{ ...h, spending: { ...h.spending, [spendField(key)]: value } }, a]
  if (key === 'inflation') return [h, { ...a, inflation: value / 1000 }]
  if (key.startsWith('return:')) return [h, { ...a, returns: { ...a.returns, [key.slice(7)]: value / 1000 } }]
  const [id, field] = key.split(':') as [PersonId, AgeField]
  return [{ ...h, persons: h.persons.map((p) => (p.id !== id ? p : field === 'retirement' ? { ...p, retirementAge: value } : field === 'rrq' ? { ...p, rrq: { ...p.rrq, startAge: value } } : { ...p, oas: { ...p.oas, startAge: value } })) }, a]
}

function save(key: Key, value: number): void {
  if (isSpend(key)) return updateProfile((p) => setSpending(p, { [spendField(key)]: value }))
  if (key === 'inflation') return updateProfile((p) => setAssumptions(p, { inflation: value / 1000 }))
  if (key.startsWith('return:')) return updateProfile((p) => setReturn(p, key.slice(7) as AccountKind, value / 1000))
  const [id, field] = key.split(':') as [PersonId, AgeField]
  updateProfile((p) => mapPerson(p, id, (x) => (field === 'retirement' ? { ...x, retirementAge: value } : field === 'rrq' ? { ...x, rrq: { ...x.rrq, startAge: value } } : { ...x, oas: { ...x.oas, startAge: value } })))
}

const monthYear = (ym: { year: number; month: number }) => `${String(ym.month).padStart(2, '0')}/${ym.year}`

export function LedgerPanel({ household, assumptions, names }: { household: Household; assumptions: Assumptions; names: readonly string[] }) {
  const { lang } = useLang()
  const c = LEDGER_COPY[lang]
  const t = useT()
  const [preview, setPreview] = useState<Preview>({})

  // What the page would be if the sliders were where they are being held.
  const [shown, shownA] = useMemo(() => {
    let h = household
    let a = assumptions
    for (const [key, value] of Object.entries(preview)) [h, a] = applied(h, a, key as Key, value)
    return [h, a] as const
  }, [household, assumptions, preview])

  const ledger = useMemo(() => agesLedger(shown, shownA), [shown, shownA])
  const glance = useMemo(() => planGlance(shown, shownA), [shown, shownA])
  // The figures when the panel opened: « what did this change » is read against them.
  const [opened] = useState(() => ({ ledger: agesLedger(household, assumptions), glance: planGlance(household, assumptions) }))

  const money = (n: number, cents = false) => formatMoney(n, lang, { cents })
  const commit = (key: Key, value: number) => {
    setPreview((p) => {
      const { [key]: _gone, ...rest } = p
      return rest
    })
    save(key, value)
  }
  const delta = (now: number, was: number, more: (a: string) => string, less: (a: string) => string) => {
    const d = Math.round(now - was)
    return d === 0 ? null : d > 0 ? more(money(d)) : less(money(-d))
  }
  const worthDelta = delta(glance.netWorthEnd, opened.glance.netWorthEnd, c.glanceMore, c.glanceLess)

  const slider = (key: Key, label: string, value: number, min: number, max: number, step: number, text: (v: number) => string, marks?: readonly SliderMark[], info?: (v: number) => ReactNode) => (
    <Slider
      marks={marks}
      info={info}
      label={label}
      value={value}
      min={Math.min(min, value)}
      max={Math.max(max, value)}
      step={step}
      valueText={text}
      onPreview={(v) => setPreview((p) => ({ ...p, [key]: v }))}
      onCommit={(v) => commit(key, v)}
    />
  )
  const ageSlider = (id: PersonId, field: AgeField, label: string, value: number, done: boolean) =>
    done ? (
      <p className="ledger__fixed">
        <span className="field-row__label">{label}</span> <span className="mono">{c.age(String(value))} · {c.done}</span>
      </p>
    ) : (
      slider(`${id}:${field}`, label, value, RANGES[field].min, RANGES[field].max, 1, (v) => c.age(String(v)), AGE_MARKS[field])
    )
  const pct = (perMille: number) => formatPct(perMille / 1000, lang, 1)
  // The three scenarios as marks on the track, and — while the thumb moves — the band the value falls in and why it matters
  // (the same words as Hypothèses): the slider says what it is doing, not only where it is.
  const impact = t.assumptions.impact
  const scenarioMarks = (valueOf: (k: 'prudent' | 'neutral' | 'bold') => number): SliderMark[] =>
    (['prudent', 'neutral', 'bold'] as const).map((k) => ({ value: Math.round(valueOf(k) * 1000), label: t.assumptions.presets[k] }))
  const band = (field: 'inflation' | 'returns', kind?: AccountKind) => (perMille: number) => {
    const { level, tilt } = field === 'inflation' ? impactOf('inflation', perMille / 1000) : impactOfReturn(kind!, perMille / 1000)
    const side = level === 'below' ? 'low' : level === 'above' ? 'high' : level
    return <ImpactMeter level={level} tilt={tilt} levelLabel={impact.level[level]} tiltLabel={impact.tilt[tilt]} why={impact.why[field][side]} whyTitle={impact.whyTitle} outside={impact.outside} />
  }
  const spend = (key: SpendKey, label: string) => {
    const now = shown.spending[spendField(key)]
    return (
      <div className="ledger__row">
        {slider(key, label, household.spending[spendField(key)], 10_000, 250_000, 500, (v) => money(v))}
        <p className="ledger__calc">{c.spendCalc(money(now), money(now / 12))}</p>
      </div>
    )
  }

  return (
    <div className="ledger">
      <p className="field-row__hint">{c.hint}</p>
      {/* Two views, one store: these sliders and the Profil / Hypothèses fields write the same profile. */}
      <p className="field-row__hint">{c.sameStore}</p>
      {/* The same frame as the Profil: one column per person, a coloured top bar and the name — whether there is one or two. */}
      <div className={'persons' + (ledger.length > 1 ? ' persons--two' : '')}>
      {ledger.map((l, i) => {
        const was = opened.ledger.find((x) => x.id === l.id)!
        const name = names[i] ?? ''
        const p = household.persons[i]
        return (
          <section key={l.id} className={`ledger__person person who who--${Math.min(i, 1)}`} aria-label={c.person(name)}>
            <h3 className="year-table__title">{c.person(name)}</h3>
            <Chip to={`/?person=${l.id}`} ariaLabel={`${c.editProfile} : ${name}`}>{c.editProfile}</Chip>
            <div className="ledger__row">
              {ageSlider(l.id, 'retirement', c.retireLabel, p.retirementAge, l.retirement.done)}
              <p className="ledger__calc">{c.retireCalc(monthYear(l.retirement.leaving))}</p>
            </div>
            <div className="ledger__row">
              {ageSlider(l.id, 'rrq', c.rrqLabel, p.rrq.startAge, l.rrq.done)}
              <p className="ledger__result">
                {c.rrqResult(money(l.rrq.monthlyToday))} <span className="ledger__delta">{delta(l.rrq.monthlyToday, was.rrq.monthlyToday, c.moreMonth, c.lessMonth)}</span>
              </p>
              <p className="ledger__calc">{c.rrqCalc(monthYear(l.rrq.start), money(l.rrq.base, true), money(l.rrq.additionalFirst, true), money(l.rrq.additionalSecond, true), formatPct(l.rrq.adjustment, lang, 1), money(l.rrq.monthly, true))}</p>
            </div>
            <div className="ledger__row">
              {ageSlider(l.id, 'oas', c.oasLabel, p.oas.startAge, l.oas.done)}
              <p className="ledger__result">
                {c.oasResult(money(l.oas.monthlyToday))} <span className="ledger__delta">{delta(l.oas.monthlyToday, was.oas.monthlyToday, c.moreMonth, c.lessMonth)}</span>
              </p>
              <p className="ledger__calc">
                {l.oas.monthly > 0 ? c.oasCalc(monthYear(l.oas.start), money(l.oas.full, true), formatPct(l.oas.residence, lang, 0), formatPct(l.oas.multiplier - 1, lang, 1), money(l.oas.monthly, true)) : c.oasNone(monthYear(l.oas.start))}
              </p>
            </div>
          </section>
        )
      })}
      </div>

      <section className="ledger__person" aria-label={c.moneyTitle}>
        <h3 className="year-table__title">{c.moneyTitle}</h3>
        <Chip to="/hypotheses">{c.editAssumptions}</Chip>
        {spend('spend:workingToday', c.spendWorkLabel)}
        {spend('spend:retiredToday', c.spendRetLabel)}
        <div className="ledger__row">
          {slider('inflation', c.inflationLabel, Math.round(assumptions.inflation * 1000), 0, 60, 1, pct, scenarioMarks((k) => ASSUMPTION_PRESETS[k].inflation), band('inflation'))}
          <p className="ledger__calc">{c.inflationCalc(pct(Math.round(shownA.inflation * 1000)), money(1000 * (1 + shownA.inflation) ** 10))}</p>
        </div>
        {KINDS.map((kind) => (
          <div key={kind} className="ledger__row">
            {slider(`return:${kind}`, c.returnLabel[kind], Math.round(assumptions.returns[kind] * 1000), 0, 120, 1, pct, scenarioMarks((k) => ASSUMPTION_PRESETS[k].returns[kind]), band('returns', kind))}
            <p className="ledger__calc">{c.returnCalc(pct(Math.round(shownA.returns[kind] * 1000)), formatPct((1 + shownA.returns[kind]) / (1 + shownA.inflation) - 1, lang, 1))}</p>
          </div>
        ))}
      </section>

      <p className={'ledger__glance' + (glance.ok ? '' : ' scenario__verdict--short')} aria-live="polite">
        {glance.ok ? c.glanceHolds(money(glance.netWorthEnd)) : c.glanceFails(formatYearAge(glance.firstShortfallYear!, shown.persons.map((p) => p.birth.year), lang))} {worthDelta}
      </p>
      <p className="field-row__hint">{c.glanceNote}</p>
    </div>
  )
}
