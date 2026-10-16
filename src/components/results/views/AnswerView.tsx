import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../../Chip'
import { Cluster, Rail } from '../../Layout'
import { NumberField } from '../../NumberField'
import { ChartPanel } from '../ChartPanel'
import { LevelRange } from '../LevelRange'
import { TimelineStrip } from '../TimelineStrip'
import { EarliestEachPanel } from '../EarliestEachPanel'
import { PlansCompare } from '../PlansCompare'
import { SectionHeader } from '../../SectionHeader'
import { SubTabs } from '../../SubTabs'
import { useParamChoice } from '../../../lib/useParamChoice'

import { Skeleton } from '../../Skeleton'
import { agesLedger } from '../../../engine/ledger'
import { formatYearAge } from '../../../lib/format'
import { longDate } from '../../../lib/months'
import { answerSpread } from '../../../lib/answerSpread'
import { ANSWER_SPREAD_COPY } from '../../../lib/answerSpreadCopy'
import { TOUR_COPY } from '../../../lib/tourCopy'
import { MAX_AGE, MAX_SELECTIONS, isSplit, worthAtHorizon } from '../../../lib/resultsModel'
import { SERIES_CLASS, milestoneAges } from '../../../lib/useResultsPage'
import type { ResultsModel } from '../../../lib/useResultsPage'
import { ShareChip } from '../ShareChip'
import { Cascade } from '../../Cascade'
import { useChangePulse } from '../../../lib/useChangePulse'

// « À faire cette année » rides with the care copy, outside the page's own chunk.
const YearSection = lazy(() => import('./YearSection').then((m) => ({ default: m.YearSection })))

