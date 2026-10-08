import { useLang, useT } from '../../i18n'
import { deflator, type Dollars } from '../../lib/chartData'
import { formatMoney } from '../../lib/money'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { useNotice } from '../../lib/toast'
import { useParamChoice } from '../../lib/useParamChoice'
import { lockedOf, yearCsv } from '../../lib/yearCsv'
import { Chip } from '../Chip'
import { TableChooser } from '../TableChooser'
import type { Selection } from '../../lib/resultsModel'
import type { AgeResult } from '../../engine/types'

// The picture's text: one row per year for the retirement age chosen in the table's header, every figure the chart
// draws and the ones it does not (tax, spending, what is left to cover). One table, not one per age: the header picks
// the age and the export follows it. The first column — the year WITH the ages — stays put while the rest scrolls
// sideways on a phone, so a reader never loses which year a figure belongs to. A year that falls short is marked by a
// tinted row AND a figure in the « À combler » column (shown only when some year needs it) — colour is never the only
// signal.
//
// The dollars are the chart's and the cards': today's by default (the engine's rows are nominal — the dollars of 2076
// are not the reader's — and a table that ended on 1,9 M$ under a card saying 678 k$ showed one plan as two). The unit
// is said ONCE on the page, over the comparison; the spreadsheet's headings carry it.

export function YearTables({
  runs,
  label,
  dollars,
  todayYear,
  inflation,
}: {
  runs: readonly { selection: Selection; result: AgeResult }[]
  label: (s: Selection) => string
  dollars: Dollars
  todayYear: number
  inflation: number
}) {
  const t = useT()
  const { lang } = useLang()
  const r = t.results
  const c = r.chart
  const out = RESULTS_COPY[lang].out
  const notice = useNotice()
  // The age shown is kept in the address (`?table=60`), so a link opens on the same table.
  const keys = runs.map((x) => String(x.selection))
  const [key, setKey] = useParamChoice('table', keys, keys[0] ?? '')
  const shown = runs[Math.max(0, keys.indexOf(key))]
  const factor = (year: number) => (dollars === 'today' ? deflator(year, todayYear, inflation) : 1)
  const money = (n: number, year: number) => formatMoney(n / factor(year), lang)
  const unit = dollars === 'today' ? c.today : c.nominal
  const saveCsv = (selection: Selection, result: AgeResult) => {
    const csv = yearCsv(result, r.table, lang, { factor, unit })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = out.csvFile(label(selection).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, ''))
    a.click()
    URL.revokeObjectURL(url)
    notice(out.csvDone)
  }
  if (!shown) return null
  const rows = shown.result.rows
  // A column that is empty in every year is left out: the home's two columns only when the plan has a home, the locked-in
  // REER only when someone has a locked part, « à combler » only when some year falls short.
  const hasHome = rows.some((row) => row.household.homeValueEnd > 0)
  const hasLocked = rows.some((row) => lockedOf(row) > 0)
  const hasShortfall = rows.some((row) => row.household.shortfall > 0)
  return (
    <div className="year-table">
      <TableChooser
        label={r.table.scenario}
        ariaLabel={r.table.scenario}
        value={key}
        options={runs.map((x) => ({ key: String(x.selection), label: label(x.selection) }))}
        onSelect={setKey}
        trailing={
          <Chip className="no-print" icon="download-simple-bold" onClick={() => saveCsv(shown.selection, shown.result)}>
            {out.csv}
          </Chip>
        }
      />
      <h3 className="year-table__title">{r.scenario.retireAt(label(shown.selection))}</h3>
      <p className="field-row__hint year-table__unit">{unit}.</p>
      <div className="table-wrap table-wrap--pinned" role="region" aria-label={`${r.table.title} — ${label(shown.selection)} (${unit})`} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">
                {r.table.year} · {r.table.ages}
              </th>
              <th scope="col">{r.table.income}</th>
              <th scope="col">{r.table.tax}</th>
              <th scope="col">{r.table.spending}</th>
              {hasShortfall && <th scope="col">{r.table.shortfall}</th>}
              <th scope="col">{r.table.netWorth}</th>
              {hasLocked && <th scope="col">{r.table.rrspLocked}</th>}
              {hasHome && <th scope="col">{r.table.mortgage}</th>}
              {hasHome && <th scope="col">{r.table.homeEquity}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year} className={row.household.shortfall > 0 ? 'is-short' : undefined}>
                <th scope="row">
                  {row.year}
                  <span className="year-table__ages"> · {Object.values(row.persons).map((p) => p.age).join(' / ')}</span>
                  {row.projected && <span className="projected mono"> {t.common.projected}</span>}
                </th>
                <td>{money(row.household.grossIncome, row.year)}</td>
                <td>{money(row.household.tax, row.year)}</td>
                <td>{money(row.household.spending, row.year)}</td>
                {hasShortfall && <td>{row.household.shortfall > 0 ? money(row.household.shortfall, row.year) : '—'}</td>}
                <td>{money(row.household.netWorthEnd, row.year)}</td>
                {hasLocked && <td>{money(lockedOf(row), row.year)}</td>}
                {hasHome && <td>{row.household.mortgagePayment > 0 ? money(row.household.mortgagePayment, row.year) : '—'}</td>}
                {hasHome && <td>{money(row.household.homeValueEnd - row.household.mortgageBalanceEnd, row.year)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
