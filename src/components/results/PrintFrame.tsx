import { longDate } from '../../lib/months'
import { EstFlag } from '../EstFlag'
import type { ResultsModel } from '../../lib/useResultsPage'

// The head and the foot every printed page carries, whichever kind it is (lib/printKind.ts): what it is, whose it is and when it was made — and, at the foot, that it is an
// estimate and which year's government figures it stands on. One home for both, so a new kind of page cannot drift from the plan's own.

export function PrintHead({ m, title }: { m: ResultsModel; title: string }) {
  const { rc, names, month, year } = m
  return (
    <header className="print-head">
      <p className="print-head__title">{title}</p>
      <p>
        {rc.out.printedOn(month, year)} · {names.join(' · ')}
      </p>
    </header>
  )
}

export function PrintFoot({ m }: { m: ResultsModel }) {
  const { rc, lang, vintage } = m
  return (
    <p className="print-foot">
      {rc.out.printFoot} {rc.out.vintage(vintage.year, longDate(vintage.newestRead, lang))}
    </p>
  )
}

/** The answer as one sentence with its age drawn large, and the line under it that says whether the money lasts and in which economy. The plan's first block and the leaflet's. */
export function PrintSentence({ m }: { m: ResultsModel }) {
  const { t, rc, assumptions, at, retiredGlance, headline, activePreset, sentenceBefore, sentenceAfter } = m
  const scenario = activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom
  return (
    <>
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
          {retiredGlance.now.ok ? rc.headline.holds(assumptions.horizonAge) : rc.headline.runsOut(at(retiredGlance.now.firstShortfallYear! - 1))} {scenario}
        </p>
      ) : (
        headline.kind !== 'none' && (
          <p>
            {rc.headline.holds(assumptions.horizonAge)} {scenario}
          </p>
        )
      )}
    </>
  )
}

/** « À cet âge, vous pourriez dépenser X par mois (vous visez Y) » — the monthly comfort, said once. */
export function PrintComfort({ m }: { m: ResultsModel }) {
  const { mc, profile, retiredNow, headline, comfort, money } = m
  if (headline.age === null || retiredNow || comfort === undefined) return null
  return (
    <p>
      {comfort === null ? mc.income.none(headline.age) : mc.income.line(headline.age, money(Math.round(comfort / 12 / 10) * 10), money(Math.round(profile.household.spending.retiredToday / 12 / 10) * 10))} {mc.income.note}{' '}
      <EstFlag fact="household:spendingRetired" />
    </p>
  )
}
