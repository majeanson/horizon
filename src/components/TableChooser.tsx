import type { ReactNode } from 'react'
import { SubTabs, type SubTabOption } from './SubTabs'

// The header of a table that could hold several data sets: instead of stacking one table per scenario (three hypotheses,
// two retirement ages, a table per tax year…) the page shows ONE table and this row picks which set it holds. A short
// label names what is being chosen, the segmented control chooses, and `trailing` carries the table's own action (« Exporter »).
// Built on SubTabs, so it is keyboard-complete and wears a person's colour dot when an option carries `who`.
//
//   <TableChooser label="Scénario" ariaLabel="Scénario affiché" value={key} options={[…]} onSelect={setKey} trailing={<Chip>CSV</Chip>} />
//   <div className="table-wrap">…the ONE table…</div>
//
// Nothing to choose (a single option) → the chooser renders nothing, so a page never shows a picker with one tab.
export function TableChooser<K extends string>({
  label,
  ariaLabel,
  value,
  options,
  onSelect,
  trailing,
}: {
  /** What is being chosen, said in a word (« Scénario »). Optional when each option names itself. */
  label?: string
  ariaLabel: string
  value: K
  options: ReadonlyArray<SubTabOption<K>>
  onSelect: (key: K) => void
  trailing?: ReactNode
}) {
  if (options.length < 2) return trailing ? <div className="table-chooser">{trailing}</div> : null
  return (
    <div className="table-chooser">
      {label && <span className="table-chooser__label">{label}</span>}
      <SubTabs size="mini" ariaLabel={ariaLabel} value={value} options={options} onSelect={onSelect} />
      {trailing}
    </div>
  )
}
