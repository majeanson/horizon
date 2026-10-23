import { lazy, Suspense, useMemo } from 'react'
import { useParamChoice } from '../../lib/useParamChoice'
import { useLang } from '../../i18n'
import { marginalWeather, weatherSummary } from '../../lib/marginalWeather'
import { MARGINAL_WEATHER_COPY } from '../../lib/marginalWeatherCopy'
import { formatMoney } from '../../lib/money'
import type { ResultsModel } from '../../lib/useResultsPage'
import { Fold } from '../Fold'
import { SkeletonFill } from '../SkeletonShapes'

const StackedBarChart = lazy(() => import('../charts').then((m) => ({ default: m.StackedBarChart })))

// « Le coût d'un dollar de plus, par âge » — the household's own plan, every retired year: what the next RRSP dollar costs (tax, OAS recovery tax, GIS lost), one bar per age, three
// parts stacked, in dollars out of every 100 taken. A fold under the year-by-year table, mounted when opened: the figures are read off the rows the table already holds, so nothing runs
// again, and the chart is only fetched for whoever asks. A real case in one sentence comes first — the percentages of the old calendar were true and told nobody anything.

/** The "real life" case: a thousand dollars more out of the RRSP. */
const EXAMPLE_TAKEN = 1000
/** The scale of the bars: dollars lost out of every hundred taken. */
const PER = 100

export function MarginalWeather({ m }: { m: ResultsModel }) {
  const { lang } = useLang()
  // Open or not is in the address (`?cout=1`), like every controlled fold: a link to the strip opens it.
  const [fold, setFold] = useParamChoice('cout', ['0', '1'] as const, '0')
  const c = MARGINAL_WEATHER_COPY[lang]
  return (
    <Fold summary={c.title} className="marginal-weather" concept="annee" open={fold === '1'} onToggle={(o) => setFold(o ? '1' : '0')} mountOnOpen>
      <Body m={m} />
    </Fold>
  )
}

function Body({ m }: { m: ResultsModel }) {
  // The rates read off the plan's rows, under the assumptions those rows were projected with (useResultsPage `runsAssumptions`).
  const { lang, runs, runsAssumptions: assumptions, runsProfile: profile, names } = m
  const c = MARGINAL_WEATHER_COPY[lang]
  const household = profile.household
  // The household's own plan, not whichever comparison the table above is showing: the question is about the plan one lives.
  const rows = (runs.find((r) => r.selection === 'plan') ?? runs[0])?.result.rows
  const points = useMemo(() => (rows === undefined ? [] : marginalWeather(rows, assumptions, household.persons[0].id, household.livesAlone, household.kidsEffects?.benefits ? (household.children ?? []) : [])), [rows, assumptions, household])
  const summary = weatherSummary(points)
  const data = useMemo(() => points.map((p) => ({ x: p.age, tax: p.tax * PER, oas: p.oasRecovery * PER, gis: p.gisLost * PER, credits: p.creditsLost * PER })), [points])
  if (summary === null) return <p className="answer__note">{c.none}</p>
  const money = (x: number) => formatMoney(x, lang)
  const per = money(PER)
  const lost = (rate: number) => money(rate * PER)
  const lo = summary.lowest.rate
  const hi = summary.highest.rate
  const flat = hi - lo < 0.02
  // The case told in words: the dearest year, or the first when the cost hardly moves.
  const shown = flat ? points[0] : summary.highest
  // Steps exist only where a benefit is touched somewhere: otherwise the bars are the tax bracket alone.
  const benefits = points.some((p) => p.oasRecovery > 0.005 || p.gisLost > 0.005 || p.creditsLost > 0.005)
  // The credits paid NEXT year on this year's income: a fourth part, only when some year loses some.
  const credits = points.some((p) => p.creditsLost > 0.005)
  const name = names[0] ?? ''
  return (
    <div className="marginal-weather__body">
      <p className="field-row__hint">{c.intro}</p>
      <p className="answer__note">{c.example(shown.age, money(EXAMPLE_TAKEN), money(shown.rate * EXAMPLE_TAKEN))} {c.kept(money(EXAMPLE_TAKEN * (1 - shown.rate)))}</p>
      <Suspense fallback={<SkeletonFill />}>
        <StackedBarChart
          data={data}
          series={[
            { id: 'tax', label: c.tax, colour: 'clay' },
            { id: 'oas', label: c.oas, colour: 'sun' },
            { id: 'gis', label: c.gis, colour: 'berry' },
            ...(credits ? [{ id: 'credits', label: c.credits, colour: 'sky' as const }] : []),
          ]}
          yFormat={money}
          yDetail={money}
          xTitle={(x) => `${x}`}
          xTick={(x) => [String(x)]}
          ariaLabel={`${c.caption(name, per)}. ${flat ? c.flat(lost(lo), per) : `${c.lowest(lost(lo), per, summary.lowest.age)} ${c.highest(lost(hi), per, summary.highest.age)}`}`}
          height={260}
        />
      </Suspense>
      <p className="field-row__hint">{c.reading}</p>
      <p className="answer__note">{flat ? c.flat(lost(lo), per) : `${c.lowest(lost(lo), per, summary.lowest.age)} ${c.highest(lost(hi), per, summary.highest.age)}`}</p>
      <p className="field-row__hint">{benefits ? c.steps : c.taxOnly}</p>
      {credits && <p className="field-row__hint">{c.creditsNext}</p>}
      {lo < 0.01 && <p className="field-row__hint">{c.zero}</p>}
      <p className="field-row__hint">{c.who}</p>
    </div>
  )
}
