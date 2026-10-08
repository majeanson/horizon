import { useLang, useT } from '../../i18n'
import { deflator, type Dollars } from '../../lib/chartData'
import { formatMoney } from '../../lib/money'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { useNotice } from '../../lib/toast'
import { useParamChoice } from '../../lib/useParamChoice'
import { yearCsv } from '../../lib/yearCsv'
import { Chip } from '../Chip'
import { TableChooser } from '../TableChooser'
import type { Selection } from '../../lib/resultsModel'
import type { AgeResult } from '../../engine/types'

// The picture's text: one row per year for the scenario chosen in the table's header, every figure the chart draws and
// the ones it does not (tax, spending, shortfall). One table, not one per scenario: the header picks the scenario and
// the export follows it. A year that falls short is marked by a tinted row AND the word « manque » in its own
// column — colour is never the only signal.
//
// The dollars are the chart's and the cards': today's by default (the engine's rows are nominal — the dollars of 2076
// are not the reader's — and a table that ended on 1,9 M$ under a card saying 678 k$ showed one plan as two). The unit
// is written over the table and into the spreadsheet's headings.

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
  // The scenario shown is kept in the address (`?table=60`), so a link opens on the same table.
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
  // The home's two columns appear only when the plan has a home (a column of dashes says nothing).
  const hasHome = shown.result.rows.some((row) => row.household.homeValueEnd > 0)
  return (
    <>
      <p className="field-row__hint year-table__unit">
        {unit}. {dollars === 'today' ? c.todayHint : c.nominalHint}
      </p>
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
        <div className="table-wrap" role="region" aria-label={`${r.table.title} — ${label(shown.selection)} (${unit})`} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">{r.table.year}</th>
                <th scope="col">{r.table.ages}</th>
                <th scope="col">{r.table.income}</th>
                <th scope="col">{r.table.tax}</th>
                <th scope="col">{r.table.spending}</th>
                <th scope="col">{r.table.shortfall}</th>
                <th scope="col">{r.table.netWorth}</th>
                {hasHome && <th scope="col">{r.table.mortgage}</th>}
                {hasHome && <th scope="col">{r.table.homeEquity}</th>}
              </tr>
            </thead>
            <tbody>
              {shown.result.rows.map((row) => (
                <tr key={row.year} className={row.household.shortfall > 0 ? 'is-short' : undefined}>
                  <th scope="row">
                    {row.year}
                    {row.projected && <span className="projected mono"> {t.common.projected}</span>}
                  </th>
                  <td>{Object.values(row.persons).map((p) => p.age).join(' / ')}</td>
                  <td>{money(row.household.grossIncome, row.year)}</td>
                  <td>{money(row.household.tax, row.year)}</td>
                  <td>{money(row.household.spending, row.year)}</td>
                  <td>{row.household.shortfall > 0 ? money(row.household.shortfall, row.year) : '—'}</td>
                  <td>{money(row.household.netWorthEnd, row.year)}</td>
                  {hasHome && <td>{row.household.mortgagePayment > 0 ? money(row.household.mortgagePayment, row.year) : '—'}</td>}
                  {hasHome && <td>{money(row.household.homeValueEnd - row.household.mortgageBalanceEnd, row.year)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
