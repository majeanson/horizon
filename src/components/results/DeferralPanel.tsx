import { useState } from 'react'
import type { PersonDeferral, StartOption } from '../../engine/deferral'
import type { Assumptions, Household, PersonId } from '../../engine/types'
import { useLang } from '../../i18n'
import { DEFERRAL_COPY } from '../../lib/deferralCopy'
import { formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { useDeferral } from '../../lib/useDeferral'
import { Skeleton } from '../Skeleton'
import { SubTabs } from '../SubTabs'

// « Quand commencer ma rente ? » — for each person, what starting the QPP pension (60 · 65 · 70 · 72) and the OAS (65 · 70)
// at each age does: the monthly amount, how it compares with 65, when the choice has paid for itself, and what it does
// to the plan (engine/deferral.ts). It sits behind a disclosure and starts computing — in a worker — only when opened.
// Below the numbers, the case for and against deferring in plain words, and what the numbers leave out.

function OptionsTable({
  title,
  options,
  current,
}: {
  title: string
  options: StartOption[]
  /** The start age in the person's profile, flagged « votre plan actuel ». */
  current: number
}) {
  const { lang } = useLang()
  const d = DEFERRAL_COPY[lang]
  const money = (n: number | null) => (n === null ? d.noWorth : formatMoney(n, lang))
  const versus = (o: StartOption) => (o.age === 65 ? d.versusSame : o.versus65 >= 0 ? d.versusMore(formatPct(o.versus65, lang, 1)) : d.versusLess(formatPct(-o.versus65, lang, 1)))
  const breakEven = (o: StartOption) =>
    o.age === 65 ? d.breakEvenSelf : o.breakEven === null ? d.breakEvenNone : o.age < 65 ? d.breakEvenEarlier(o.breakEven) : d.breakEvenLater(o.breakEven)
  return (
    <div className="table-wrap deferral__table" role="region" aria-label={title} tabIndex={0}>
      <table>
        <caption className="sensitivity__caption">{title}</caption>
        <thead>
          <tr>
            <th scope="col">{d.colStart}</th>
            <th scope="col">{d.colMonthly}</th>
            <th scope="col">{d.colVersus}</th>
            <th scope="col">{d.colBreakEven}</th>
            <th scope="col">{d.colPlan}</th>
            <th scope="col">{d.colEarliest}</th>
            <th scope="col">{d.colWorth85}</th>
            <th scope="col">{d.colWorth95}</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => (
            <tr key={o.age} className={o.age === current ? 'deferral__row--yours' : undefined}>
              <th scope="row">
                {d.age(o.age)}
                {o.age === current && <span className="mono deferral__yours"> · {d.yours}</span>}
              </th>
              <td>{money(o.monthly)}</td>
              <td>{versus(o)}</td>
              <td>{breakEven(o)}</td>
              <td>{o.plan.ok ? d.works : d.fails(o.plan.firstShortfallYear ?? 0)}</td>
              <td>{d.earliest(o.plan.earliestOk)}</td>
              <td>{money(o.plan.netWorth85)}</td>
              <td>{money(o.plan.netWorth95)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DeferralPanel({ household, assumptions, names }: { household: Household; assumptions: Assumptions; names: readonly string[] }) {
  const { lang } = useLang()
  const d = DEFERRAL_COPY[lang]
  const view = useDeferral(household, assumptions)
  const [who, setWho] = useState<PersonId>(household.persons[0].id)
  const person: PersonDeferral | undefined = view?.persons.find((p) => p.id === who) ?? view?.persons[0]
  return (
    <div className="deferral" aria-busy={view === null}>
      <p className="field-row__hint">{d.hint}</p>
      {household.persons.length > 1 && (
        <SubTabs
          ariaLabel={d.person}
          value={who}
          onSelect={setWho}
          options={household.persons.map((p, i) => ({ key: p.id, label: names[i] ?? '' }))}
        />
      )}
      {view === null || person === undefined ? (
        <Skeleton count={3} />
      ) : (
        <>
          <OptionsTable title={d.rrqTitle} options={person.rrq} current={person.current.rrq} />
          <OptionsTable title={d.oasTitle} options={person.oas} current={person.current.oas} />
          <h3 className="deferral__title">{d.whyTitle}</h3>
          <ul className="deferral__list">
            <li>{d.whyLead(formatPct(view.facts.rrqLateMax, lang, 1), formatPct(view.facts.oasLateMax, lang, 0))}</li>
            {d.why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3 className="deferral__title">{d.againstTitle}</h3>
          <ul className="deferral__list">
            {d.against.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="field-row__hint">{d.caveat}</p>
        </>
      )}
    </div>
  )
}
