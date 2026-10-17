import { worthAtHorizon } from '../../lib/resultsModel'
import type { ResultsModel } from '../../lib/useResultsPage'
import { FirmPrint } from './views/FirmSection'
import { PrintFoot, PrintHead } from './PrintFrame'
import { TimelineStrip } from './TimelineStrip'
import { EstFlag } from '../EstFlag'
import { formatPct, formatYearAge } from '../../lib/format'
import { factsOf } from '../../lib/facts'
import { factValue, type FactValue } from '../../lib/factValue'
import { GUIDE_COPY } from '../../lib/guideCopy'
import { formatMoney } from '../../lib/money'

// THE PRINTED PLAN — one short page (two at most), the same whichever view is open: what the household asked, what the answer is, in dates, what it can spend, the assumptions it stands on, the
// plan in one line, the ages that were compared and how firm the answer is. NOT the year-by-year table, NOT the 140 cited figures, NOT the other views: they stay on the screen (and in the
// app, under « Vérifier »), where they can be searched; on paper they were ten pages nobody read. It is shown instead of the page while the browser prints (lib/usePrinting.ts), text only —
// no chart to load, nothing that can still be on its way when the browser takes its snapshot.
export function PrintPlan({ m }: { m: ResultsModel }) {
  const { t, lang, r, rc, mc, profile, names, year, assumptions, births, at, retiredNow, retiredGlance, headline, activePreset, comfort, stop, runs, dollars, money, pct, label, sentenceBefore, sentenceAfter } = m
  const returns = [assumptions.returns.rrsp, assumptions.returns.tfsa, assumptions.returns.nonReg].map((x) => formatPct(x, lang, 1)).join(' / ')
  return (
    <div className="print-plan">
      <PrintHead m={m} title={rc.out.printTitle} />

      <section className="print-plan__answer" aria-label={r.title}>
        <p className="print-plan__line">
          {sentenceAfter === undefined ? (
            sentenceBefore
          ) : (
            <>
              {sentenceBefore}
              <strong className="print-plan__age">{rc.headline.ageText(headline.age!)}</strong>
              {sentenceAfter}
            </>
          )}
        </p>
        {retiredGlance ? (
          <p>
            {retiredGlance.now.ok ? rc.headline.holds(assumptions.horizonAge) : rc.headline.runsOut(at(retiredGlance.now.firstShortfallYear! - 1))}{' '}
            {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
          </p>
        ) : (
          headline.kind !== 'none' && (
            <p>
              {rc.headline.holds(assumptions.horizonAge)} {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
            </p>
          )
        )}
        {!retiredGlance && headline.kind !== 'none' && stop !== null && (
          <>
            <p className="print-plan__title">{rc.questions.stop.title}</p>
            <ul className="print-plan__list">
              {stop.years.map((y, i) => (
                <li key={y.id}>{rc.questions.stop.when(names[i] ?? '', formatYearAge(y.year, births[i] === undefined ? [] : [births[i]], lang))}</li>
              ))}
              <li>{stop.pensionsStarted ? rc.questions.stop.share(pct(stop.pensionShare), at(stop.firstYear)) : rc.questions.stop.shareNone(at(stop.firstYear))}</li>
              {stop.allStarted !== null && <li>{rc.questions.stop.shareAll(pct(stop.allStarted.share), at(stop.allStarted.year))}</li>}
              <li>{stop.pensionsCoverFrom === null ? rc.questions.stop.neverCovers : rc.questions.stop.coversFrom(at(stop.pensionsCoverFrom))}</li>
            </ul>
          </>
        )}
        {headline.age !== null && !retiredNow && comfort !== undefined && (
          <p>
            {comfort === null ? mc.income.none(headline.age) : mc.income.line(headline.age, money(Math.round(comfort / 12 / 10) * 10), money(Math.round(profile.household.spending.retiredToday / 12 / 10) * 10))} {mc.income.note} <EstFlag fact="household:spendingRetired" />
          </p>
        )}
      </section>

      <section className="print-plan__block" aria-label={rc.out.assumptions}>
        <p className="print-plan__title">{rc.out.assumptions}</p>
        <p>
          {activePreset ? t.assumptions.presets[activePreset] : t.assumptions.presets.custom} · {t.assumptions.presets.summary(formatPct(assumptions.inflation, lang, 1), formatPct(assumptions.wageGrowth, lang, 1), returns, assumptions.horizonAge)}
        </p>
      </section>

      <PrintFigures m={m} />

      <TimelineStrip household={profile.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />

      {runs.length > 0 && (
        <section className="print-plan__block" aria-label={r.compare.label}>
          <p className="print-plan__title">{r.compare.label}</p>
          <ul className="print-plan__list">
            {runs.map(({ selection, result }) => (
              <li key={String(selection)}>
                <strong>{r.scenario.retireAt(label(selection))}</strong> — {result.ok ? r.scenario.works(assumptions.horizonAge) : r.scenario.lastsUntil(at(result.firstShortfallYear! - 1))} · {r.scenario.endWorth(money(worthAtHorizon(result, dollars, assumptions)))}
              </li>
            ))}
          </ul>
          <p className="print-plan__unit">{dollars === 'today' ? r.chart.todayHint : r.chart.nominalHint}</p>
        </section>
      )}

      <FirmPrint m={m} />

      <PrintFoot m={m} />
    </div>
  )
}

// « Les chiffres du profil » — the dossier half of the printed plan: every figure the answer stands on, as the profile holds it, and whether a document
// confirms it. What a planner checks first, against the household's own papers; one short table, never the year-by-year.
function PrintFigures({ m }: { m: ResultsModel }) {
  const { lang, rc, profile, t } = m
  const c = rc.out.figures
  const gc = GUIDE_COPY[lang]
  const facts = factsOf(profile)
  if (facts.length === 0) return null
  const who = (owner: string) =>
    owner === 'household' ? gc.guide.householdOwner : gc.guide.owner(profile.household.persons.find((p) => p.id === owner)?.name.trim() || (owner === 'self' ? t.profile.self : t.profile.spouse))
  const value = (v: FactValue) =>
    v.kind === 'money' ? formatMoney(v.amount, lang) : v.kind === 'years' ? c.years(v.count) : v.kind === 'since' ? c.since(v.year) : c.plans(v.count)
  return (
    <section className="print-plan__block" aria-label={c.title}>
      <p className="print-plan__title">{c.title}</p>
      <p className="print-plan__unit">{c.intro}</p>
      <table className="print-figures">
        <tbody>
          {facts.map((f) => (
            <tr key={f.id}>
              <th scope="row">
                {gc.kind[f.kind]} — {who(f.owner)}
              </th>
              <td className="mono">{value(factValue(profile, f))}</td>
              <td>{f.confirmed ? c.confirmed : c.estimated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
