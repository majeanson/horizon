import type { EarliestEach } from '../../engine/retireAt'
import type { Household } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import type { Headline } from '../../lib/headline'
import { formatPct } from '../../lib/format'
import type { StopWorking } from '../../lib/stopWorking'

// « When can I stop working? » — the earliest age, put in dates: the year each person reaches it, how much of the first
// year of retirement the pensions cover by themselves, and from when they cover all of it (lib/stopWorking.ts).

export function StopView({
  household,
  names,
  headline,
  stop,
  each,
  maxAge,
}: {
  household: Household
  names: readonly string[]
  headline: Headline
  stop: StopWorking | null
  each: EarliestEach[] | null
  maxAge: number
}) {
  const t = useT()
  const { lang } = useLang()
  const q = t.results.questions.stop
  const couple = household.persons.length === 2
  if (headline.kind === 'none' || stop === null || headline.age === null) {
    return (
      <div className="surface answer" aria-live="polite">
        <p className="answer__big answer__big--short">{t.results.verdict.headline.none(maxAge)}</p>
        <p className="answer__note">{t.results.verdict.headline.tryThis}</p>
      </div>
    )
  }
  return (
    <div className="surface answer" aria-live="polite">
      <p className="answer__big">{headline.kind === 'now' ? t.results.verdict.headline.now : q.age(headline.age, couple)}</p>
      <ul className="answer__list">
        {stop.years.map((y, i) => (
          <li key={y.id}>{q.when(names[i] ?? '', y.year)}</li>
        ))}
        <li>{q.share(formatPct(Math.min(1, stop.pensionShare), lang, 0), stop.firstYear)}</li>
        <li>{stop.pensionsCoverFrom === null ? q.neverCovers : q.coversFrom(stop.pensionsCoverFrom)}</li>
      </ul>
      {couple && each && (
        <p className="answer__note">
          {t.results.verdict.headline.separately}{' '}
          {each
            .filter((a) => a.other)
            .map((a) => {
              const name = names[household.persons.findIndex((p) => p.id === a.id)] ?? ''
              const other = names[household.persons.findIndex((p) => p.id === a.other!.id)] ?? ''
              return a.earliestOk === null ? t.results.verdict.each.none(name, maxAge, other, a.other!.heldAt) : t.results.verdict.each.line(name, a.earliestOk, other, a.other!.heldAt)
            })
            .join(' · ')}
        </p>
      )}
      <p className="answer__note">{t.results.verdict.caveat}</p>
    </div>
  )
}
