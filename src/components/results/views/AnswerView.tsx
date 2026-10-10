import { Link } from 'react-router-dom'
import { Chip } from '../../Chip'
import { Cluster, Rail } from '../../Layout'
import { NumberField } from '../../NumberField'
import { ChartPanel } from '../ChartPanel'
import { HowToRead } from '../HowToRead'
import { LevelRange } from '../LevelRange'
import { TimelineStrip } from '../TimelineStrip'
import { EarliestEachPanel } from '../EarliestEachPanel'
import { PlansCompare } from '../PlansCompare'
import { SectionHeader } from '../../SectionHeader'
import { Skeleton } from '../../Skeleton'
import { formatYearAge } from '../../../lib/format'
import { longDate } from '../../../lib/months'
import { STRESS_PRESETS } from '../../../lib/marketRange'
import { MAX_AGE, MAX_SELECTIONS, isSplit, worthAtHorizon } from '../../../lib/resultsModel'
import { SERIES_CLASS, milestoneAges } from '../../../lib/useResultsPage'
import type { ResultsModel } from '../../../lib/useResultsPage'

// The « answer » view of the results page — cut from the page unchanged; it reads the page's state through the one model object (lib/useResultsPage.ts).
export function AnswerView({ m }: { m: ResultsModel }) {
  const { vintage, t, lang, r, rc, profile, slow, year, retiredNow, selections, metric, dollars, gaps, assumptions, births, at, isCouple, accuracy, setParam, firstAge, answer, answerPending, earliest, retiredGlance, answered, earliestEachAnswer, runs, runsPending, goTo, compareRef, headline, activePreset, range, stress, mc, firstSearchesIn, impact, factName, movers, pathName, prudentGap, comfort, stop, toggle, names, planAges, label, addSplit, otherAge, addAge, refine, sentenceBefore, sentenceAfter, pct, money } = m
  const confidenceLine = accuracy.total > 0 && (
    <p className="verdict__note refine__confidence">
      {accuracy.confirmed === accuracy.total ? rc.headline.confidenceAll : rc.headline.confidence(accuracy.confirmed, accuracy.total)}{' '}
      <Link className="info-note__link" to="/profil">
        {rc.headline.confidenceLink}
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
                      <strong className="verdict__age">{rc.headline.ageText(headline.age!)}</strong>
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
                    <Chip icon="caret-down-bold" onClick={() => goTo('adjust', 'depenser')}>{rc.headline.trySpend}</Chip>
                    <Chip to="/hypotheses">{rc.refine.toAssumptions}</Chip>
                    <Chip onClick={() => goTo('verify', 'donnees-calcul')}>{rc.headline.tryLedger}</Chip>
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
                    <Chip icon="caret-down-bold" onClick={() => goTo('adjust', 'depenser')}>{rc.headline.trySpend}</Chip>
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
            {/* The answer is an estimate under stated assumptions, and it says so where it is read — quietly: it must
                be present, not compete with the answer. */}
            <p className="verdict__note verdict__note--caveat">{r.verdict.caveat}</p>
            <p className="verdict__note">{rc.out.vintage(vintage.year, longDate(vintage.newestRead, lang))}{year > vintage.year ? ' ' + rc.out.vintageProjected(vintage.year, year) : ''}</p>
          </div>

          {!answerPending && gaps.length === 0 && <TimelineStrip household={profile.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />}
          {!answerPending && gaps.length === 0 && <HowToRead />}
          {!answerPending && gaps.length === 0 && !retiredNow && <LevelRange profile={slow} enabled={answered && firstSearchesIn} />}

          {/* How firm the answer is: the same plan under the three scenarios and a hard market side by side, then what would move it. Rows from the first paint. */}
          {!retiredNow && (
            <div id="solidite" className="surface results-section firm" aria-label={rc.headline.firmTitle}>
              <SectionHeader title={rc.headline.firmTitle} />
              <div className="firm__pair">
                <div className="verdict__range">
                <p className="verdict__range-title">{rc.headline.rangeTitle}</p>
                <dl className="verdict__range-list">
                  {(['prudent', 'neutral', 'bold'] as const).map((k) => (
                    <div key={k} className={'verdict__range-item' + (activePreset === k ? ' is-on' : '')}>
                      <dt>{t.assumptions.presets[k]}</dt>
                      <dd className="mono">{range === undefined ? '…' : range[k] === null ? rc.headline.rangeNone(MAX_AGE) : rc.headline.rangeAge(range[k]!)}</dd>
                    </div>
                  ))}
                </dl>
                {range !== undefined && prudentGap && (
                  <Cluster className="verdict__gap">
                    <p className="verdict__note">{rc.headline.rangeGap}</p>
                    <Chip onClick={() => goTo('verify', 'sensibilite')}>{rc.headline.trySensitivity}</Chip>
                  </Cluster>
                )}
              </div>
              {/* The same plan under a hard stretch of markets: the order of the years, said where the answer is read. */}
              <div className="verdict__range">
                <p className="verdict__range-title">{mc.stress.title}</p>
                <dl className="verdict__range-list">
                  {(['smooth', ...STRESS_PRESETS] as const).map((k) => (
                    <div key={k} className={'verdict__range-item' + (pathName === k ? ' is-on' : '')}>
                      <dt>{mc.path.names[k]}</dt>
                      <dd className="mono">{stress === undefined ? '…' : stress[k] === null ? mc.stress.none(MAX_AGE) : mc.stress.age(stress[k]!)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="verdict__note">
                  {pathName !== 'smooth' && <>{mc.stress.active(mc.path.names[pathName])} </>}
                  {mc.stress.hint}{' '}
                  <Link className="info-note__link" to="/hypotheses">
                    {mc.stress.link}
                  </Link>
                </p>
              </div>
                </div>
            </div>
          )}

          {/* Every departure-age comparison — the chips, the cards, the chart and (for a couple) « Chacun de son côté » —
              is ONE section: the same runs, seen as cards, as a picture, and per person. */}
          <section id="comparer" className="results-section" aria-label={r.compare.label}>
            <SectionHeader title={r.compare.label} subtitle={headline.earlierAge !== null && headline.earlierShortfallYear !== null ? rc.headline.earlier(headline.earlierAge, at(headline.earlierShortfallYear - 1)) : undefined} />
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
                metric={metric}
                dollars={dollars}
                onMetric={(m) => setParam('metric', m === 'netWorth' ? null : m)}
                label={label}
              />
            )}

            {isCouple && !retiredNow && (
              <div className="surface">
                <EarliestEachPanel household={profile.household} names={names} answer={earliestEachAnswer} maxAge={MAX_AGE} onCompare={addSplit} compareDisabled={selections.length >= MAX_SELECTIONS} />
              </div>
            )}
            {!retiredNow && profile.plans.length > 0 && (
              <div className="surface">
                <PlansCompare profile={slow} enabled={answered && firstSearchesIn} />
              </div>
            )}
          </section>

          {/* The refinement loop: how much of the answer stands on the person's own documents, and the figures that would sharpen it — one block, not two. */}
          {(refine.length > 0 || accuracy.total > 0) && (
            <div id="preciser" className="surface results-section refine" aria-label={rc.refine.title}>
              <SectionHeader title={rc.refine.title} subtitle={refine.length === 0 ? undefined : headline.kind === 'none' && !retiredGlance ? rc.refine.hintNone : rc.refine.hint} />
              {confidenceLine}
              {movers.length > 0 && (
                <div className="refine__moves">
                  <p className="verdict__range-title">{rc.refine.moves}</p>
                  <ul className="refine__list">
                    {movers.map((f) => (
                      <li key={f.id}>
                        <span>{factName(f.id)}</span> <span className="mono">{rc.refine.swing(impact!.swings[f.id].years)}</span> <Chip to={`/profil?fact=${encodeURIComponent(f.id)}`}>{rc.refine.find}</Chip>
                      </li>
                    ))}
                  </ul>
                  <p className="verdict__note">{rc.refine.movesHint}</p>
                </div>
              )}
              {refine.length > 0 && (
                <ul className="refine__list">
                  {refine.map((k) => (
                    <li key={k}>
                      {rc.refine[k]} <Chip to="/profil">{rc.refine.toProfile}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        </section>
    </>
  )
}
