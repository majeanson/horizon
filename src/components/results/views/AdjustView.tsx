import { SaveView } from '../SaveView'
import { SpendView } from '../SpendView'
import { SectionHeader } from '../../SectionHeader'
import { formatCompactMoney } from '../../../lib/money'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'

// The « adjust » view of the results page — cut from the page unchanged; it reads the page's state through the one model object (lib/useResultsPage.ts).
export function AdjustView({ m }: { m: ResultsModel }) {
  const { lang, rc, profile, retiredNow, assumptions, setParam, firstAge, earliest, nowOk, lc, levers, saveAge, spend } = m
  return (
    <>
        <section className="arc" aria-label={rc.tabs.adjust}>
          {/* What the household could DO about it — three ways of changing the plan, none of them an assumption (those live on Hypothèses): the changes ranked by the years they gain, the saving needed for an age, and the spending that moves it. */}
          <section id="ajuster" className="results-section ajuster" aria-label={rc.headline.adjustTitle}>
            <SectionHeader title={rc.headline.adjustTitle} />
            {!retiredNow && (
              <div className="surface">
                {/* The changes a household could make, each tried alone and ranked by the years it gains. */}
                <div className="verdict__range ajuster__levers">
                  <p className="verdict__range-title">{lc.title}</p>
                  <ul className="levers__list">
                    {(levers?.levers ?? (['spend10', 'save500', 'returns1', 'pensions70'] as const).map((id) => ({ id, earliest: null, yearsGained: null, endGain: null }))).map((l) => (
                      <li key={l.id} className="levers__item">
                        <span>{lc.names[l.id]}</span>
                        <span className="mono levers__result">
                          {levers === undefined
                            ? lc.pending
                            : l.earliest === null
                              ? lc.none
                              : l.yearsGained === null
                                ? lc.found(l.earliest)
                                : l.yearsGained > 0
                                  ? lc.gain(l.yearsGained, l.earliest)
                                  : l.yearsGained === 0
                                    ? lc.same
                                    : lc.later(-l.yearsGained, l.earliest)}
                          {levers !== undefined && l.endGain !== null && Math.abs(l.endGain) >= 1000 && (
                            <span className="levers__end">{lc.end((l.endGain > 0 ? '+' : '−') + formatCompactMoney(Math.abs(l.endGain), lang))}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="verdict__note">{lc.hint}</p>
                </div>
              </div>
            )}
          </section>

            <section id="epargner" className="results-section" aria-label={rc.questions.tabs.save}>
              <SectionHeader title={rc.questions.tabs.save} />
              <SaveView household={profile.household} assumptions={assumptions} age={saveAge} onAge={(a) => setParam('age', String(a))} minAge={firstAge} maxAge={MAX_AGE} />
            </section>
            {!retiredNow && (
              <section id="depenser" className="results-section" aria-label={rc.questions.tabs.spend}>
                <SectionHeader title={rc.questions.tabs.spend} />
                <SpendView household={profile.household} assumptions={assumptions} spend={spend} onSpend={(v) => setParam('spend', v === null ? null : String(v))} earliest={earliest} now={nowOk} maxAge={MAX_AGE} />
              </section>
            )}
        </section>
    </>
  )
}
