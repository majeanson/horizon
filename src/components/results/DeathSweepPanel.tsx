import { useState } from 'react'
import type { StrategyKey } from '../../engine/bridge'
import type { DeathCell, DeathSweep } from '../../engine/deathSweep'
import { useLang } from '../../i18n'
import type { BridgeCopy } from '../../lib/bridgeCopy'
import { formatDecimal } from '../../lib/format'
import { formatCompactMoney } from '../../lib/money'
import { useWide } from '../../lib/useWide'
import { Chip } from '../Chip'
import { Skeleton } from '../Skeleton'

// « Et si l'un de nous décède plus tôt ? » — the timing of the pensions seen from a short life. One table: a row for every way of starting, a column for
// every age a life might end at; three things to read in it (what the person was paid, what the household owns at the end, what the survivor was
// paid), one at a time. The best of a column is marked, a cell where the money would run out says so. engine/deathSweep.ts says where the figures come from.

type Metric = 'pensions' | 'nest' | 'survivor'

const valueOf = (c: DeathCell, m: Metric): number => (m === 'pensions' ? c.ownPensions : m === 'nest' ? c.netWorthEnd : c.survivorRrq)

export function DeathSweepPanel({ sweep, copy, who, couple, hideMine, label }: { sweep: DeathSweep | undefined; copy: BridgeCopy; who: string | null; couple: boolean; hideMine: boolean; label: (k: StrategyKey) => string }) {
  const { lang } = useLang()
  const wide = useWide()
  const c = copy.sweep
  // On a phone six columns need short figures: thousands and millions, no cents, no sign.
  const compact = (n: number): string => {
    const f = (x: number, d: number) => formatDecimal(x, lang, d)
    return n >= 1e6 ? `${f(n / 1e6, 1)} M` : `${f(Math.round(n / 1e3), 0)} k`
  }
  const show = (n: number): string => (wide ? formatCompactMoney(n, lang) : compact(n))
  const [metric, setMetric] = useState<Metric>('pensions')
  const metrics: Metric[] = couple ? ['pensions', 'nest', 'survivor'] : ['pensions', 'nest']
  const shownMetric: Metric = metrics.includes(metric) ? metric : 'pensions'
  const rows = sweep?.rows.filter((r) => !(r.key === 'mine' && hideMine)) ?? []
  return (
    <div className="sweep">
      <h3 className="bridge__heading">{c.title(who)}</h3>
      <p className="field-row__hint">{c.hint(who)}</p>
      {sweep === undefined ? (
        <>
          <p className="field-row__hint" role="status">
            {c.pending}
          </p>
          <Skeleton count={3} />
        </>
      ) : sweep.ages.length === 0 ? (
        <p className="field-row__hint">{c.empty}</p>
      ) : (
        <>
          <div className="strategies__layout" role="group" aria-label={c.title(who)}>
            {metrics.map((m) => (
              <Chip key={m} selected={shownMetric === m} onClick={() => setMetric(m)}>
                {c.tabs[m]}
              </Chip>
            ))}
          </div>
          <p className="field-row__hint">{c.tabHint[shownMetric]}</p>
          {!wide && (
            <p className="field-row__hint">
              {c.agesNote} {c.unitsNote}
            </p>
          )}
          <div className={'table-wrap strategies__table sweep__table' + (wide ? '' : ' sweep__table--narrow')}>
            <table>
              <caption className="sr-only">{c.tabs[shownMetric]}</caption>
              <thead>
                <tr>
                  <th scope="col">{copy.colStrategy}</th>
                  {sweep.ages.map((age) => (
                    <th key={age} scope="col" className="sweep__age">
                      {wide ? (
                        <>
                          <span className="sweep__dies">{c.diesAt}</span> {copy.age(age)}
                        </>
                      ) : (
                        <>
                          <span className="sr-only">
                            {c.diesAt} {copy.age(age)}
                          </span>
                          <span aria-hidden="true">{age}</span>
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row">{label(r.key)}</th>
                    {r.cells.map((cell, i) => {
                      const col = rows.map((x) => valueOf(x.cells[i], shownMetric))
                      const top = Math.max(...col)
                      const best = rows.length > 1 && valueOf(cell, shownMetric) === top && top > 0
                      const bad = shownMetric !== 'pensions' && !cell.ok
                      return (
                        <td key={sweep.ages[i]} className={'mono' + (best ? ' is-best' : '') + (bad ? ' is-short' : '')} title={bad ? c.shortCell(cell.firstShortfallAge ?? 0) : undefined}>
                          {bad && <span aria-hidden="true">! </span>}
                          {shownMetric === 'survivor' && valueOf(cell, shownMetric) === 0 ? copy.noWorth : show(valueOf(cell, shownMetric))}
                          {bad && <span className="sr-only"> ({c.shortCell(cell.firstShortfallAge ?? 0)})</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-row__hint">
            {wide ? c.best : c.bestNarrow}
            {shownMetric !== 'pensions' && <> · {c.short}</>}
          </p>
        </>
      )}
    </div>
  )
}
