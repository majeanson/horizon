import { useMemo } from 'react'
import { useParamChoice } from '../../lib/useParamChoice'
import { useLang } from '../../i18n'
import { formatPct } from '../../lib/format'
import { marginalWeather, weatherSummary } from '../../lib/marginalWeather'
import { MARGINAL_WEATHER_COPY } from '../../lib/marginalWeatherCopy'
import type { ResultsModel } from '../../lib/useResultsPage'
import { Fold } from '../Fold'
import { HeatGrid, type HeatCellData } from '../HeatGrid'

// « Le coût d'un dollar de plus, par âge » — the household's own plan, every retired year: what the next RRSP dollar costs (tax, OAS recovery tax, GIS lost), as a calendar of ages,
// ten to a row. A fold under the year-by-year table, mounted when opened: the figures are read off the rows the table already holds, so nothing runs again, but the grid is only drawn
// for whoever asks.

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
  const points = useMemo(() => (rows === undefined ? [] : marginalWeather(rows, assumptions, household.persons[0].id, household.livesAlone)), [rows, assumptions, household])
  const summary = weatherSummary(points)
  if (summary === null) return <p className="answer__note">{c.none}</p>
  const pct = (x: number) => formatPct(x, lang, 0)
  const byAge = new Map(points.map((p) => [p.age, p]))
  const decades = [...new Set(points.map((p) => Math.floor(p.age / 10) * 10))].sort((a, b) => a - b)
  const lo = summary.lowest.rate
  const hi = summary.highest.rate
  const flat = hi - lo < 0.02
  const cells: HeatCellData[][] = decades.map((d) =>
    Array.from({ length: 10 }, (_, n): HeatCellData => {
      const p = byAge.get(d + n)
      if (p === undefined) return { text: '' }
      const mark = flat ? undefined : p === summary.highest ? c.highestMark : p === summary.lowest ? c.lowestMark : undefined
      return { text: pct(p.rate), heat: hi > lo ? (p.rate - lo) / (hi - lo) : 0, mark }
    }),
  )
  return (
    <div className="marginal-weather__body">
      <p className="field-row__hint">{c.hint}</p>
      <HeatGrid
        tone="cost"
        caption={c.caption(names[0] ?? '')}
        rows={decades.map((d) => c.decade(d))}
        cols={Array.from({ length: 10 }, (_, n) => c.plus(n))}
        cells={cells}
      />
      <p className="answer__note">{flat ? c.flat(pct(lo)) : `${c.lowest(pct(lo), summary.lowest.age)} ${c.highest(pct(hi), summary.highest.age)}`}</p>
      <p className="field-row__hint">{c.parts}</p>
      {lo < 0.01 && <p className="field-row__hint">{c.zero}</p>}
      <p className="field-row__hint">{c.who}</p>
    </div>
  )
}
