import { useLang, useT } from '../../i18n'
import { formatMoney } from '../../lib/money'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { useNotice } from '../../lib/toast'
import { yearCsv } from '../../lib/yearCsv'
import { Chip } from '../Chip'
import type { Selection } from '../../lib/resultsModel'
import type { AgeResult } from '../../engine/types'

// The picture's text: one row per year per scenario, every figure the chart draws and the ones it does not
// (tax, spending, shortfall). A year that falls short is marked by a tinted row AND the word « manque » in its own
// column — colour is never the only signal.

export function YearTables({ runs, label }: { runs: readonly { selection: Selection; result: AgeResult }[]; label: (s: Selection) => string }) {
  const t = useT()
  const { lang } = useLang()
  const r = t.results
  const out = RESULTS_COPY[lang].out
  const notice = useNotice()
  const saveCsv = (selection: Selection, result: AgeResult) => {
    const csv = yearCsv(result, r.table, lang)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = out.csvFile(label(selection).replace(/[^p{L}p{N}]+/gu, '-').replace(/^-|-$/g, ''))
    a.click()
    URL.revokeObjectURL(url)
    notice(out.csvDone)
  }
  return (
    <>
      {runs.map(({ selection, result }) => (
        <div key={String(selection)} className="year-table">
          <h3 className="year-table__title">{r.scenario.retireAt(label(selection))}</h3>
          <Chip className="no-print" icon="download-simple-bold" onClick={() => saveCsv(selection, result)}>
            {out.csv}
          </Chip>
          <div className="table-wrap" role="region" aria-label={`${r.table.title} — ${label(selection)}`} tabIndex={0}>
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
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.year} className={row.household.shortfall > 0 ? 'is-short' : undefined}>
                    <th scope="row">
                      {row.year}
                      {row.projected && <span className="projected mono"> {t.common.projected}</span>}
                    </th>
                    <td>{Object.values(row.persons).map((p) => p.age).join(' / ')}</td>
                    <td>{formatMoney(row.household.grossIncome, lang)}</td>
                    <td>{formatMoney(row.household.tax, lang)}</td>
                    <td>{formatMoney(row.household.spending, lang)}</td>
                    <td>{row.household.shortfall > 0 ? formatMoney(row.household.shortfall, lang) : '—'}</td>
                    <td>{formatMoney(row.household.netWorthEnd, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  )
}
