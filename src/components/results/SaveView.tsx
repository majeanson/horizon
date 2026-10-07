import type { Assumptions, Household } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import { formatMoney } from '../../lib/money'
import { useSavingsNeeded } from '../../lib/useSavingsNeeded'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { Skeleton } from '../Skeleton'

// « How much should I put aside to retire at X? » One age to choose, one number back: the yearly amount to move from
// spending (while working) into saving so the plan lasts, from engine/savingsNeeded.ts, computed in a worker.

export function SaveView({
  household,
  assumptions,
  age,
  onAge,
  minAge,
  maxAge,
}: {
  household: Household
  assumptions: Assumptions
  age: number
  onAge: (age: number) => void
  minAge: number
  maxAge: number
}) {
  const t = useT()
  const { lang } = useLang()
  const q = t.results.questions.save
  const answer = useSavingsNeeded(household, assumptions, age, true)
  const saving = household.persons.reduce((s, p) => s + p.accounts.rrsp.annualContribution + p.accounts.tfsa.annualContribution + p.accounts.nonReg.annualContribution, 0)
  return (
    <div className="surface answer" aria-live="polite" aria-busy={answer === null}>
      <FieldRow label={q.age}>
        {(w) => <NumberField kind="int" min={minAge} max={maxAge} unit={t.fields.years} value={age} onChange={onAge} id={w.id} />}
      </FieldRow>
      {answer === null ? (
        <Skeleton count={2} />
      ) : answer.extraPerYear === null ? (
        <>
          <p className="answer__big answer__big--short">{q.unreachable(age)}</p>
          <p className="answer__note">{q.unreachableWhy}</p>
        </>
      ) : answer.extraPerYear === 0 ? (
        <>
          <p className="answer__big">{q.nothing(age)}</p>
          <p className="answer__note">{q.nothingWhy}</p>
        </>
      ) : (
        <>
          <p className="answer__big">{q.amount(formatMoney(answer.extraPerYear, lang))}</p>
          <p className="answer__note">{q.perMonth(formatMoney(answer.extraPerYear / 12, lang))}</p>
          <p className="answer__note">{q.why(age)}</p>
        </>
      )}
      {saving > 0 && <p className="answer__note">{q.already(formatMoney(saving, lang))}</p>}
      <p className="answer__note">{q.caveat}</p>
    </div>
  )
}
