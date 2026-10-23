import { useMemo } from 'react'
import { useLang, useT } from '../../i18n'
import { deflator, type Dollars } from '../../lib/chartData'
import { Link } from 'react-router-dom'
import { formatPct, formatYearAge } from '../../lib/format'
import { glossaryAnchor } from '../../lib/glossIndex'
import { retiredRates } from '../../lib/retiredRates'
import { Gloss } from '../Gloss'
import { formatMoney } from '../../lib/money'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { useNotice } from '../../lib/toast'
import { useParamChoice } from '../../lib/useParamChoice'
import { csvLabel, yearCsv } from '../../lib/yearCsv'
import { yearTableModel } from '../../lib/yearTable'
import { yearNotes } from '../../lib/yearNotes'
import { YEAR_NOTES_COPY, yearNoteText } from '../../lib/yearNotesCopy'
import { Fold } from '../Fold'
import { Chip } from '../Chip'
import { TableChooser } from '../TableChooser'
import type { Selection } from '../../lib/resultsModel'
import type { AgeResult, Assumptions, PersonId } from '../../engine/types'
import { saveAsFile } from '../../lib/download'

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
  assumptions,
  livesAlone,
  kids,
  births,
  names,
}: {
  runs: readonly { selection: Selection; result: AgeResult }[]
  label: (s: Selection) => string
  dollars: Dollars
  todayYear: number
  /** The plan's assumptions: the inflation that deflates the dollars, and what the marginal rate of a retired year is worked out with. */
  assumptions: Assumptions
  /** Whether a one-adult household lives alone (Québec's living-alone amount); a couple never does. */
  livesAlone?: boolean
  /** The birth years of the children the household counts the benefits of (none when it does not), for the credits paid next year that a dollar drawn this year shrinks. */
  kids?: readonly number[]
  /** The birth years of the household, for the « year (ages) » of the first year that falls short. */
  births: readonly number[]
  /** The household's names, by person: given where the page can say which years stand out and why (a pension starting part-way through a year, a survivor's pension changing rule). Left out for print. */
  names?: Readonly<Record<PersonId, string>>
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
  const { inflation } = assumptions
  const factor = (year: number) => (dollars === 'today' ? deflator(year, todayYear, inflation) : 1)
  const money = (n: number) => formatMoney(n, lang)
  const unit = dollars === 'today' ? c.today : c.nominal
  const saveCsv = (selection: Selection, result: AgeResult) => {
    const csv = yearCsv(result, r.table, lang, { factor, unit })
    // the app's one way to hand a file over (lib/download.ts): attached while clicked, its address kept a moment — iOS fetched nothing otherwise
    saveAsFile(csv, out.csvFile(csvLabel(label(selection))), 'text/csv;charset=utf-8')
    notice(out.csvDone)
  }
  // The rows of the table, already in the dollars shown (lib/yearTable.ts — the same model the spreadsheet is written from).
  const model = useMemo(() => (shown ? yearTableModel(shown.result.rows, factor) : null), [shown, dollars, todayYear, inflation]) // eslint-disable-line react-hooks/exhaustive-deps
  // The average rate against the cost of one more REER dollar, in the first year without a salary (rates, not dollars: the unit does not matter).
  const rates = useMemo(() => (shown ? retiredRates(shown.result.rows, assumptions, livesAlone, kids) : null), [shown, assumptions, livesAlone, kids])
  // The years that look different for a reason, read off these very rows (lib/yearNotes.ts).
  const notes = useMemo(() => (shown && names ? yearNotes(shown.result.rows) : []), [shown, names])
  if (!shown || !model) return null
  const { rows, hasHome, hasLocked, hasShortfall, hasCredits, firstShortYear } = model
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
      {firstShortYear !== null && <p className="year-table__short">{RESULTS_COPY[lang].shortage.from(formatYearAge(firstShortYear, births, lang), r.table.shortfall)}</p>}
      {/* The cost of a dollar is shown as at least nought: where the first 2 000 $ of RRIF income earn the pension credit, the engine's step is a hair NEGATIVE, which a sentence about a « cost » cannot say. */}
      {rates && (
        <p className="field-row__hint year-table__rates">
          <Gloss>{RESULTS_COPY[lang].rates.line(formatYearAge(rates.year, births, lang), formatPct(rates.average, lang, 1), formatPct(Math.max(0, rates.marginal.rate), lang, 1), births.length > 1)}</Gloss>{' '}
          <Link className="gloss" to={{ pathname: '/glossaire', hash: glossaryAnchor('taux-moyen') }} title={t.common.inGlossary}>
            {RESULTS_COPY[lang].rates.gloss}
          </Link>
        </p>
      )}
      <div className="table-wrap table-wrap--pinned" role="region" aria-label={`${r.table.title} — ${label(shown.selection)} (${unit})`} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">
                {r.table.year} · {r.table.ages}
              </th>
              <th scope="col">{r.table.income}</th>
              {hasCredits && <th scope="col">{r.table.credits}</th>}
              <th scope="col">{r.table.tax}</th>
              <th scope="col">{r.table.avgRate}</th>
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
              <tr key={row.year} className={row.short ? 'is-short' : undefined}>
                <th scope="row">
                  {row.year}
                  <span className="year-table__ages"> · {row.ages.join(' / ')}</span>
                  {row.projected && <span className="projected mono"> {t.common.projected}</span>}
                </th>
                <td>{money(row.income)}</td>
                {hasCredits && <td>{row.credits > 0 ? money(row.credits) : '—'}</td>}
                <td>{money(row.tax)}</td>
                <td>{row.avgRate === null ? '—' : formatPct(row.avgRate, lang, 1)}</td>
                <td>{money(row.spending)}</td>
                {hasShortfall && <td>{row.short ? money(row.shortfall) : '—'}</td>}
                <td>{money(row.netWorth)}</td>
                {hasLocked && <td>{money(row.rrspLocked)}</td>}
                {hasHome && <td>{row.mortgage > 0 ? money(row.mortgage) : '—'}</td>}
                {hasHome && <td>{money(row.homeEquity)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {names && notes.length > 0 && (
        <Fold summary={YEAR_NOTES_COPY[lang].title}>
          <ul className="year-table__notes">
            {notes.map((n) => (
              <li key={`${n.year}-${n.kind}-${n.who}`}>
                <strong>{n.year}</strong> · {yearNoteText(lang, n, names)}
              </li>
            ))}
          </ul>
        </Fold>
      )}
    </div>
  )
}
