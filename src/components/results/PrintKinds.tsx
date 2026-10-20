import { PLAN_CALENDAR_COPY } from '../../lib/planCalendarCopy'
import { qrMatrix, qrPath } from '../../lib/qr'
import { shareUrl } from '../../lib/shareLink'
import { PRINT_MENU_COPY } from '../../lib/printMenuCopy'
import type { ResultsModel } from '../../lib/useResultsPage'
import { formatPct } from '../../lib/format'
import { PlanCalendarList } from './PlanCalendar'
import { agesLedger } from '../../engine/ledger'
import { oasTrace, rrqTrace } from '../../engine/trace'
import { LEDGER_COPY } from '../../lib/ledgerCopy'
import { traceLines } from '../../lib/traceView'
import { TRACE_COPY } from '../../lib/traceCopy'
import { PrintComfort, PrintFigures, PrintFoot, PrintHead, PrintSentence } from './PrintFrame'
import { figuresUsed } from '../../lib/figuresUsed'
import { PARAM_LABELS } from '../../lib/paramLabels'
import { knownYears, paramRows } from '../../lib/paramsView'
import { YearTables } from './YearTables'

// The pages « Imprimer » can put on paper besides the one-page plan (components/results/PrintPlan.tsx). They ride a chunk of their own: the menu fetches it before it asks the browser
// to print (PrintMenu.tsx), because the browser takes its snapshot the moment `beforeprint` returns and nothing may still be on its way. Text and tables only — no chart.

