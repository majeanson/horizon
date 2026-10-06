import { useT } from '../../i18n'
import { PRESET_KEYS } from '../../engine/assumptionPresets'
import { sensitivityAxes } from '../../engine/simulate'
import type { Assumptions, Household } from '../../engine/types'
import { useSensitivity } from '../../lib/useSensitivity'
import { StatusMessage } from '../StatusMessage'

// « Et si l'avenir est un peu moins bon ? » — the earliest age that lasts when returns, inflation or longevity move.
// Twenty-seven projections, so it runs only when asked, in a worker, and fills in cell by cell.

export function SensitivityPanel({ household, assumptions }: { household: Household; assumptions: Assumptions }) {
  const t = useT()
  const s = t.results.sensitivity
  const { state, run } = useSensitivity()
  const axes = sensitivityAxes(assumptions)
  const points = (delta: number) => Math.round(delta * 100)
  const find = (horizonAge: number, returnsDelta: number, inflationDelta: number) =>
    state.cells.find((c) => c.horizonAge === horizonAge && c.returnsDelta === returnsDelta && c.inflationDelta === inflationDelta)

  return (
    <div className="sensitivity">
      <p className="field-row__hint">{s.hint}</p>
      <div>
        <button type="button" className="btn btn--sm" disabled={state.status === 'running'} onClick={() => run(household, assumptions)}>
          {state.status === 'running' ? s.running : s.run}
        </button>
      </div>
      {state.status !== 'idle' && (
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
