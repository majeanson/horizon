import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Disclosure } from '../components/Disclosure'
import { Rail } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { ChartPanel } from '../components/results/ChartPanel'
import { DeferralPanel } from '../components/results/DeferralPanel'
import { EarliestEachPanel } from '../components/results/EarliestEachPanel'
import { ParamsPanel } from '../components/results/ParamsPanel'
import { SplitPicker } from '../components/results/SplitPicker'
import { SensitivityPanel } from '../components/results/SensitivityPanel'
import { YearTables } from '../components/results/YearTables'
import { StatusMessage } from '../components/StatusMessage'
import { retireAt } from '../engine/retireAt'
import { useLang, useT } from '../i18n'
import type { Dollars, Metric } from '../lib/chartData'
import { DEFERRAL_COPY } from '../lib/deferralCopy'
import { headlineOf } from '../lib/headline'
import { formatMoney } from '../lib/money'
import { profileGaps } from '../lib/profileGaps'
import { MAX_AGE, MAX_SELECTIONS, MIN_AGE, assumptionsOf, defaultSelections, formatSelections, isSplit, parseSelections, runSelections, splitAges, splitOf, toggleSelection, type Selection } from '../lib/resultsModel'
import { useMode } from '../lib/mode'
import { useEarliestEach } from '../lib/useEarliestEach'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'

// The answer. A verdict first — the earliest age at which the plan lasts — then the comparison the person chooses
// (« my plan », or one age for everyone) as scenario cards and a chart, and the detail behind it for whoever wants to
// check: the year-by-year table, the parameters, and how fragile the verdict is. Nothing is shown until the profile
// holds enough to mean something (profileGaps). Every choice lives in the address (`?ages=&metric=&dollars=`), so a
// view can be bookmarked and the back button means what it says.

const SERIES_CLASS = ['accent', 'sky', 'sage', 'berry'] as const

