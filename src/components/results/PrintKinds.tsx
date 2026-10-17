import { PRINT_MENU_COPY } from '../../lib/printMenuCopy'
import type { ResultsModel } from '../../lib/useResultsPage'
import { PrintFoot, PrintHead } from './PrintFrame'
import { PARAM_LABELS } from '../../lib/paramLabels'
import { knownYears, paramRows } from '../../lib/paramsView'
import { YearTables } from './YearTables'

// The pages « Imprimer » can put on paper besides the one-page plan (components/results/PrintPlan.tsx). They ride a chunk of their own: the menu fetches it before it asks the browser
// to print (PrintMenu.tsx), because the browser takes its snapshot the moment `beforeprint` returns and nothing may still be on its way. Text and tables only — no chart.

/** The year-by-year table of the age chosen on screen (`?table=`), in the dollars shown, on a landscape page: a table of eight columns does not fit a portrait one. */
export function PrintYears({ m }: { m: ResultsModel }) {
  const { lang, runs, label, dollars, year, assumptions, profile, births } = m
  return (
    <div className="print-plan print-kind print-kind--years">
      <PrintHead m={m} title={PRINT_MENU_COPY[lang].headings.years} />
      <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} assumptions={assumptions} livesAlone={profile.household.livesAlone} births={births} />
      <PrintFoot m={m} />
    </div>
  )
}

/**
 * Every government figure the calculation reads, newest tax year: the figure, its value, and the official page it was read on with the address written out (a link is nothing on paper)
 * and the day it was read. The rows are the engine's own (lib/paramsView.ts, the ones « Paramètres utilisés » shows), set as one tight table: a hundred and forty rows must not be a
 * screen's worth of padding each.
 */
export function PrintSources({ m }: { m: ResultsModel }) {
  const { lang, r } = m
  const years = knownYears()
  const year = years[years.length - 1]
  const rows = paramRows(year, lang, r.params.entries)
  return (
    <div className="print-plan print-kind print-kind--sources">
      <PrintHead m={m} title={PRINT_MENU_COPY[lang].headings.sources} />
      <p className="print-plan__unit">{r.params.note}</p>
      <p className="print-plan__title">
        {r.params.year(year)} · {r.params.count(rows.length)}
      </p>
      <table className="print-figures print-sources">
        <thead>
          <tr>
            <th scope="col">{r.params.figure}</th>
            <th scope="col">{r.params.value}</th>
            <th scope="col">{r.params.source}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.path}>
              <th scope="row">{PARAM_LABELS[lang][row.path] ?? row.path}</th>
              <td className="mono">{row.value}</td>
              <td lang={row.pageLang}>
                {row.title}
                {!row.inReaderLanguage && ` (${r.params.pageIn(row.pageLang)})`}
                <span className="print-sources__url">{row.url}</span>
                <span className="print-sources__read">
                  {r.params.retrieved(row.retrieved)}
                  {row.verify && ` · ${r.params.toVerify}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PrintFoot m={m} />
    </div>
  )
}
