import { useEffect } from 'react'
import { useT } from '../../i18n'
import { PRESET_KEYS } from '../../engine/assumptionPresets'
import { sensitivityAxes } from '../../engine/simulate'
import type { Assumptions, Household } from '../../engine/types'
import { useSensitivity } from '../../lib/useSensitivity'
import { Skeleton } from '../Skeleton'
import { StatusMessage } from '../StatusMessage'

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
      {state.status === 'idle' || (state.presets.length === 0 && state.cells.length === 0) ? (
        <Skeleton count={4} />
      ) : (
        <>
          <div className="table-wrap" role="region" aria-label={s.presetsTitle} tabIndex={0}>
            <table>
              <caption className="sensitivity__caption">{s.presetsTitle}</caption>
              <thead>
                <tr>
                  {PRESET_KEYS.map((key) => (
                    <th key={key} scope="col">
                      {t.assumptions.presets[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {PRESET_KEYS.map((key) => {
                    const verdict = state.presets.find((v) => v.preset === key)
                    return <td key={key}>{verdict === undefined ? '…' : verdict.earliestOk === null ? s.none : verdict.earliestOk}</td>
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="field-row__hint">{s.presetsHint}</p>
          <div className="sensitivity__grids">
            {axes.horizonAges.map((horizonAge) => (
              <div key={horizonAge} className="table-wrap" role="region" aria-label={s.horizon(horizonAge)} tabIndex={0}>
                <table>
                  <caption className="sensitivity__caption">{s.horizon(horizonAge)}</caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        {s.returns} ↓ · {s.inflation} →
                      </th>
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
                            <td key={id} className={rd === 0 && id === 0 ? 'is-base' : undefined}>
                              {cell === undefined ? '…' : cell.earliestOk === null ? s.none : cell.earliestOk}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <StatusMessage tone="info">{s.note}</StatusMessage>
        </>
      )}
    </div>
  )
}
