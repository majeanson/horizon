import type { Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatMoney } from '../../lib/money'
import { setSpending } from '../../lib/profileEdit'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { SPEND_MAX, SPEND_MIN, SPEND_STEP } from '../../lib/spendModel'
import { updateProfile } from '../../lib/store'
import { useNotice } from '../../lib/toast'
import { useSpendEarliest } from '../../lib/useSpendEarliest'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { Skeleton } from '../Skeleton'
import { Slider } from '../Slider'

// « And if we spent less? » One slider — what the household spends once retired — and the verdict's age back for that amount,
// set against the age the profile's own spending gives. A what-if: the amount lives in the address (`?spend=`), never in the
// profile, until the person keeps it — then it is written where Hypothèses writes it and the whole page follows. At the
// profile's own amount the answer IS the verdict above, so nothing is recomputed.

export function SpendView({
  household,
  assumptions,
  spend,
  onSpend,
  earliest,
  now,
  maxAge,
}: {
  household: Household
  assumptions: Assumptions
  /** The amount on the slider (today's dollars a year). */
  spend: number
  /** The slider was released: the new amount, or null when it is back on the profile's own. */
  onSpend: (spend: number | null) => void
  /** The verdict's age at the profile's own spending (null: no age works). */
  earliest: number | null
  /** The verdict's answer is « dès maintenant » (stopping today works). */
  now: boolean
  maxAge: number
}) {
  const { lang } = useLang()
  const q = RESULTS_COPY[lang].questions.spend
  const notice = useNotice()
  const current = household.spending.retiredToday
  const isCurrent = spend === current
  const answer = useSpendEarliest(household, assumptions, spend, !isCurrent)
  // undefined: not worked out yet (a skeleton); null: no age up to 70 works.
  const age: number | null | undefined = isCurrent ? earliest : answer.value ? answer.value.earliest : undefined
  const busy = !isCurrent && answer.busy
  // « Dès maintenant » rather than the first age tried: today already works, so there is nothing to wait for.
  const rightNow = isCurrent ? now : (answer.value?.now ?? false)
  const money = (n: number) => formatMoney(n, lang)
  const keep = () => {
    updateProfile((p) => setSpending(p, { retiredToday: spend }))
    onSpend(null)
    notice(q.kept)
  }
  const delta =
    age === undefined || age === null || earliest === null
      ? null
      : age < earliest
        ? q.earlier(q.years(earliest - age), money(current))
        : age > earliest
          ? q.later(q.years(age - earliest), money(current))
          : q.sameAge(money(current))

  return (
    <div className="surface answer" aria-live={busy ? 'off' : 'polite'} aria-busy={busy}>
      <Slider
        label={q.label}
        value={spend}
        min={Math.min(SPEND_MIN, spend)}
        max={Math.max(SPEND_MAX, spend)}
        step={SPEND_STEP}
        valueText={money}
        onCommit={(v) => onSpend(v === current ? null : v)}
      />
      <p className="field-row__hint">{q.hint}</p>
      {busy && age !== undefined && (
        <p className="bridge__updating" role="status">
          {q.updating}
        </p>
      )}
      {/* At the profile's own amount the answer IS the one at the top of the page: say so and invite the slide, instead of
          printing the same age a third time. */}
      {isCurrent ? (
        <p className="answer__note">
          {q.sameAmount} {q.current}
        </p>
      ) : age === undefined ? (
        <Skeleton count={2} />
      ) : age === null ? (
        <p className="answer__big answer__big--short">{q.none(money(spend), maxAge)}</p>
      ) : (
        <p className="answer__big">{rightNow ? q.now(money(spend)) : q.at(money(spend), age)}</p>
      )}
      <p className="answer__note">{q.perMonth(money(spend / 12))}</p>
      {!isCurrent && (
        <>
          {delta !== null && <p className="answer__note">{delta}</p>}
          <Cluster>
            <Chip icon="check-bold" onClick={keep}>
              {q.keep}
            </Chip>
          </Cluster>
        </>
      )}
      <p className="answer__note">{q.caveat}</p>
    </div>
  )
}
