import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import { sensitivityAxes } from '../../engine/simulate'
import type { Assumptions, Household } from '../../engine/types'
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
  const [pickedHorizon, setPickedHorizon] = useState<number | null>(null)
  const horizonShown =
    pickedHorizon !== null && axes.horizonAges.includes(pickedHorizon) ? pickedHorizon : axes.horizonAges.includes(assumptions.horizonAge) ? assumptions.horizonAge : axes.horizonAges[0]
  const points = (delta: number) => Math.round(delta * 100)
  const find = (horizonAge: number, returnsDelta: number, inflationDelta: number) =>
    state.cells.find((c) => c.horizonAge === horizonAge && c.returnsDelta === returnsDelta && c.inflationDelta === inflationDelta)

  return (
    <div className="sensitivity" aria-busy={state.status !== 'done'}>
      <p className="field-row__hint">{s.hint}</p>
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
            <TableChooser ariaLabel={s.axes} value={String(horizonShown)} options={axes.horizonAges.map((age) => ({ key: String(age), label: s.horizon(age) }))} onSelect={(k) => setPickedHorizon(Number(k))} />
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
