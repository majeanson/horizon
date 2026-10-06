import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Disclosure } from '../components/Disclosure'
import { Rail } from '../components/Layout'
import { PageHead } from '../components/PageHead'
import { ChartPanel } from '../components/results/ChartPanel'
import { ParamsPanel } from '../components/results/ParamsPanel'
import { SensitivityPanel } from '../components/results/SensitivityPanel'
import { YearTables } from '../components/results/YearTables'
import { StatusMessage } from '../components/StatusMessage'
import { retireAt } from '../engine/retireAt'
import { useLang, useT } from '../i18n'
import type { Dollars, Metric } from '../lib/chartData'
import { formatMoney } from '../lib/money'
import { profileGaps } from '../lib/profileGaps'
import { MAX_AGE, MAX_SELECTIONS, MIN_AGE, assumptionsOf, defaultSelections, formatSelections, parseSelections, runSelections, toggleSelection, type Selection } from '../lib/resultsModel'
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
  const [params, setParams] = useSearchParams()
  const { year, month } = today()
  const selections = parseSelections(params.get('ages'), defaultSelections(profile.household))
  const metric: Metric = params.get('metric') === 'income' ? 'income' : 'netWorth'
  const dollars: Dollars = params.get('dollars') === 'nominal' ? 'nominal' : 'today'
  const gaps = profileGaps(profile)
  const assumptions = assumptionsOf(profile, { year, month })

  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
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
  const ages = Array.from({ length: MAX_AGE - firstAge + 1 }, (_, i) => firstAge + i)
  const toggle = (s: Selection) => setParam('ages', formatSelections(toggleSelection(selections, s)))
  const label = useCallback((s: Selection) => (s === 'plan' ? r.compare.plan : r.compare.age(s)), [r])

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
        <p className="verdict__line">{earliest === null ? r.verdict.none(firstAge, MAX_AGE) : r.verdict.ok(earliest)}</p>
        {earliest !== null && profile.household.persons.length > 1 && <p className="verdict__note">{r.verdict.together}</p>}
        {/* The verdict is an estimate under stated assumptions, and it says so where it is read — not only behind a disclosure. */}
        <p className="verdict__note">{r.verdict.caveat}</p>
      </div>

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
        </Rail>
        {selections.length >= MAX_SELECTIONS && <p className="field-row__hint">{r.compare.max}</p>}
        {selections.includes('plan') && <p className="field-row__hint">{r.compare.planHint}</p>}
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

      <Disclosure label={r.table.title} count={runs.length}>
        <YearTables runs={runs} label={label} />
      </Disclosure>

      <Disclosure label={r.sensitivity.title}>
        <SensitivityPanel household={profile.household} assumptions={assumptions} />
      </Disclosure>

      <Disclosure label={r.params.title}>
        <ParamsPanel />
      </Disclosure>
    </section>
  )
}
