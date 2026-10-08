import { useEffect } from 'react'
import { useT } from '../../i18n'
import { sensitivityAxes } from '../../engine/simulate'
import type { Assumptions, Household } from '../../engine/types'
import { useParamChoice } from '../../lib/useParamChoice'
import { useSensitivity } from '../../lib/useSensitivity'
import { Skeleton } from '../Skeleton'
import { StatusMessage } from '../StatusMessage'
import { TableChooser } from '../TableChooser'

// « Et si l'avenir est un peu moins bon ? » — the earliest age that lasts when returns, inflation or longevity move.
// Twenty-seven projections: they run by themselves, in a worker, cell by cell — but LAST, well behind the page's
// first paint and the verdict (the longest wait on the page belongs to the least urgent answer).

export function SensitivityPanel({ household, assumptions }: { household: Household; assumptions: Assumptions }) {
  const t = useT()
  const s = t.results.sensitivity
  const { state, run } = useSensitivity()
  // Restarted whenever the question changes; `run` cancels the worker already on its way.
  const key = JSON.stringify({ household, assumptions })
  useEffect(() => {
    const starter = setTimeout(() => run(household, assumptions), 600)
    return () => clearTimeout(starter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, run])
  const axes = sensitivityAxes(assumptions)
  // One grid at a time: the horizon is chosen in the table's header (the plan's own horizon first).
  const horizonKeys = axes.horizonAges.map(String)
  const [horizonKey, setHorizonKey] = useParamChoice('horizon', horizonKeys, horizonKeys.includes(String(assumptions.horizonAge)) ? String(assumptions.horizonAge) : horizonKeys[0])
  const horizonShown = Number(horizonKey)
  const points = (delta: number) => Math.round(delta * 100)
  const find = (horizonAge: number, returnsDelta: number, inflationDelta: number) =>
    state.cells.find((c) => c.horizonAge === horizonAge && c.returnsDelta === returnsDelta && c.inflationDelta === inflationDelta)
  // The one sentence over the grid: what the two moves that matter most do to the age, read off the cells themselves.
  const base = find(horizonShown, 0, 0)
  const moved = (cell: ReturnType<typeof find>) => {
    if (base === undefined || cell === undefined || base.earliestOk === null) return null
    if (cell.earliestOk === null) return s.noAge
    const years = cell.earliestOk - base.earliestOk
    return years <= 0 ? s.sameAge : s.laterBy(years)
  }
  const lessReturns = moved(find(horizonShown, -0.01, 0))
  const moreInflation = moved(find(horizonShown, 0, 0.01))

  return (
    <div className="sensitivity" aria-busy={state.status !== 'done'}>
      <p className="field-row__hint">{s.hint}</p>
      {lessReturns !== null && moreInflation !== null && <p className="answer__note sensitivity__sowhat">{s.soWhat(lessReturns, moreInflation)}</p>}
      {state.status === 'running' && (
        <p className="bridge__updating" role="status">
          {s.running}
        </p>
      )}
      {state.status === 'idle' || state.cells.length === 0 ? (
        <Skeleton count={4} />
      ) : (
        <>
          <div className="sensitivity__grids">
            <TableChooser ariaLabel={s.axes} value={horizonKey} options={axes.horizonAges.map((age) => ({ key: String(age), label: s.horizon(age) }))} onSelect={setHorizonKey} />
            {[horizonShown].map((horizonAge) => {
              // The grid's story is « how fast does the answer degrade » — told by tone, not only by
              // reading 27 numbers: later-than-base cells are tinted, no-age-lasts cells are dark.
              const base = find(horizonAge, 0, 0)
              const cellClass = (rd: number, id: number, cell: ReturnType<typeof find>) => {
                if (rd === 0 && id === 0) return 'is-base'
                if (cell === undefined) return undefined
                if (cell.earliestOk === null) return 'sensitivity__cell--none'
                if (base !== undefined && base.earliestOk !== null && cell.earliestOk > base.earliestOk) return 'sensitivity__cell--later'
                return undefined
              }
              return (
              <div key={horizonAge} className="table-wrap" role="region" aria-label={s.horizon(horizonAge)} tabIndex={0}>
                <table>
                  <caption className="sr-only">{s.horizon(horizonAge)}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{s.axes}</th>
                      {axes.inflationDeltas.map((d) => (
                        <th key={d} scope="col">
                          {s.delta(points(d))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {axes.returnsDeltas.map((rd) => (
                      <tr key={rd}>
                        <th scope="row">{s.delta(points(rd))}</th>
                        {axes.inflationDeltas.map((id) => {
                          const cell = find(horizonAge, rd, id)
                          return (
                            <td key={id} className={cellClass(rd, id, cell)}>
                              {cell === undefined ? '…' : cell.earliestOk === null ? s.none : cell.earliestOk}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            })}
          </div>
          <StatusMessage tone="info">{s.note}</StatusMessage>
        </>
      )}
    </div>
  )
}