/** The dates of the plan, year by year, each year with the ages it brings (lib/planCalendar.ts: the profile's own dates, nothing calculated). */
export function PrintCalendar({ m }: { m: ResultsModel }) {
  const { lang, profile, names, year, assumptions } = m
  return (
    <div className="print-plan print-kind print-kind--calendar">
      <PrintHead m={m} title={PRINT_MENU_COPY[lang].headings.calendar} />
      <PlanCalendarList household={profile.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />
      <PrintFoot m={m} />
    </div>
  )
}

/**
 * The share link as a code a phone can scan (lib/qr.ts): the same three parameters as the « Partager » chip — an age, a household type and a language, never a figure from the profile —
 * so the leaflet handed to a spouse or an advisor opens the same scenario. Nothing when there is no age to share (nothing works, or the household is already retired).
 */
function ShareQr({ m }: { m: ResultsModel }) {
  const { lang, headline, retiredNow, profile } = m
  if (headline.age === null || retiredNow) return null
  const c = PRINT_MENU_COPY[lang]
  const url = shareUrl(window.location.origin, { age: headline.age, home: profile.household.persons.length > 1 ? 'couple' : 'seul', lang })
  let code: { d: string; size: number }
  try {
    code = qrPath(qrMatrix(url))
  } catch {
    return null // an address too long for the code (a very long host): the leaflet prints without it
  }
  return (
    <figure className="print-leaflet__qr">
      <svg viewBox={`0 0 ${code.size} ${code.size}`} role="img" aria-label={c.qrAria} shapeRendering="crispEdges">
        <rect width={code.size} height={code.size} fill="#ffffff" />
        <path d={code.d} fill="#000000" />
      </svg>
      <figcaption>{c.qr}</figcaption>
    </figure>
  )
}

/** A landscape page to fold in three: the answer, the calendar, the assumptions — what a household puts on the fridge or hands a spouse. */
export function PrintLeaflet({ m }: { m: ResultsModel }) {
  const { lang, rc, t, profile, names, year, assumptions, activePreset } = m
  const returns = [assumptions.returns.rrsp, assumptions.returns.tfsa, assumptions.returns.nonReg].map((x) => formatPct(x, lang, 1)).join(' / ')
  return (
    <div className="print-plan print-kind print-kind--leaflet">
      <PrintHead m={m} title={PRINT_MENU_COPY[lang].headings.leaflet} />
      <div className="print-leaflet">
        <section className="print-leaflet__panel" aria-label={rc.tabs.answer}>
          <PrintSentence m={m} />
          <PrintComfort m={m} />
        </section>
        <section className="print-leaflet__panel" aria-label={PLAN_CALENDAR_COPY[lang].title}>
          <p className="print-plan__title">{PLAN_CALENDAR_COPY[lang].title}</p>
          <PlanCalendarList household={profile.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />
        </section>
        <section className="print-leaflet__panel" aria-label={rc.out.assumptions}>
          <p className="print-plan__title">{rc.out.assumptions}</p>
          <p>
            {activePreset ? t.assumptions.presets[activePreset] : t.assumptions.presets.custom} · {t.assumptions.presets.summary(formatPct(assumptions.inflation, lang, 1), formatPct(assumptions.wageGrowth, lang, 1), returns, assumptions.horizonAge)}
          </p>
          <ShareQr m={m} />
        </section>
      </div>
      <PrintFoot m={m} />
    </div>
  )
}

/**
 * The proof file: what a planner or an advisor checks against the household's own papers. The figures of the profile (confirmed or estimated), then each pension's calculation as the
 * ledger makes it — the formula with this household's numbers, what it rests on, the official page of the rule with its address written out — and the assumptions. The sources of
 * every other government figure are the next kind (« Les sources »): this page points there instead of printing a hundred and forty rows again.
 */
export function PrintDossier({ m }: { m: ResultsModel }) {
  const { lang, profile, names, assumptions, t, activePreset } = m
  const c = TRACE_COPY[lang]
  const l = LEDGER_COPY[lang]
  const returns = [assumptions.returns.rrsp, assumptions.returns.tfsa, assumptions.returns.nonReg].map((x) => formatPct(x, lang, 1)).join(' / ')
  const colon = lang === 'fr' ? ' :' : ':'
  const ledger = agesLedger(profile.household, assumptions)
  return (
    <div className="print-plan print-kind print-kind--dossier">
      <PrintHead m={m} title={PRINT_MENU_COPY[lang].headings.dossier} />
      <PrintFigures m={m} />
      {ledger.map((entry, i) => (
        <section key={entry.id} className="print-plan__block print-dossier__person" aria-label={l.person(names[i] ?? '')}>
          <p className="print-plan__title">{l.person(names[i] ?? '')}</p>
          {[traceLines(rrqTrace(entry), lang), traceLines(oasTrace(entry), lang)].map((v) => (
            <div key={v.label} className="print-dossier__figure">
              <p>
                <strong>{v.label}</strong> — {v.shown}
              </p>
              <p>{v.formula}</p>
              {v.inputs.length > 0 && (
                <p className="print-plan__unit">
                  {c.inputsTitle}{colon} {v.inputs.map((x) => (x.value === '' ? x.label : `${x.label} ${x.value}`)).join(' · ')}
                </p>
              )}
              {v.source && (
                <p className="print-plan__unit">
                  {c.sourceTitle}{colon} {v.source.title} — {v.source.url}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
      <section className="print-plan__block" aria-label={m.rc.out.assumptions}>
        <p className="print-plan__title">{m.rc.out.assumptions}</p>
        <p>
          {activePreset ? t.assumptions.presets[activePreset] : t.assumptions.presets.custom} · {t.assumptions.presets.summary(formatPct(assumptions.inflation, lang, 1), formatPct(assumptions.wageGrowth, lang, 1), returns, assumptions.horizonAge)}
        </p>
      </section>
      <p className="print-plan__unit">{PRINT_MENU_COPY[lang].dossierSources}</p>
      <PrintFoot m={m} />
    </div>
  )
}

/** The year-by-year table of the age chosen on screen (`?table=`), in the dollars shown, on a landscape page: a table of eight columns does not fit a portrait one. */
export function PrintYears({ m }: { m: ResultsModel }) {
  const { lang, runs, label, dollars, year, runsAssumptions, runsProfile, runsBirths } = m
  return (
    <div className="print-plan print-kind print-kind--years">
      <PrintHead m={m} title={PRINT_MENU_COPY[lang].headings.years} />
      <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} assumptions={runsAssumptions} livesAlone={runsProfile.household.livesAlone} births={runsBirths} />
      <PrintFoot m={m} />
    </div>
  )
}

/**
 * The government figures the calculation reads for THIS household, newest tax year (the families its profile does not involve are left out and named: lib/figuresUsed.ts): the figure, its value, and the official page it was read on with the address written out (a link is nothing on paper)
 * and the day it was read. The rows are the engine's own (lib/paramsView.ts, the ones « Paramètres utilisés » shows), set as one tight table: a hundred and forty rows must not be a
 * screen's worth of padding each.
 */
export function PrintSources({ m }: { m: ResultsModel }) {
  const { lang, r, profile, retiredNow } = m
  const years = knownYears()
  const year = years[years.length - 1]
  const all = paramRows(year, lang, r.params.entries)
  const { kept: rows, left } = figuresUsed(all, { household: profile.household, retiredNow })
  const c = PRINT_MENU_COPY[lang]
  return (
    <div className="print-plan print-kind print-kind--sources">
      <PrintHead m={m} title={c.headings.sources} />
      <p className="print-plan__unit">{r.params.note}</p>
      <p className="print-plan__title">
        {r.params.year(year)} · {r.params.count(rows.length)}
      </p>
      {left.length > 0 && <p className="print-plan__unit">{c.figuresLeft(left.map((x) => c.families[x.family]).join(', '), left.reduce((n, x) => n + x.count, 0))}</p>}
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
