import { lazy, Suspense, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Accordion, AccordionItem, type AccordionOpen } from '../../Accordion'
import { Chip } from '../../Chip'
import { Cluster, Rail } from '../../Layout'
import { NumberField } from '../../NumberField'
import { ChartPanel } from '../ChartPanel'
import { LevelRange } from '../LevelRange'
import { EarliestEachPanel } from '../EarliestEachPanel'
import { PlansCompare } from '../PlansCompare'
import { Fold } from '../../Fold'
import { PlanStoryFold } from '../../PlanStoryFold'
import { SubTabs } from '../../SubTabs'
import { useParamChoice } from '../../../lib/useParamChoice'
import { ANSWER_BLOCKS } from '../../../lib/useResultsPage'

import { Skeleton, SkeletonLines, SkeletonStatus } from '../../Skeleton'
import { SkeletonChips, SkeletonText } from '../../SkeletonShapes'
import { agesLedger } from '../../../engine/ledger'
import { formatYearAge } from '../../../lib/format'
import { longDate } from '../../../lib/months'
import { TOUR_COPY } from '../../../lib/tourCopy'
import { MAX_AGE, MAX_SELECTIONS, isSplit, pairSelection, worthAtHorizon } from '../../../lib/resultsModel'
import { SERIES_CLASS, milestoneAges } from '../../../lib/useResultsPage'
import type { ResultsModel } from '../../../lib/useResultsPage'
import { AnswerGlance, answerAtGlance } from '../AnswerGlance'
import { CARDS_COPY } from '../../../lib/cardsCopy'
import { AGE_TOKEN } from '../../../lib/resultsCopy'
import { SHARE_COPY } from '../../../lib/shareCopy'
import { stopLines } from '../../../lib/stopLines'
import { ShareChip } from '../ShareChip'
import { Cascade } from '../../Cascade'
import { useChangePulse } from '../../../lib/useChangePulse'

// « À faire cette année » rides with the care copy, outside the page's own chunk.
// « Quand arrêter »'s chart rides with the chart library: it loads only when its fold is opened.
const StopChart = lazy(() => import('../StopChart').then((m) => ({ default: m.StopChart })))
const YearSection = lazy(() => import('./YearSection').then((m) => ({ default: m.YearSection })))

// The « answer » view of the results page — cut from the page unchanged; it reads the page's state through the one model object (lib/useResultsPage.ts).
/** The shape of the last answer this tab drew — an age, or « no age works » — so the next wait for it (the page is left and come back to; nothing caches the
 *  answer itself) takes that shape. In memory only: it says nothing about the household that the page has not already shown. */
let lastShape: 'at' | 'none' = 'at'

