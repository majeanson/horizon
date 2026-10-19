import { lazy, Suspense, useMemo } from 'react'
import { useParamChoice } from '../../lib/useParamChoice'
import type { FanId } from '../../engine/fan'
import { useLang } from '../../i18n'
import type { SeriesColour } from '../charts'
import { SERIES_CSS } from '../charts/palette'
import { agesByYear as agesOfRuns } from '../../lib/chartMarks'
import { deflator, retirementMarkers } from '../../lib/chartData'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { MARKET_FAN_COPY } from '../../lib/marketFanCopy'
import { deepestDip } from '../../lib/marketFanView'
import { useMarketFan } from '../../lib/useMarketFan'
import type { ResultsModel } from '../../lib/useResultsPage'
import { Fold } from '../Fold'
import { Loading } from '../Loading'
import { Skeleton } from '../Skeleton'

// « Les marchés, année par année » — the household's own plan drawn under five ways the returns could go (engine/fan.ts), as lines of net worth, with a table that says the same in
// text: whether the money lasts, the lowest point and where it ends. A fold under « En bref » of the firmness block, mounted when opened; the five projections run off the page's
// thread (lib/useMarketFan.ts) and only once someone asks. Illustrations, never forecasts: no line carries a probability.

const LineChart = lazy(() => import('../charts').then((m) => ({ default: m.LineChart })))

const COLOUR: Record<FanId, SeriesColour> = { average: 'accent', lower: 'berry', higher: 'sage', badStart: 'clay', lostDecade: 'sky' }

export function MarketFan({ m }: { m: ResultsModel }) {
  const { lang } = useLang()
  // Open or not is in the address (`?marches=1`), like every controlled fold: a link to the markets opens them.
  const [fold, setFold] = useParamChoice('marches', ['0', '1'] as const, '0')
  return (
    <Fold summary={MARKET_FAN_COPY[lang].title} className="market-fan" concept="marches" open={fold === '1'} onToggle={(o) => setFold(o ? '1' : '0')} mountOnOpen>
      <Body m={m} />
    </Fold>
  )
}

function Body({ m }: { m: ResultsModel }) {
  const { lang, profile, assumptions, runs, label, dollars, year } = m
  const c = MARKET_FAN_COPY[lang]
  const { value, busy } = useMarketFan(profile.household, assumptions, true)
  const rows = (runs.find((r) => r.selection === 'plan') ?? runs[0])?.result.rows
  const ages = useMemo(() => agesOfRuns(rows ?? []), [rows])
  const markers = useMemo(() => retirementMarkers(profile.household, runs.slice(0, 1), label), [profile.household, runs, label])
  const scale = (y: number, netWorth: number) => netWorth / (dollars === 'today' ? deflator(y, year, assumptions.inflation) : 1)
  const series = useMemo(
    () => (value === null ? [] : value.lines.map((l) => ({ id: l.id, label: c.names[l.id], colour: COLOUR[l.id], points: l.points.map((p) => ({ x: p.year, y: scale(p.year, p.netWorth) })) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, lang, dollars, year, assumptions.inflation],
  )
  if (value === null) return <Skeleton count={4} />
  const money = (n: number) => formatMoney(n, lang)
  const first = value.lines[0].points[0].year
  const last = value.lines[0].points[value.lines[0].points.length - 1].year
  const ends = value.lines.map((l) => scale(last, l.end))
  const troughs = series.map((s) => deepestDip(s.points))
  const current: FanId | null = assumptions.marketPath === undefined || assumptions.marketPath.preset === 'smooth' ? 'average' : assumptions.marketPath.preset === 'badStart' || assumptions.marketPath.preset === 'lostDecade' ? assumptions.marketPath.preset : null
  return (
    <div className="market-fan__body" aria-busy={busy}>
      <p className="field-row__hint">
        {c.hint} {dollars === 'today' ? c.today : c.nominal}
      </p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <LineChart
            series={series}
            markers={markers}
            yFormat={(y) => formatCompactMoney(y, lang)}
            yDetail={(y) => money(y)}
            xTitle={(x) => `${x} · ${ages.get(x) ?? ''}`}
            xTick={(x) => [String(x), ages.get(x) ?? '']}
            ariaLabel={c.figure(first, last)}
          />
        </Suspense>
      </div>
      <div className="table-wrap" role="region" aria-label={c.title} tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">{c.table.line}</th>
            <th scope="col">{c.table.holds}</th>
            <th scope="col">{c.table.trough}</th>
            <th scope="col">{c.table.end}</th>
          </tr>
        </thead>
        <tbody>
          {value.lines.map((l, i) => (
            <tr key={l.id}>
              <th scope="row">
                <span className="chart__swatch" style={{ background: SERIES_CSS[COLOUR[l.id]] }} aria-hidden="true" /> {c.names[l.id]}
                {l.id === current && <span className="market-fan__yours"> ({c.yours})</span>}
              </th>
              <td>{l.ok ? c.holds : c.runsOut(l.firstShortfallYear ?? last)}</td>
              <td className="mono">{troughs[i].fell ? c.trough(money(troughs[i].low.y), troughs[i].low.x) : c.noFall}</td>
              <td className="mono">{money(ends[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="answer__note">{c.spread(money(Math.min(...ends)), money(Math.max(...ends)))}</p>
      <p className="field-row__hint">{c.caveat}</p>
    </div>
  )
}

