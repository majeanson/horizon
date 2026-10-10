import type { Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { CARE_AMOUNT_MAX, CARE_AMOUNT_MIN, CARE_AMOUNT_STEP, CARE_FROM_MAX, CARE_FROM_MIN, CARE_START, CARE_YEARS_MAX, CARE_YEARS_MIN, careFlow, oldestBirthYear, sameCare, type Care } from '../../lib/careModel'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { formatYearAge } from '../../lib/format'
import { FUTURE_COPY } from '../../lib/futureCopy'
import { LIFE_COPY } from '../../lib/lifeCopy'
import { addFlow } from '../../lib/profileLife'
import { MAX_FLOWS } from '../../lib/schema'
import { updateProfile } from '../../lib/store'
import { useNotice } from '../../lib/toast'
import { useCareEarliest } from '../../lib/useCareEarliest'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { Skeleton } from '../Skeleton'
import { Slider } from '../Slider'

// « And if the last years cost more? » Three sliders — what it costs a year, from what age, for how long — and the plan back with that
// cost added: the earliest age that then works against the verdict's own, what the plan leaves at its horizon, and whether stopping at
// the verdict's age still lasts. A what-if: the care lives in the address (`?care=`), never in the profile, until the person adds it —
// then it becomes a dated expense on Profil (the same one the « Soins en fin de vie » chip makes) and the whole page follows.

export function CareView({
  household,
  assumptions,
  care,
  onCare,
  earliest,
  age,
  maxAge,
}: {
  household: Household
  assumptions: Assumptions
  /** The care on the sliders. */
  care: Care
  /** A slider was released: the new care, or null when it is back on the starting figures. */
  onCare: (care: Care | null) => void
  /** The verdict's age with no care (null: no age works). */
  earliest: number | null
  /** The age the plan is read at for « what is left »: the verdict's, or the plan's own when none works. */
  age: number
  maxAge: number
}) {
  const { lang } = useLang()
  const c = FUTURE_COPY[lang].care
  const notice = useNotice()
  const answer = useCareEarliest(household, assumptions, care, age, true)
  const a = answer.value
  const busy = answer.busy
  const money = (n: number) => formatMoney(n, lang)
  const births = household.persons.map((p) => p.birth.year)
  const label = LIFE_COPY[lang].flows.starters.care
  const flows = household.flows ?? []
  const full = flows.length >= MAX_FLOWS
  const alreadyThere = flows.some((f) => f.kind === 'expense' && f.label === label)
  const change = (patch: Partial<Care>) => {
    const next = { ...care, ...patch }
    onCare(sameCare(next, CARE_START) ? null : next)
  }
  const keep = () => {
    updateProfile((p) => addFlow(p, careFlow(household, care, label)))
    onCare(null)
    notice(c.kept)
  }

  const earliestLine =
    a === null
      ? null
      : a.earliest === null
        ? c.none(maxAge)
        : earliest !== null && a.earliest > earliest
          ? c.later(c.yearsOf(a.earliest - earliest), a.earliest, earliest)
          : a.now
            ? c.sameNow
            : c.same(a.earliest)
  const worthGap = a === null ? 0 : a.worthWithout - a.worthWith

  return (
    <div className="surface answer" aria-live={busy ? 'off' : 'polite'} aria-busy={busy}>
      <Slider label={c.amount} value={care.amount} min={Math.min(CARE_AMOUNT_MIN, care.amount)} max={Math.max(CARE_AMOUNT_MAX, care.amount)} step={CARE_AMOUNT_STEP} valueText={money} onCommit={(v) => change({ amount: v })} />
      <Slider label={c.fromAge} value={care.fromAge} min={CARE_FROM_MIN} max={CARE_FROM_MAX} valueText={c.age} onCommit={(v) => change({ fromAge: v })} />
      <Slider label={c.years} value={care.years} min={CARE_YEARS_MIN} max={CARE_YEARS_MAX} valueText={c.yearsOf} onCommit={(v) => change({ years: v })} />
      <p className="field-row__hint">{c.hint}</p>
      <p className="answer__note">{c.starts(formatYearAge(oldestBirthYear(household) + care.fromAge, births, lang))}</p>
      {busy && a !== null && (
        <p className="bridge__updating" role="status">
          {c.updating}
        </p>
      )}
      {a === null ? (
        <Skeleton count={3} />
      ) : (
        <>
          <p className="answer__big">{earliestLine}</p>
          {a.ok ? <p className="answer__note">{c.holds(a.age)}</p> : <p className="answer__note">{c.short(a.age, a.firstShortfallYear === null ? '' : formatYearAge(a.firstShortfallYear, births, lang))}</p>}
          {worthGap >= 1000 && <p className="answer__note">{c.leaves(formatCompactMoney(Math.max(0, a.worthWith), lang), formatCompactMoney(a.worthWithout, lang))}</p>}
        </>
      )}
      {alreadyThere && <p className="answer__note">{c.already}</p>}
      <Cluster>
        {full ? (
          <p className="field-row__hint">{c.full(MAX_FLOWS)}</p>
        ) : (
          <Chip icon="check-bold" onClick={keep}>
            {c.keep}
          </Chip>
        )}
      </Cluster>
      <p className="answer__note">{c.caveat}</p>
    </div>
  )
}
