import type { CSSProperties } from 'react'

// HeatGrid — a small grid of figures where the EYE should find the good ones: a real <table> (row and column headers, a caption), each cell WORDS first and a wash second. A wash is never the
// only signal: a figure that fails says so in its text and wears a hatch, the best one carries a printed mark, and the wash is a ramp of ONE hue (more = better), so a reader who sees no colour
// reads the same grid. It prints (the wash is dropped on paper; the mark and the text stay). Use it for a handful of cells — three by three, a strip of ages — never for a data table.
//
//   <HeatGrid caption="…" corner="…" rows={['60', '65', '70']} cols={['60', '65', '70']}
//     cells={[[{ text: '114 k$', heat: 0.1 }, { text: '283 k$', heat: 0.8, mark: 'le meilleur' }, …], …]} />

export interface HeatCellData {
  /** What the cell says, always. */
  text: string
  /** How good, 0 (least) to 1 (most): the strength of the wash. Absent: no wash. */
  heat?: number
  /** The cell fails (the money does not last): hatched, and its text should say so. */
  fail?: boolean
  /** A short word printed under the figure (« le meilleur », « votre choix »): what marks a cell without colour. */
  mark?: string
  /** The cell's full description for a screen reader and a long press. */
  title?: string
}

export function HeatGrid({
  caption,
  corner,
  rows,
  cols,
  cells,
  className,
}: {
  caption: string
  /** The words over the row headers (what the rows are). */
  corner?: string
  rows: readonly string[]
  cols: readonly string[]
  cells: readonly (readonly HeatCellData[])[]
  className?: string
}) {
  return (
    <div className={'table-wrap heat' + (className ? ` ${className}` : '')} role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="heat__caption">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{corner ?? ''}</th>
            {cols.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <th scope="row">{r}</th>
              {cols.map((c, j) => {
                const cell = cells[i]?.[j]
                if (!cell) return <td key={c} />
                const style = cell.heat === undefined ? undefined : ({ '--heat': Math.max(0, Math.min(1, cell.heat)) } as CSSProperties)
                return (
                  <td key={c} className={'heat__cell' + (cell.fail ? ' is-fail' : '') + (cell.mark ? ' is-marked' : '')} style={style} title={cell.title}>
                    <span className="heat__text">{cell.text}</span>
                    {cell.mark && <span className="heat__mark">{cell.mark}</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