export function AnswerView({ m }: { m: ResultsModel }) {
  const { vintage, t, lang, r, rc, profile, slow, slowAssumptions, runsProfile, runsAssumptions, year, retiredNow, selections, metric, dollars, gaps, assumptions, births, at, isCouple, accuracy, setParam, firstAge, answer, answerPending, earliest, retiredGlance, answered, earliestEachAnswer, runs, runsPending, goTo, compareRef, headline, activePreset, mc, firstSearchesIn, confidenceRange, setTour, comfort, stop, toggle, names, planAges, label, addSplit, otherAge, addAge, sentenceBefore, sentenceAfter, pct, money } = m
  // Three ways of comparing, one on screen at a time: departure ages (the chips, the cards, the chart), each person's own earliest age (a couple) and the saved plans (when there are some).
  // The address keeps it (`?cv=`); the last two are offered only when they exist.
  const compareKeys = ['ages', ...(isCouple && !retiredNow ? (['each'] as const) : []), ...(!retiredNow && profile.plans.length > 0 ? (['plans'] as const) : [])] as const
  const [compareView, setCompareView] = useParamChoice('cv', compareKeys, 'ages')
  // The two cards under the answer, only the first (the answer itself) open on arrival (`?cartes=all` opens every one, `?cartes=none` closes them, a card's name keeps just that one open): the same « Tout ouvrir / Tout fermer » as every other page.
  const [cartes, setCartes] = useParamChoice<string>('cartes', [...ANSWER_BLOCKS, 'all', 'none'], 'verdict')
  // « Quand arrêter »'s chart: open or not is in the address (`?dates=1`), like every controlled fold — and only a CONTROLLED fold mounts on open, so the chart
  // library is not loaded on every visit (an uncontrolled one rendered the chart hidden, and chart-structure.spec found it first on the page).
  const [datesFold, setDatesFold] = useParamChoice('dates', ['0', '1'] as const, '0')
  const cardsOpen: AccordionOpen = cartes === 'all' ? 'all' : cartes === 'none' ? null : cartes
  // A fold's state does not outlive the card that holds it: « Tout fermer » shuts the answer's card, which unmounts « Rentes et dépenses » before its own toggle can
  // report (a slow phone), and `?dates=1` would stay in the address — reopening the card then reopened the chart nobody asked for.
  const verdictOpen = cartes === 'all' || cartes === 'verdict'
  useEffect(() => {
    if (!verdictOpen && datesFold === '1') setDatesFold('0')
  }, [verdictOpen, datesFold, setDatesFold])
  const cc = CARDS_COPY[lang]
  // A ring around the big age when it MOVES (not on arrival): sage if earlier, accent if later. The age itself arrives digit by digit (Cascade).
  const pulse = useChangePulse(headline.age ?? null)
  useEffect(() => {
    if (!answerPending && !retiredNow) lastShape = headline.kind === 'none' ? 'none' : 'at'
  }, [answerPending, retiredNow, headline.kind])
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
  // The answer's card, closed: the glance in one line — or, with no glance (retired, no age works), the answer's own sentence.
  const glance = answerAtGlance(m)
  const closedAnswer = glance !== null ? cc.glance.closed(glance.start, glance.lasts, glance.margin) : sentenceAfter === undefined ? sentenceBefore : `${sentenceBefore}${rc.headline.ageText(headline.age!)}${sentenceAfter}`
  const confidenceLine = accuracy.total > 0 && (
    <p className="verdict__note refine__confidence">
      {confidenceText}{' '}
      <Link className="info-note__link" to="/profil?bloc=exact">
        {rc.headline.confidenceLink}
      </Link>
      {' · '}
      <Link className="info-note__link" to="/fiche?bloc=fiche-preciser">
        {rc.headline.confidenceSheet}
      </Link>
    </p>
  )
  return (
    <>
        <section className="arc" aria-label={rc.tabs.answer}>
          <Accordion ids={ANSWER_BLOCKS} open={cardsOpen} onOpen={(id) => setCartes(id ?? 'none')}>
          {/* The answer is a card like the two under it (Marc, 2026-10-20): « Tout fermer » shuts it to its title and the glance in one line. */}
          <AccordionItem id="verdict" title={rc.nav.reponse} summary={answerPending ? undefined : closedAnswer} concept="reponse" nav={false} className="results-section verdict-card">
          <div className={'verdict' + (answer.busy ? ' is-busy' : '')} aria-live="polite" aria-busy={answer.busy || undefined}>
            {answerPending ? (
              <VerdictSkeleton m={m} />
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
              <AnswerGlance m={m} />
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
                        {stopLines(stop, rc.questions.stop, at, pct).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      {stop.coverage.length > 1 && (
                        <Fold summary={rc.questions.stop.chartTitle} open={datesFold === '1'} onToggle={(o) => setDatesFold(o ? '1' : '0')} mountOnOpen>
                          <Suspense fallback={<Skeleton count={3} />}>
                            <StopChart coverage={stop.coverage} dollars={dollars} todayYear={year} inflation={assumptions.inflation} births={births} />
                          </Suspense>
                        </Fold>
                      )}
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
            {/* What the age can fund each month arrives a beat after the answer (its own search): its lines wait in its place, so nothing under it moves. */}
            {(answerPending ? !retiredNow && lastShape !== 'none' : headline.age !== null && !retiredNow) && (
              <p className="verdict__note">
                {answerPending || comfort === undefined ? (
                  <SkeletonLines widths={[95, 90, 55]} />
                ) : (
                  <>
                    {comfort === null ? mc.income.none(headline.age!) : mc.income.line(headline.age!, money(Math.round(comfort / 12 / 10) * 10), money(Math.round(profile.household.spending.retiredToday / 12 / 10) * 10))} {mc.income.note}
                  </>
                )}
              </p>
            )}
            {/* How much of the answer stands on the person's own documents belongs WITH the answer, not three sections down. */}
            {confidenceLine}
            {/* The answer is an estimate under stated assumptions, and it says so where it is read — quietly: it must
                be present, not compete with the answer. */}
            <p className="verdict__note verdict__note--caveat">{r.verdict.caveat}</p>
            {/* The year of the rates is a provenance, one fold away — unless the year is ahead of them: then it is a warning, and stays in view. */}
            {year > vintage.year ? (
              <p className="verdict__note">{rc.out.vintage(vintage.year, longDate(vintage.newestRead, lang)) + ' ' + rc.out.vintageProjected(vintage.year, year)}</p>
            ) : (
              <Fold summary={rc.out.vintageTitle}>
                <p className="verdict__note">{rc.out.vintage(vintage.year, longDate(vintage.newestRead, lang))}</p>
              </Fold>
            )}
            {/* The plan in plain words and the « and if…? » cards, one tap away — for a household that has stopped working, how to make the money last. */}
            {!answerPending && gaps.length === 0 && <PlanStoryFold profile={profile} retired={retiredNow} />}
          </div>
          </AccordionItem>

          {!answerPending && gaps.length === 0 && !retiredNow && <LevelRange profile={slow} enabled={answered && firstSearchesIn} />}

          {/* Every departure-age comparison — the chips, the cards, the chart and (for a couple) « Chacun de son côté » —
              is ONE section: the same runs, seen as cards, as a picture, and per person. */}
          <AccordionItem id="comparer" title={r.compare.label} subtitle={headline.earlierAge !== null && headline.earlierShortfallYear !== null ? rc.headline.earlier(headline.earlierAge, at(headline.earlierShortfallYear - 1)) : undefined} summary={cc.closed.comparer} concept="depart" nav={false} className="results-section">
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
                  <p className="scenario__worth mono">{r.scenario.endWorth(money(worthAtHorizon(result, dollars, runsAssumptions)))}</p>
                </li>
              ))}
            </ul>
            {/* The unit of every figure of the comparison, said once. */}
            <p className="field-row__hint">{dollars === 'today' ? r.chart.todayHint : r.chart.nominalHint}</p>

            {runs.length > 0 && (
              <ChartPanel
                runs={runs}
                household={runsProfile.household}
                names={names}
                todayYear={year}
                inflation={runsAssumptions.inflation}
                horizonAge={runsAssumptions.horizonAge}
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
                    // only to the comparison when the pair landed in it (two equal ages are one card; an age out of the range is none)
                    if (addSplit(a, b)) setCompareView('ages')
                  }}
                  canCompare={(a, b) => pairSelection(a, b) !== null}
                  compareDisabled={selections.length >= MAX_SELECTIONS}
                />
              </div>
            )}
            {compareView === 'plans' && !retiredNow && profile.plans.length > 0 && (
              <div className="surface">
                <PlansCompare profile={slow} enabled={answered && firstSearchesIn} />
              </div>
            )}
          </AccordionItem>

          <Suspense fallback={null}>
            <YearSection m={m} />
          </Suspense>
          </Accordion>
        </section>
    </>
  )
}

