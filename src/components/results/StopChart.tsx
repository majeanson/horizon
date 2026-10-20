import { lazy, Suspense } from 'react'
import { useLang } from '../../i18n'
import { stopCoverageSeries, type Dollars } from '../../lib/chartData'
import { formatYearAge } from '../../lib/format'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { Loading } from '../Loading'

const LineChart = lazy(() => import('../charts').then((m) => ({ default: m.LineChart })))

// « Quand arrêter », in a picture: under the answer's dates (« En dates »), the pensions after tax against the spending, each full year of retirement
// (lib/stopWorking.ts `coverage`, lib/chartData.ts `stopCoverageSeries`). Where the pensions line meets the spending line, they carry it alone; the gap
// below is what the savings pay. In the page's dollars (today's or each year's), like the main chart. The dates list above is its text.
export function StopChart({
  coverage,
  dollars,
  todayYear,
  inflation,
  births,
}: {
  coverage: readonly { year: number; pensions: number; spending: number }[]
  dollars: Dollars
  todayYear: number
  inflation: number
  births: readonly number[]
}) {
  const { lang } = useLang()
  const c = RESULTS_COPY[lang].questions.stop
  const series = stopCoverageSeries(coverage, { dollars, todayYear, inflation, labels: { pensions: c.seriesPensions, spending: c.seriesSpending } })
  const first = coverage[0].year
  const last = coverage[coverage.length - 1].year
  // A year is always said with its age: the axis carries the first person's, the tooltip everyone's.
  const firstBirth = births[0]
  return (
    <>
      <p className="field-row__hint">{c.chartHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <LineChart
            series={series}
            yFormat={(y) => formatCompactMoney(y, lang)}
            yDetail={(y) => formatMoney(y, lang)}
            xTitle={(year) => formatYearAge(year, births, lang)}
            xTick={firstBirth === undefined ? undefined : (year) => [String(year), String(year - firstBirth)]}
            ariaLabel={c.figure(first, last)}
            height={220}
          />
        </Suspense>
      </div>
    </>
  )
}