export function Resultats() {
  const t = useT()
  const { lang } = useLang()
  const r = t.results
  const profile = useProfile()
  const full = useMode() === 'full'
  const [params, setParams] = useSearchParams()
  const { year, month } = today()
  // A « chacun son âge » split names two people: on a one-person household it would only duplicate a plain age.
  const selections = parseSelections(params.get('ages'), defaultSelections(profile.household)).filter((s) => !isSplit(s) || profile.household.persons.length > 1)
  const metric: Metric = params.get('metric') === 'income' ? 'income' : 'netWorth'
  const dollars: Dollars = params.get('dollars') === 'nominal' ? 'nominal' : 'today'
  const gaps = profileGaps(profile)
  const assumptions = assumptionsOf(profile, { year, month })
  const isCouple = profile.household.persons.length === 2
  const earliestEachAnswer = useEarliestEach(profile.household, assumptions, isCouple && gaps.length === 0)

  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        () => {
          // Built from the address bar as it is NOW, not from the render's copy: a second click that lands before the
          // heavy re-render of the first would otherwise start again from the old address and silently undo it.
          const next = new URLSearchParams(window.location.search)
          if (value === null) next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const earliest = useMemo(
    () => (gaps.length > 0 ? null : retireAt(profile.household, assumptionsOf(profile, { year, month }), { stopAtFirstOk: true }).earliestOk),
    [profile, gaps.length, year, month],
  )
  const picked = formatSelections(selections)
  const runs = useMemo(
    () => (gaps.length > 0 ? [] : runSelections(profile, { year, month }, parseSelections(picked, []))),
    [profile, gaps.length, year, month, picked],
  )

  // On a phone the rail shows only its first chips: bring the ones already switched on into view, once, so the page
  // never opens looking as if nothing were selected.
  const compareRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    compareRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [gaps.length])

  const oldest = Math.max(...profile.household.persons.map((p) => year - p.birth.year))
  const firstAge = Math.max(MIN_AGE, oldest)
  const headline = useMemo(
    () => (gaps.length > 0 ? headlineOf(profile.household, assumptionsOf(profile, { year, month }), null, firstAge, oldest) : headlineOf(profile.household, assumptionsOf(profile, { year, month }), earliest, firstAge, oldest)),
    [profile, gaps.length, earliest, firstAge, oldest, year, month],
  )
  const ages = Array.from({ length: MAX_AGE - firstAge + 1 }, (_, i) => firstAge + i)
  // The comparisons as the LAST click left them: the URL (and so `selections`) only catches up when the page has
  // re-rendered, and a quick second tap must build on the first, not on the stale list.
  const pending = useRef<{ text: string; at: number } | null>(null)
  const agesNow = params.get('ages')
  useEffect(() => {
    if (pending.current && agesNow === pending.current.text) pending.current = null
  }, [agesNow])
  const latest = (): Selection[] =>
    pending.current && Date.now() - pending.current.at < 2000 ? parseSelections(pending.current.text, []) : selections
  const commit = (next: Selection[]) => {
    const text = formatSelections(next)
    pending.current = { text, at: Date.now() }
    setParam('ages', text)
  }
  const toggle = (s: Selection) => commit(toggleSelection(latest(), s))
  // A person with no name is « Moi » / « Conjoint·e », as on the profile page.
  const names = profile.household.persons.map((p, i) => p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse))
  const label = useCallback(
    (s: Selection) => {
      if (s === 'plan') return r.compare.plan
      if (!isSplit(s)) return r.compare.age(s)
      const [a, b] = splitAges(s)
      return r.compare.split(names[0] ?? '', a, names[1] ?? '', b)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r, names.join('|')],
  )
  const addSplit = (first: number, second: number) => {
    const s = splitOf(first, second)
    const cur = latest()
    if (!cur.includes(s)) commit(toggleSelection(cur, s))
  }

  const earliestBlock =
    isCouple && gaps.length === 0 ? (
      <div className="surface">
        <EarliestEachPanel household={profile.household} names={names} answer={earliestEachAnswer} maxAge={MAX_AGE} onCompare={addSplit} compareDisabled={selections.length >= MAX_SELECTIONS} />
      </div>
    ) : null
  const details = (
    <>
      <Disclosure label={DEFERRAL_COPY[lang].title}>
        <DeferralPanel household={profile.household} assumptions={assumptions} names={names} />
      </Disclosure>

      <Disclosure label={r.table.title} count={runs.length}>
        <YearTables runs={runs} label={label} />
      </Disclosure>

      <Disclosure label={r.sensitivity.title}>
        <SensitivityPanel household={profile.household} assumptions={assumptions} />
      </Disclosure>

      <Disclosure label={r.params.title}>
        <ParamsPanel />
      </Disclosure>
    </>
  )

  if (gaps.length > 0) {
    return (
      <section className="page-body">
        <PageHead title={r.title} />
        <div className="surface results-gaps">
          <StatusMessage tone="info">{r.gaps.lead}</StatusMessage>
          <ul>
            {gaps.map((g) => (
              <li key={g}>{r.gaps[g]}</li>
            ))}
          </ul>
          <Link className="btn btn--sm" to="/">
            {r.gaps.toProfile}
          </Link>{' '}
          <Link className="btn btn--sm btn--ghost" to="/hypotheses">
            {r.gaps.toAssumptions}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-body">
      <PageHead title={r.title} subtitle={r.verdict.explain(assumptions.horizonAge)} />

      <div className="verdict surface" aria-live="polite">
        <p className="verdict__line">
          {headline.kind === 'none' ? r.verdict.headline.none(MAX_AGE) : headline.kind === 'now' ? r.verdict.headline.now : r.verdict.headline.at(headline.age!, isCouple)}
        </p>
        {headline.kind === 'none' ? (
          <p className="verdict__note">{r.verdict.headline.tryThis}</p>
        ) : (
          <>
            <p className="verdict__note">{r.verdict.headline.holds(assumptions.horizonAge)}</p>
            {headline.earlierAge !== null && headline.earlierShortfallYear !== null && <p className="verdict__note">{r.verdict.headline.earlier(headline.earlierAge, headline.earlierShortfallYear)}</p>}
          </>
        )}
        {/* Simple hides the « Chacun de son côté » panel: one line keeps each person's own answer in view. */}
        {!full && isCouple && earliestEachAnswer && (
          <p className="verdict__note">
            {r.verdict.headline.separately}{' '}
            {earliestEachAnswer
              .filter((a) => a.other)
              .map((a) => {
                const name = names[profile.household.persons.findIndex((p) => p.id === a.id)] ?? ''
                const other = names[profile.household.persons.findIndex((p) => p.id === a.other!.id)] ?? ''
                return a.earliestOk === null ? r.verdict.each.none(name, MAX_AGE, other, a.other!.heldAt) : r.verdict.each.line(name, a.earliestOk, other, a.other!.heldAt)
              })
              .join(' · ')}
          </p>
        )}
        {/* The verdict is an estimate under stated assumptions, and it says so where it is read — not only behind a disclosure. */}
        <p className="verdict__note">{r.verdict.caveat}</p>
      </div>

      {full && earliestBlock}

      <div className="compare" ref={compareRef}>
        <p className="field-row__label" id="compare-label">
          {r.compare.label}
        </p>
        <Rail role="group" aria-labelledby="compare-label">
          <Chip selected={selections.includes('plan')} onClick={() => toggle('plan')}>
            {r.compare.plan}
          </Chip>
          {ages.map((age) => (
            <Chip key={age} selected={selections.includes(age)} onClick={() => toggle(age)}>
              {r.compare.age(age)}
            </Chip>
          ))}
          {selections.filter(isSplit).map((s) => (
            <Chip key={s} selected onClick={() => toggle(s)}>
              {label(s)}
            </Chip>
          ))}
        </Rail>
        {selections.length >= MAX_SELECTIONS && <p className="field-row__hint">{r.compare.max}</p>}
        {selections.includes('plan') && <p className="field-row__hint">{r.compare.planHint}</p>}
        {profile.household.persons.length === 2 && (
          <SplitPicker names={[names[0], names[1]]} defaults={[profile.household.persons[0].retirementAge, profile.household.persons[1].retirementAge === profile.household.persons[0].retirementAge ? Math.min(MAX_AGE, profile.household.persons[0].retirementAge + 5) : profile.household.persons[1].retirementAge]} onAdd={addSplit} disabled={selections.length >= MAX_SELECTIONS} />
        )}
      </div>

      <ul className="scenarios">
        {runs.map(({ selection, result }, i) => (
          <li key={String(selection)} className={`scenario scenario--${SERIES_CLASS[i]} surface`}>
            <p className="scenario__title">
              <span className="scenario__swatch" aria-hidden="true" />
              {r.scenario.retireAt(label(selection))}
            </p>
            <p className={'scenario__verdict' + (result.ok ? '' : ' scenario__verdict--short')}>{result.ok ? r.scenario.works : r.scenario.fails(result.firstShortfallYear!)}</p>
            <p className="scenario__worth mono">{r.scenario.endWorth(formatMoney(result.netWorthAtHorizon, lang))}</p>
          </li>
        ))}
      </ul>

      {runs.length > 0 && (
        <ChartPanel
          runs={runs}
          household={profile.household}
          todayYear={year}
          inflation={assumptions.inflation}
          metric={metric}
          dollars={dollars}
          onMetric={(m) => setParam('metric', m === 'netWorth' ? null : m)}
          onDollars={(d) => setParam('dollars', d === 'today' ? null : d)}
          label={label}
        />
      )}

      {/* Simple keeps the verdict, the comparison and the chart; the rest folds into one « Voir les détails ». */}
      {full ? details : <Disclosure label={t.mode.details}>{earliestBlock}{details}</Disclosure>}

      <NextStep to="/donnees" label={t.next.toData}>
        <p>{t.next.resultsHint}</p>
      </NextStep>
    </section>
  )
}
