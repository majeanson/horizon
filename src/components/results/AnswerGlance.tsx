import { CARDS_COPY } from '../../lib/cardsCopy'
import type { ResultsModel } from '../../lib/useResultsPage'

// « En un coup d’œil » — three tiles under the sentence of the answer: when to start, how long the money lasts, and the monthly margin the plan has against what it is asked to fund. They say nothing the card
// does not already say in sentences; they let the eye take the three things in before it reads. Shown only for an answer that holds (an age, or « dès maintenant »): when no age works, the card's
// nudge to try something is the whole message. The margin is the plan's own funded spending (`comfort`, lib/answer.ts) against the retired spending the profile asks for, rounded to ten dollars a month.

export function AnswerGlance({ m }: { m: ResultsModel }) {
  const { lang, rc, headline, retiredNow, retiredGlance, assumptions, profile, comfort, money } = m
  const c = CARDS_COPY[lang].glance
  if (retiredNow || retiredGlance || headline.kind === 'none') return null
  const ten = (yearly: number) => Math.round(yearly / 12 / 10) * 10
  const asked = ten(profile.household.spending.retiredToday)
  const funds = comfort == null ? null : ten(comfort)
  const margin = funds === null ? null : funds - asked
  const signed = (n: number) => (n >= 0 ? '+' : '−') + money(Math.abs(n))
  return (
    <ul className="glance" aria-label={c.label}>
      <li className="glance__tile">
        <span className="glance__name">{c.start}</span>
        <strong className="glance__value">{headline.age === null ? c.now : rc.headline.ageText(headline.age)}</strong>
      </li>
      <li className="glance__tile">
        <span className="glance__name">{c.lasts}</span>
        <strong className="glance__value">{c.holdsTo(assumptions.horizonAge)}</strong>
      </li>
      <li className="glance__tile">
        <span className="glance__name">{c.margin}</span>
        <strong className={'glance__value mono' + (margin !== null && margin < 0 ? ' is-short' : '')}>{margin === null ? c.noFigure : signed(margin)}</strong>
        {funds !== null && <span className="glance__sub">{c.fundsOf(money(funds), money(asked))}</span>}
      </li>
    </ul>
  )
}
