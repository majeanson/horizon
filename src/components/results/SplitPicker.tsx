import { useState } from 'react'
import { useT } from '../../i18n'
import { MAX_AGE, MIN_AGE } from '../../lib/resultsModel'
import { Chip } from '../Chip'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'

// « Chacun son âge » — for a couple, the comparison where the two retire at DIFFERENT ages. The chips above compare
// one age for everyone; this adds a card for « the first at one age, the second at another ». It only builds the
// request (two ages); the page runs it like any other selection.
export function SplitPicker({ names, defaults, onAdd, disabled }: { names: readonly [string, string]; defaults: readonly [number, number]; onAdd: (first: number, second: number) => void; disabled: boolean }) {
  const c = useT().results.compare
  const [first, setFirst] = useState(defaults[0])
  const [second, setSecond] = useState(defaults[1])
  const valid = (n: number) => n >= MIN_AGE && n <= MAX_AGE
  const usable = valid(first) && valid(second) && first !== second
  return (
    <div className="split-picker">
      <p className="field-row__label">{c.splitTitle}</p>
      <p className="field-row__hint">{c.splitHint}</p>
      <FieldRow label={c.splitFor(names[0])}>
        {(w) => <NumberField kind="int" min={MIN_AGE} max={MAX_AGE} value={first} onChange={setFirst} id={w.id} />}
      </FieldRow>
      <FieldRow label={c.splitFor(names[1])}>
        {(w) => <NumberField kind="int" min={MIN_AGE} max={MAX_AGE} value={second} onChange={setSecond} id={w.id} />}
      </FieldRow>
      {first === second && <p className="field-row__hint">{c.splitSame}</p>}
      <Chip onClick={() => usable && !disabled && onAdd(first, second)} disabled={!usable || disabled}>
        {c.splitAdd}
      </Chip>
    </div>
  )
}
