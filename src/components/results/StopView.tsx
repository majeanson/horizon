import { useLang } from '../../i18n'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { formatPct, formatYearAge } from '../../lib/format'
import type { StopWorking } from '../../lib/stopWorking'

// « When can I stop working? » — the verdict's age, put in dates: the year each person reaches it, how much of the
// first year of retirement the pensions cover by themselves, and from when they cover all of it (lib/stopWorking.ts).
// A VIEW of the verdict, not a second verdict: the age itself is said once, in the headline.

export function StopView({ names, births, stop }: { names: readonly string[]; births: readonly number[]; stop: StopWorking }) {
  const { lang } = useLang()
  const q = RESULTS_COPY[lang].questions.stop
  return (
    <div className="surface answer">
      <ul className="answer__list">
        {stop.years.map((y, i) => (
          <li key={y.id}>{q.when(names[i] ?? '', formatYearAge(y.year, births[i] === undefined ? [] : [births[i]], lang))}</li>
        ))}
        <li>{q.share(formatPct(Math.min(1, stop.pensionShare), lang, 0), formatYearAge(stop.firstYear, births, lang))}</li>
        <li>{stop.pensionsCoverFrom === null ? q.neverCovers : q.coversFrom(formatYearAge(stop.pensionsCoverFrom, births, lang))}</li>
      </ul>
    </div>
  )
}
