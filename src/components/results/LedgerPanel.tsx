import { useMemo, useState } from 'react'
import { agesLedger, planGlance } from '../../engine/ledger'
import type { Assumptions, Household, PersonId } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatPct } from '../../lib/format'
import { LEDGER_COPY } from '../../lib/ledgerCopy'
import { formatMoney } from '../../lib/money'
import { mapPerson } from '../../lib/profileEdit'
import { MAX_AGE, MIN_AGE } from '../../lib/resultsModel'
import { updateProfile } from '../../lib/store'
import { Slider } from '../Slider'

// « Mes données et leur calcul »: the three ages a person sets — when the pay stops, when the QPP starts, when the OAS
// starts — each with the calculation it triggers and the amount it becomes, and what the plan does as the slider moves.
// An age is saved in the profile when the slider is released (the same place Profil edits), and the verdict above, which
// reads the profile, follows. While the thumb moves, the panel previews from ONE projection on a copy of the household.

type Field = 'retirement' | 'rrq' | 'oas'
type Preview = Partial<Record<`${PersonId}:${Field}`, number>>

const RANGES = { retirement: { min: MIN_AGE, max: MAX_AGE }, rrq: { min: 60, max: 72 }, oas: { min: 65, max: 70 } } as const

const withAge = (h: Household, id: PersonId, field: Field, age: number): Household => ({
  ...h,
  persons: h.persons.map((p) => (p.id !== id ? p : field === 'retirement' ? { ...p, retirementAge: age } : field === 'rrq' ? { ...p, rrq: { ...p.rrq, startAge: age } } : { ...p, oas: { ...p.oas, startAge: age } })),
})

const monthYear = (ym: { year: number; month: number }) => `${String(ym.month).padStart(2, '0')}/${ym.year}`

export function LedgerPanel({ household, assumptions, names }: { household: Household; assumptions: Assumptions; names: readonly string[] }) {
  const { lang } = useLang()
  const c = LEDGER_COPY[lang]
  const [preview, setPreview] = useState<Preview>({})

  // What the page would be if the sliders were where they are being held.
  const shown = useMemo(() => {
    let h = household
    for (const [key, age] of Object.entries(preview)) {
      const [id, field] = key.split(':') as [PersonId, Field]
      h = withAge(h, id, field, age)
    }
    return h
  }, [household, preview])

  const ledger = useMemo(() => agesLedger(shown, assumptions), [shown, assumptions])
  const glance = useMemo(() => planGlance(shown, assumptions), [shown, assumptions])
  // The figures when the panel opened: « what did this change » is read against them.
  const [opened] = useState(() => ({ ledger: agesLedger(household, assumptions), glance: planGlance(household, assumptions) }))

  const money = (n: number, cents = false) => formatMoney(n, lang, { cents })
  const change = (id: PersonId, field: Field, age: number) => {
    setPreview((p) => {
      const { [`${id}:${field}` as const]: _gone, ...rest } = p
      return rest
    })
    updateProfile((p) => mapPerson(p, id, (x) => (field === 'retirement' ? { ...x, retirementAge: age } : field === 'rrq' ? { ...x, rrq: { ...x.rrq, startAge: age } } : { ...x, oas: { ...x.oas, startAge: age } })))
  }
  const delta = (now: number, was: number, more: (a: string) => string, less: (a: string) => string) => {
    const d = Math.round(now - was)
    return d === 0 ? null : d > 0 ? more(money(d)) : less(money(-d))
  }
  const worthDelta = delta(glance.netWorthEnd, opened.glance.netWorthEnd, c.glanceMore, c.glanceLess)

  return (
    <div className="ledger">
      <p className="field-row__hint">{c.hint}</p>
      {ledger.map((l, i) => {
        const was = opened.ledger.find((x) => x.id === l.id)!
        const name = names[i] ?? ''
        const slider = (field: Field, label: string, value: number) => (
          <Slider
            label={label}
            value={value}
            min={Math.min(RANGES[field].min, value)}
            max={Math.max(RANGES[field].max, value)}
            valueText={(v) => c.age(String(v))}
            onPreview={(v) => setPreview((p) => ({ ...p, [`${l.id}:${field}`]: v }))}
            onCommit={(v) => change(l.id, field, v)}
          />
        )
        const p = household.persons[i]
        return (
          <section key={l.id} className="ledger__person" aria-label={c.person(name)}>
            {household.persons.length > 1 && <h3 className="year-table__title">{c.person(name)}</h3>}
            <div className="ledger__row">
              {slider('retirement', c.retireLabel, p.retirementAge)}
              <p className="ledger__calc">{c.retireCalc(monthYear(l.retirement.leaving))}</p>
            </div>
            <div className="ledger__row">
              {slider('rrq', c.rrqLabel, p.rrq.startAge)}
              <p className="ledger__calc">{c.rrqCalc(monthYear(l.rrq.start), money(l.rrq.base, true), money(l.rrq.additionalFirst, true), money(l.rrq.additionalSecond, true), formatPct(l.rrq.adjustment, lang, 1), money(l.rrq.monthly, true))}</p>
              <p className="ledger__result">
                {c.rrqResult(money(l.rrq.monthlyToday))}{' '}
                <span className="ledger__delta">{delta(l.rrq.monthlyToday, was.rrq.monthlyToday, c.moreMonth, c.lessMonth)}</span>
              </p>
            </div>
            <div className="ledger__row">
              {slider('oas', c.oasLabel, p.oas.startAge)}
              <p className="ledger__calc">
                {l.oas.monthly > 0 ? c.oasCalc(monthYear(l.oas.start), money(l.oas.full, true), formatPct(l.oas.residence, lang, 0), formatPct(l.oas.multiplier - 1, lang, 1), money(l.oas.monthly, true)) : c.oasNone(monthYear(l.oas.start))}
              </p>
              <p className="ledger__result">
                {c.oasResult(money(l.oas.monthlyToday))}{' '}
                <span className="ledger__delta">{delta(l.oas.monthlyToday, was.oas.monthlyToday, c.moreMonth, c.lessMonth)}</span>
              </p>
            </div>
          </section>
        )
      })}
      <p className={'ledger__glance' + (glance.ok ? '' : ' scenario__verdict--short')} aria-live="polite">
        {glance.ok ? c.glanceHolds(money(glance.netWorthEnd)) : c.glanceFails(String(glance.firstShortfallYear))} {worthDelta}
      </p>
      <p className="field-row__hint">{c.glanceNote}</p>
      <p className="field-row__hint">{c.edits}</p>
    </div>
  )
}
