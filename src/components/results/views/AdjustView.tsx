import { lazy, Suspense } from 'react'
import { Skeleton } from '../../Skeleton'
import { SaveView } from '../SaveView'
import { SpendView } from '../SpendView'
import { SectionHeader } from '../../SectionHeader'
import { SubTabs } from '../../SubTabs'
import { formatCompactMoney } from '../../../lib/money'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'

const CareSection = lazy(() => import('./CareSection').then((m) => ({ default: m.CareSection })))

// The « adjust » view of the results page (« Essayer ») — what to TRY: the changes ranked by the years they gain, the saving an age needs, the spending that moves it,
// and a late-life care. Four ways of asking the same thing (a change in, an age out), so ONE panel with a switch: one of them is on screen at a time, the choice
// is kept in the address (`?essai=`), and every link or old address that points at one (`#epargner`, `?care=…`, `?spend=…`) opens the right one by itself. It reads the
// page's state through the one model object (lib/useResultsPage.ts).
export function AdjustView({ m }: { m: ResultsModel }) {
  const { lang, rc, profile, retiredNow, assumptions, setParam, firstAge, earliest, nowOk, lc, levers, saveAge, spend, essai, essaiKeys, setEssai } = m
  const names = { levers: rc.nav.ajuster, save: rc.nav.epargner, spend: rc.nav.depenser, care: rc.nav.soins } as const
  return (
    <>
      <section className="arc" aria-label={rc.tabs.adjust}>
        <SubTabs size="mini" ariaLabel={rc.try.label} value={essai} onSelect={setEssai} options={essaiKeys.map((key) => ({ key, label: names[key] }))} />

        {/* What the household could DO about it — three ways of changing the plan, none of them an assumption (those live on Hypothèses): the changes ranked by the years they gain, the saving needed for an age, and the spending that moves it. */}
        {essai === 'levers' && (
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
                                    ? lc.same(l.earliest)
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
        )}

        {essai === 'save' && (
          <section id="epargner" className="results-section" aria-label={rc.questions.tabs.save}>
            <SectionHeader title={rc.questions.tabs.save} />
            <SaveView household={profile.household} assumptions={assumptions} age={saveAge} onAge={(a) => setParam('age', String(a))} minAge={firstAge} maxAge={MAX_AGE} />
          </section>
        )}

        {essai === 'spend' && !retiredNow && (
          <section id="depenser" className="results-section" aria-label={rc.questions.tabs.spend}>
            <SectionHeader title={rc.questions.tabs.spend} />
            <SpendView household={profile.household} assumptions={assumptions} spend={spend} onSpend={(v) => setParam('spend', v === null ? null : String(v))} earliest={earliest} now={nowOk} maxAge={MAX_AGE} />
          </section>
        )}

        {/* The one what-if about LIFE rather than the plan: the last years costing more (a care). It was the « Avenir » view; it is a thing to try, so it sits with the others. */}
        {essai === 'care' && (
          <Suspense fallback={<Skeleton count={3} />}>
            <CareSection m={m} />
          </Suspense>
        )}
      </section>
    </>
  )
}
