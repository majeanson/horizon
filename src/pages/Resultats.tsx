import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Disclosure } from '../components/Disclosure'
import { Rail } from '../components/Layout'
import { PageHead } from '../components/PageHead'
import { StatusMessage } from '../components/StatusMessage'
import { retireAt } from '../engine/retireAt'
import { useLang, useT } from '../i18n'
import { formatMoney } from '../lib/money'
import { paramRows, knownYears } from '../lib/paramsView'
import { profileGaps } from '../lib/profileGaps'
import { MAX_AGE, MAX_SELECTIONS, MIN_AGE, assumptionsOf, formatSelections, parseSelections, runSelections, toggleSelection, type Selection } from '../lib/resultsModel'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'

// The answer. A verdict first — the earliest age at which the plan lasts — then the comparison the person
// chooses (« my plan », or one age for everyone), and the year-by-year detail and the parameters behind it for
// whoever wants to check. Nothing is shown until the profile holds enough to mean something (profileGaps).

const SERIES_CLASS = ['accent', 'sky', 'sage', 'berry'] as const

export function Resultats() {
  const t = useT()
  const { lang } = useLang()
  const r = t.results
  const profile = useProfile()
  const [params, setParams] = useSearchParams()
  const { year, month } = today()
  const now = { year, month }
  const selections = parseSelections(params.get('ages'))
  const gaps = profileGaps(profile)
  const assumptions = assumptionsOf(profile, now)

  const earliest = useMemo(
    () => (gaps.length > 0 ? null : retireAt(profile.household, assumptionsOf(profile, { year, month }), { stopAtFirstOk: true }).earliestOk),
    [profile, gaps.length, year, month],
  )
  const picked = formatSelections(selections)
  const runs = useMemo(
    () => (gaps.length > 0 ? [] : runSelections(profile, { year, month }, parseSelections(picked))),
    [profile, gaps.length, year, month, picked],
  )

  // On a phone the rail shows only its first chips: bring the ones already switched on into view, once, so the
  // page never opens looking as if nothing were selected.
  const compareRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    compareRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [gaps.length])

  const oldest = Math.max(...profile.household.persons.map((p) => now.year - p.birth.year))
  const ages = Array.from({ length: MAX_AGE - Math.max(MIN_AGE, oldest) + 1 }, (_, i) => Math.max(MIN_AGE, oldest) + i)
  const toggle = (s: Selection) => setParams({ ages: formatSelections(toggleSelection(selections, s)) }, { replace: true })
  const label = (s: Selection) => (s === 'plan' ? r.compare.plan : r.compare.age(s))

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
        <p className="verdict__line">{earliest === null ? r.verdict.none : r.verdict.ok(earliest)}</p>
        {earliest !== null && profile.household.persons.length > 1 && <p className="verdict__note">{r.verdict.together}</p>}
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

      <Disclosure label={r.table.title} count={runs.length}>
        {runs.map(({ selection, result }) => (
          <div key={String(selection)} className="year-table">
            <h3 className="year-table__title">{r.scenario.retireAt(label(selection))}</h3>
            <div className="table-wrap" role="region" aria-label={`${r.table.title} — ${label(selection)}`} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{r.table.year}</th>
                    <th scope="col">{r.table.ages}</th>
                    <th scope="col">{r.table.income}</th>
                    <th scope="col">{r.table.tax}</th>
                    <th scope="col">{r.table.spending}</th>
                    <th scope="col">{r.table.shortfall}</th>
                    <th scope="col">{r.table.netWorth}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.year} className={row.household.shortfall > 0 ? 'is-short' : undefined}>
                      <th scope="row">
                        {row.year}
                        {row.projected && <span className="projected mono"> {t.common.projected}</span>}
                      </th>
                      <td>{Object.values(row.persons).map((p) => p.age).join(' / ')}</td>
                      <td>{formatMoney(row.household.grossIncome, lang)}</td>
                      <td>{formatMoney(row.household.tax, lang)}</td>
                      <td>{formatMoney(row.household.spending, lang)}</td>
                      <td>{row.household.shortfall > 0 ? formatMoney(row.household.shortfall, lang) : '—'}</td>
                      <td>{formatMoney(row.household.netWorthEnd, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Disclosure>

      <Disclosure label={r.params.title}>
        <p className="field-row__hint">{r.params.note}</p>
        {knownYears().map((year) => {
          const rows = paramRows(year)
          return (
            <div key={year} className="params">
              <h3 className="year-table__title">
                {r.params.year(year)} · {r.params.count(rows.length)}
              </h3>
              <div className="table-wrap" role="region" aria-label={r.params.year(year)} tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{r.params.figure}</th>
                      <th scope="col">{r.params.value}</th>
                      <th scope="col">{r.params.source}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.path}>
                        <th scope="row" className="mono">{row.path}</th>
                        <td className="params__value">{row.value}</td>
                        <td>
                          <a href={row.url} target="_blank" rel="noopener noreferrer">
                            {row.title}
                          </a>{' '}
                          <span className="mono">{r.params.retrieved(row.retrieved)}</span>
                          {row.verify && <span className="params__verify mono"> · {r.params.toVerify}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </Disclosure>
    </section>
  )
}