/** The answer's card while its first answer is worked out: the common answer (an age, the glance, the note, the dates, the doors) in its own elements, its words written
 *  out as ghost text with likely figures (components/Skeleton.tsx SkeletonText) — so it wraps, and is as tall, as the answer that replaces it, at any width and text size. */
function VerdictSkeleton({ m }: { m: ResultsModel }) {
  const { rc, lang, isCouple, names, assumptions, activePreset, t, profile, retiredNow, money, pct, year, births } = m
  const g = CARDS_COPY[lang].glance
  // a household that has stopped working is told it is retired, and whether the money lasts: no age, no glance, no dates
  const none = !retiredNow && lastShape === 'none'
  const [lead, tail] = (retiredNow ? rc.headline.retired(isCouple) : none ? rc.headline.none(MAX_AGE) : rc.headline.at(AGE_TOKEN, isCouple)).split(AGE_TOKEN)
  const age = profile.household.persons[0]?.retirementAge ?? 60
  const holds = `${rc.headline.holds(assumptions.horizonAge)} ${activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}`
  const stop = rc.questions.stop
  const later = (n: number) => formatYearAge(year + n, births, lang)
  return (
    // `skeleton--verdict`: the mark of the answer still being worked out (e2e/results-on-screen.spec.ts waits on it); the placeholder's own parts carry no class a
    // reader of the answer looks for (the age is `skeleton__age`, not `verdict__age`), so nothing takes the ghost for the answer
    <div className="skeleton--verdict" data-placeholder="">
      <SkeletonStatus />
      {tail === undefined ? (
        <p className="skeleton-as-verdict__line">
          <SkeletonText>{lead}</SkeletonText>
        </p>
      ) : (
        <p className="skeleton-as-verdict__line">
          <span className="verdict__lead">
            <SkeletonText>{lead}</SkeletonText>
          </span>
          <span className="verdict__big">
            <strong className="skeleton__age">
              <SkeletonText>{rc.headline.ageText(age)}</SkeletonText>
            </strong>
            <SkeletonText>{tail}</SkeletonText>
          </span>
        </p>
      )}
      {retiredNow && (
        <p className="verdict__note">
          <SkeletonText>{holds}</SkeletonText>
        </p>
      )}
      {none && (
        <>
          <p className="verdict__note">
            <SkeletonText>{rc.headline.tryThis}</SkeletonText>
          </p>
          <SkeletonChips labels={[rc.headline.trySpend, rc.headline.toAssumptions, rc.headline.tryLedger]} />
        </>
      )}
      {!retiredNow && !none && (
        <>
          <ul className="skeleton-as-glance" aria-hidden="true">
            <li className="skeleton-as-glance__tile">
              <span className="glance__name">{g.start}</span>
              <strong className="glance__value">
                <SkeletonText>{rc.headline.ageText(age)}</SkeletonText>
              </strong>
            </li>
            <li className="skeleton-as-glance__tile">
              <span className="glance__name">{g.lasts}</span>
              <strong className="glance__value">
                <SkeletonText>{g.holdsTo(assumptions.horizonAge)}</SkeletonText>
              </strong>
            </li>
            <li className="skeleton-as-glance__tile">
              <span className="glance__name">{g.margin}</span>
              <strong className="glance__value skeleton-as-mono">
                <SkeletonText>{'+' + money(300)}</SkeletonText>
              </strong>
              <span className="glance__sub">
                <SkeletonText>{g.fundsOf(money(7800), money(7500))}</SkeletonText>
              </span>
            </li>
          </ul>
          <p className="verdict__note">
            <SkeletonText>{holds}</SkeletonText>
          </p>
          <div className="verdict__dates" aria-hidden="true">
            <p className="verdict__range-title">{stop.title}</p>
            <ul className="verdict__dates-list">
              {births.map((b, i) => (
                <li key={i}>
                  <SkeletonText>{stop.when(names[i] ?? '', formatYearAge(year + 12, [b], lang))}</SkeletonText>
                </li>
              ))}
              <li>
                <SkeletonText>{stop.share(pct(0.22), later(16))}</SkeletonText>
              </li>
              <li>
                <SkeletonText>{stop.shareAll(pct(0.76), later(21))}</SkeletonText>
              </li>
              <li>
                <SkeletonText>{stop.neverCovers}</SkeletonText>
              </li>
            </ul>
          </div>
          <SkeletonChips labels={[rc.headline.trySpend, TOUR_COPY[lang].open, SHARE_COPY[lang].button]} />
        </>
      )}
    </div>
  )
}
