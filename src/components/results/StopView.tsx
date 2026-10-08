import { useLang } from '../../i18n'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { formatPct, formatYearAge } from '../../lib/format'
import type { StopWorking } from '../../lib/stopWorking'

// « When can I stop working? » — the verdict's age, put in dates: the year each person reaches it, how much of the
// first year of retirement the pensions cover by themselves (or that none has begun yet), how much they cover once
// every one of them is in pay, and from when they cover all of it (lib/stopWorking.ts).
// A VIEW of the verdict, not a second verdict: the age itself is said once, in the headline.

export function StopView({ names, births, stop }: { names: readonly string[]; births: readonly number[]; stop: StopWorking }) {
  const { lang } = useLang()
  const q = RESULTS_COPY[lang].questions.stop
  const pct = (share: number) => formatPct(Math.min(1, share), lang, 0)
  const at = (year: number) => formatYearAge(year, births, lang)
  return (
    <div className="surface answer">
      <ul className="answer__list">
        {stop.years.map((y, i) => (
          <li key={y.id}>{q.when(names[i] ?? '', formatYearAge(y.year, births[i] === undefined ? [] : [births[i]], lang))}</li>
        ))}
        <li>{stop.pensionsStarted ? q.share(pct(stop.pensionShare), at(stop.firstYear)) : q.shareNone(at(stop.firstYear))}</li>
        {stop.allStarted !== null && <li>{q.shareAll(pct(stop.allStarted.share), at(stop.allStarted.year))}</li>}
        <li>{stop.pensionsCoverFrom === null ? q.neverCovers : q.coversFrom(at(stop.pensionsCoverFrom))}</li>
      </ul>
    </div>
  )
}
