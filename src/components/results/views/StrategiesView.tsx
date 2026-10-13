import { BracketFillPanel } from '../BracketFillPanel'
import { BridgePanel } from '../BridgePanel'
import { OrderPanel } from '../OrderPanel'
import { SectionHeader } from '../../SectionHeader'
import { BRACKET_FILL_COPY } from '../../../lib/bracketFillCopy'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'

// The « strategies » view of the results page — cut from the page unchanged; it reads the page's state through the one model object (lib/useResultsPage.ts).
export function StrategiesView({ m }: { m: ResultsModel }) {
  const { rc, profile, state, assumptions, firstAge, earliest, names, lang } = m
  const age = earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  const bf = BRACKET_FILL_COPY[lang]
  return (
    <>
        <section className="arc" aria-label={rc.tabs.strategies}>
          {state.pensionsOpen && (
            <section id="rentes" className="results-section" aria-label={rc.pensions.title}>
              <SectionHeader title={rc.pensions.title} subtitle={rc.pensions.hint} />
              <BridgePanel household={profile.household} assumptions={assumptions} names={names} />
            </section>
          )}
          <section id="ordre" className="results-section" aria-label={rc.orders.title}>
            <SectionHeader title={rc.orders.title} />
            {/* The age is the answer's; when no age works, the plan's own. Never the « Combien épargner ? » box from another view. */}
            <OrderPanel household={profile.household} assumptions={assumptions} age={age} firstAge={firstAge} />
          </section>
          <section id="fonte" className="results-section" aria-label={bf.title}>
            <SectionHeader title={bf.title} />
            <BracketFillPanel household={profile.household} assumptions={assumptions} firstAge={firstAge} />
          </section>
        </section>
    </>
  )
}