// The « answer » view of the results page — cut from the page unchanged; it reads the page's state through the one model object (lib/useResultsPage.ts).
export function AnswerView({ m }: { m: ResultsModel }) {
  const { vintage, t, lang, r, rc, profile, slow, slowAssumptions, year, retiredNow, selections, metric, dollars, gaps, assumptions, births, at, isCouple, accuracy, setParam, firstAge, answer, answerPending, earliest, retiredGlance, answered, earliestEachAnswer, runs, runsPending, goTo, compareRef, headline, activePreset, mc, firstSearchesIn, confidenceRange, setTour, comfort, stop, toggle, names, planAges, label, addSplit, otherAge, addAge, sentenceBefore, sentenceAfter, pct, money } = m
  // Three ways of comparing, one on screen at a time: departure ages (the chips, the cards, the chart), each person's own earliest age (a couple) and the saved plans (when there are some).
  // The address keeps it (`?cv=`); the last two are offered only when they exist.
  const compareKeys = ['ages', ...(isCouple && !retiredNow ? (['each'] as const) : []), ...(!retiredNow && profile.plans.length > 0 ? (['plans'] as const) : [])] as const
  const [compareView, setCompareView] = useParamChoice('cv', compareKeys, 'ages')
  // A ring around the big age when it MOVES (not on arrival): sage if earlier, accent if later. The age itself arrives digit by digit (Cascade).
  const pulse = useChangePulse(headline.age ?? null)
  // While figures are estimates, the computed range replaces the plain count — only on a real answer (never retired, never « none »); the big age stays the base.
  // When each pension starts, for the chart's moments (from the settled profile, like the runs it sits beside).
  const ledger = useMemo(() => agesLedger(slow.household, slowAssumptions), [slow, slowAssumptions])
  const confidenceText = confidenceRange
    ? confidenceRange.high === null
      ? rc.headline.confidenceRangeOpen(confidenceRange.low, MAX_AGE, accuracy.confirmed, accuracy.total)
      : rc.headline.confidenceRange(confidenceRange.low, confidenceRange.high, accuracy.confirmed, accuracy.total)
    : accuracy.confirmed === accuracy.total
      ? rc.headline.confidenceAll
      : rc.headline.confidence(accuracy.confirmed, accuracy.total)
  const confidenceLine = accuracy.total > 0 && (
    <p className="verdict__note refine__confidence">
      {confidenceText}{' '}
      <Link className="info-note__link" to="/profil">
        {rc.headline.confidenceLink}
      </Link>
      {' · '}
      <Link className="info-note__link" to="/fiche">
        {rc.headline.confidenceSheet}
      </Link>
    </p>
  )
  return (
    <>
        <section className="arc" aria-label={rc.tabs.answer}>
          <div id="verdict" className={'verdict surface results-section' + (answer.busy ? ' is-busy' : '')} aria-live="polite" aria-busy={answer.busy || undefined}>
            {answerPending ? (
              <Skeleton count={3} className="skeleton--verdict" />
            ) : (
              <>
              <p className="verdict__line">
                {sentenceAfter === undefined ? (
                  sentenceBefore
                ) : (
                  <>
                    <span className="verdict__lead">{sentenceBefore}</span>
                    <span className="verdict__big">
                      {/* Keyed on the age: it settles into place (styles/motion.css) only when the answer moves. */}
                      <span className="verdict__age-wrap">
                        <strong key={headline.age} className="verdict__age">
                          <Cascade>{rc.headline.ageText(headline.age!)}</Cascade>
                        </strong>
                        {pulse.count > 0 && <span key={pulse.count} className="answer-pulse" data-dir={pulse.dir ?? undefined} aria-hidden="true" />}
                      </span>
                      {sentenceAfter}
                    </span>
                  </>
                )}
              </p>
              {retiredGlance ? (
                <>
                  <p className="verdict__note">
                    {retiredGlance.now.ok ? rc.headline.holds(assumptions.horizonAge) : rc.headline.runsOut(at(retiredGlance.now.firstShortfallYear! - 1))}{' '}
                    {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
                  </p>
                  {activePreset !== 'prudent' && (retiredGlance.prudent.ok !== retiredGlance.now.ok || retiredGlance.prudent.firstShortfallYear !== retiredGlance.now.firstShortfallYear) && (
                    <p className="verdict__note">{rc.headline.retiredPrudent(t.assumptions.presets.prudent, retiredGlance.prudent.ok, retiredGlance.prudent.firstShortfallYear === null ? null : at(retiredGlance.prudent.firstShortfallYear - 1))}</p>
                  )}
                </>
              ) : headline.kind === 'none' ? (
                <>
                  {/* The WORST answer must be the most actionable one: the nudge carries its doors, and each door opens. */}
                  <p className="verdict__note">{rc.headline.tryThis}</p>
                  <Cluster>
                    <Chip icon="caret-down-bold" onClick={() => goTo('decide', 'depenser')}>{rc.headline.trySpend}</Chip>
                    <Chip to="/hypotheses">{rc.headline.toAssumptions}</Chip>
                    <Chip onClick={() => goTo('proof', 'donnees-calcul')}>{rc.headline.tryLedger}</Chip>
                  </Cluster>
                </>
              ) : (
                <>
                  <p className="verdict__note">
                    {rc.headline.holds(assumptions.horizonAge)} {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
                  </p>
                  {/* The answer in dates: the year each person reaches the age, and when the pensions carry the spending by themselves. */}
                  {stop !== null && (
                    <div id="arreter" className="verdict__dates">
                      <p className="verdict__range-title">{rc.questions.stop.title}</p>
                      <ul className="verdict__dates-list">
                        {stop.years.map((y, i) => (
                          <li key={y.id}>{rc.questions.stop.when(names[i] ?? '', formatYearAge(y.year, births[i] === undefined ? [] : [births[i]], lang))}</li>
                        ))}
                        <li>{stop.pensionsStarted ? rc.questions.stop.share(pct(stop.pensionShare), at(stop.firstYear)) : rc.questions.stop.shareNone(at(stop.firstYear))}</li>
                        {stop.allStarted !== null && <li>{rc.questions.stop.shareAll(pct(stop.allStarted.share), at(stop.allStarted.year))}</li>}
                        <li>{stop.pensionsCoverFrom === null ? rc.questions.stop.neverCovers : rc.questions.stop.coversFrom(at(stop.pensionsCoverFrom))}</li>
                      </ul>
                    </div>
                  )}
                  {/* The one lever a reader reaches for first (« could we live on less? ») is a section away: a door to it, on the card. */}
                  <Cluster>
                    <Chip icon="caret-down-bold" onClick={() => goTo('decide', 'depenser')}>{rc.headline.trySpend}</Chip>
                    {/* The guided tour has ONE home: here, beside the card's other door. It walks the departure ages, so a household that has already stopped working is not offered it
                        (this branch is the working household with a real answer; the tour's own availability, `tour`, lives in the model). */}
                    {!retiredNow && <Chip icon="arrow-right-bold" onClick={() => setTour(1)}>{TOUR_COPY[lang].open}</Chip>}
                    {/* The result as a link: the age and the household type, nothing from the profile (lib/shareLink.ts). */}
                    {!retiredNow && headline.age !== null && <ShareChip age={headline.age} isCouple={isCouple} />}
                  </Cluster>
                </>
              )}
              </>
            )}
            {headline.age !== null && !retiredNow && comfort !== undefined && (
              <p className="verdict__note">
                {comfort === null ? mc.income.none(headline.age) : mc.income.line(headline.age, money(Math.round(comfort / 12 / 10) * 10), money(Math.round(profile.household.spending.retiredToday / 12 / 10) * 10))} {mc.income.note}
              </p>
            )}
            {/* How much of the answer stands on the person's own documents belongs WITH the answer, not three sections down. */}
            {confidenceLine}
            {/* …and how far it moves when the future is kinder or harsher than assumed: the scenarios and the market paths, already out for the page below. */}
            {!answerPending && !retiredNow && headline.kind === 'at' && headline.age !== null && <AnswerSpreadLine age={headline.age} m={m} />}
            {/* The answer is an estimate under stated assumptions, and it says so where it is read — quietly: it must
                be present, not compete with the answer. */}
            <p className="verdict__note verdict__note--caveat">{r.verdict.caveat}</p>
            <p className="verdict__note">{rc.out.vintage(vintage.year, longDate(vintage.newestRead, lang))}{year > vintage.year ? ' ' + rc.out.vintageProjected(vintage.year, year) : ''}</p>
          </div>

          {!answerPending && gaps.length === 0 && <TimelineStrip household={profile.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />}
          {!answerPending && gaps.length === 0 && !retiredNow && <LevelRange profile={slow} enabled={answered && firstSearchesIn} />}

          {/* Every departure-age comparison — the chips, the cards, the chart and (for a couple) « Chacun de son côté » —
              is ONE section: the same runs, seen as cards, as a picture, and per person. */}
          <section id="comparer" className="results-section" aria-label={r.compare.label}>
            <SectionHeader title={r.compare.label} subtitle={headline.earlierAge !== null && headline.earlierShortfallYear !== null ? rc.headline.earlier(headline.earlierAge, at(headline.earlierShortfallYear - 1)) : undefined} concept="depart" />
            {compareKeys.length > 1 && (
              <SubTabs
                size="mini"
                ariaLabel={rc.compareViews.label}
                value={compareView}
                onSelect={setCompareView}
                options={compareKeys.map((key) => ({ key, label: rc.compareViews[key] }))}
              />
            )}

            {compareView === 'ages' && (
              <>
            {!retiredNow && (
              <div className="compare" ref={compareRef}>
                <Rail role="group" aria-label={r.compare.label}>
                  <Chip selected={selections.includes('plan')} onClick={() => toggle('plan')}>
                    {r.compare.planAt(planAges)}
                  </Chip>
                  {milestoneAges(earliest, selections, firstAge).map((age) => (
                    // The answer's own age wears a quiet accent dot: the one number the reader most wants to compare against.
                    <Chip
                      key={age}
                      selected={selections.includes(age)}
                      onClick={() => toggle(age)}
                      className={age === earliest ? 'chip--earliest' : undefined}
                      ariaLabel={age === earliest ? `${r.compare.age(age)} — ${rc.headline.earliestChip}` : undefined}
                      title={age === earliest ? rc.headline.earliestChip : undefined}
                    >
                      {r.compare.age(age)}
                    </Chip>
                  ))}
                  {selections.filter(isSplit).map((s) => (
                    <Chip key={s} selected onClick={() => toggle(s)}>
                      {label(s)}
                    </Chip>
                  ))}
                </Rail>
                <div className="compare__other">
                  <label className="field-row__label" htmlFor="compare-other-age">
                    {r.compare.otherAge}
                  </label>
                  <NumberField kind="int" allowEmpty min={firstAge} max={MAX_AGE} unit={t.fields.years} value={otherAge} onChange={addAge} id="compare-other-age" disabled={selections.length >= MAX_SELECTIONS} />
                </div>
                {selections.length >= MAX_SELECTIONS && <p className="field-row__hint">{r.compare.max}</p>}
                {selections.includes('plan') && <p className="field-row__hint">{r.compare.planHint}</p>}
              </div>
            )}

            {runsPending && <Skeleton count={2} variant="card" />}
            <ul className="scenarios">
              {runs.map(({ selection, result }, i) => (
                <li key={String(selection)} className={`scenario scenario--${SERIES_CLASS[i]} surface`}>
                  <p className="scenario__title">
                    <span className="scenario__swatch" aria-hidden="true" />
                    {r.scenario.retireAt(label(selection))}
                  </p>
                  <p className={'scenario__verdict' + (result.ok ? '' : ' scenario__verdict--short')}>{result.ok ? r.scenario.works(assumptions.horizonAge) : r.scenario.lastsUntil(at(result.firstShortfallYear! - 1))}</p>
                  <p className="scenario__worth mono">{r.scenario.endWorth(money(worthAtHorizon(result, dollars, assumptions)))}</p>
                </li>
              ))}
            </ul>
            {/* The unit of every figure of the comparison, said once. */}
            <p className="field-row__hint">{dollars === 'today' ? r.chart.todayHint : r.chart.nominalHint}</p>

            {runs.length > 0 && (
              <ChartPanel
                runs={runs}
                household={profile.household}
                names={names}
                todayYear={year}
                inflation={assumptions.inflation}
                horizonAge={assumptions.horizonAge}
                metric={metric}
                dollars={dollars}
                onMetric={(m) => setParam('metric', m === 'netWorth' ? null : m)}
                label={label}
                ledger={ledger}
                goTo={goTo}
              />
            )}
              </>
            )}

            {compareView === 'each' && isCouple && !retiredNow && (
              <div className="surface">
                {/* « Comparer » adds the pair to the departure-age comparison: show it there. */}
                <EarliestEachPanel
                  household={profile.household}
                  names={names}
                  answer={earliestEachAnswer}
                  maxAge={MAX_AGE}
                  onCompare={(a, b) => {
                    addSplit(a, b)
                    setCompareView('ages')
                  }}
                  compareDisabled={selections.length >= MAX_SELECTIONS}
                />
              </div>
            )}
            {compareView === 'plans' && !retiredNow && profile.plans.length > 0 && (
              <div className="surface">
                <PlansCompare profile={slow} enabled={answered && firstSearchesIn} />
              </div>
            )}
          </section>

          <Suspense fallback={null}>
            <YearSection m={m} />
          </Suspense>
        </section>
    </>
  )
}

/** « Selon les trois scénarios et les parcours de marché : de 57 à 64 ans » — only once both searches are in, and only when it says something the big age does not. */
function AnswerSpreadLine({ age, m }: { age: number; m: ResultsModel }) {
  const spread = answerSpread(age, m.range, m.stress)
  if (spread === null) return null
  const c = ANSWER_SPREAD_COPY[m.lang]
  return <p className="verdict__note">{spread.high === null ? c.open(spread.low, MAX_AGE) : c.range(spread.low, spread.high)}</p>
}
