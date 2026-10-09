import { useMemo } from 'react'
import { useLang } from '../../i18n'
import { formatMoney } from '../../lib/money'
import { PLANS_COPY } from '../../lib/plansCopy'
import { MAX_AGE, assumptionsOf } from '../../lib/resultsModel'
import type { Profile } from '../../lib/schema'
import { today } from '../../lib/today'
import { usePlansCompare } from '../../lib/usePlansCompare'
import { Skeleton } from '../Skeleton'

// « Mes plans, côte à côte »: the plan on screen and every plan kept under a name, each with the answer it gives — the earliest age that
// works, and what that age can fund each month — and how far it is from the plan on screen. The same searches the answer runs, in a
// worker; shown only when at least one plan has been kept (a comparison needs two).
export function PlansCompare({ profile, enabled }: { profile: Profile; enabled: boolean }) {
  const { lang } = useLang()
  const c = PLANS_COPY[lang].compare
  const { year, month } = today()
  const questions = useMemo(
    () => [
      { name: c.current, household: profile.household, assumptions: assumptionsOf(profile, { year, month }) },
      ...profile.plans.map((p) => ({ name: p.name, household: p.profile.household, assumptions: assumptionsOf(p.profile, { year, month }) })),
    ],
    [profile, c.current, year, month],
  )
  const answers = usePlansCompare(questions, enabled && profile.plans.length > 0)
  if (profile.plans.length === 0) return null
  const base = answers?.[0]
  const said = (a: { earliest: number | null; nowOk: boolean }) => (a.earliest === null ? c.none(MAX_AGE) : a.nowOk ? c.now : c.at(a.earliest))
  return (
    <div className="verdict__range" aria-busy={answers === undefined}>
      <p className="verdict__range-title">{c.title}</p>
      {answers === undefined ? (
        <Skeleton count={Math.min(3, questions.length)} className="skeleton--chip-rows" />
      ) : (
        <ul className="levers__list">
          {answers.map((a, i) => {
            const against = i > 0 && base !== undefined && a.earliest !== null && base.earliest !== null && a.earliest !== base.earliest ? (a.earliest < base.earliest ? c.earlier(base.earliest - a.earliest) : c.later(a.earliest - base.earliest)) : null
            return (
              <li key={`${i}:${a.name}`} className="levers__item">
                <span>
                  <strong>{a.name}</strong>
                </span>
                <span className="mono levers__result">
                  {said(a)}
                  {a.comfort != null && <span className="levers__end">{c.monthly(formatMoney(Math.round(a.comfort / 12 / 10) * 10, lang))}</span>}
                  {against !== null && <span className="levers__end">{against}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <p className="verdict__note">{c.hint}</p>
    </div>
  )
}
