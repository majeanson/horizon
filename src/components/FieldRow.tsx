import { useId, type ReactNode } from 'react'
import type { InfoId } from '../i18n'
import { useGuided } from '../lib/guide'
import { FactMark } from './FactMark'
import { FieldInfo } from './FieldInfo'
import { glossed } from './Gloss'

// One labelled field of a form: the label on its own line with, at its right, the ⓘ and — for a figure a document
// confirms — the « estimé / confirmé » mark; the box under them, with the whole width; a quiet hint under the box.
// Every number of the profile and the assumptions is one of these, so « the label is tied to the box, the hint is
// read with it, and the ⓘ names the field it explains » is true everywhere by construction.
//
// The ⓘ and the mark sit on the LABEL line, not beside the box: on a 360 px phone, box + clear ✕ + unit + mark + ⓘ on
// one line left the box half its width, too narrow for « 1 000 000 ».
//
// The control is a render function that receives the ids it must wire (`id` for the box, `describedBy` for
// the hint), so the caller never invents either.
//
//   <FieldRow label="Solde" infoId="rrspBalance" hint="…">
//     {(a) => <NumberField kind="money" value={…} onChange={…} id={a.id} ariaDescribedBy={a.describedBy} />}
//   </FieldRow>
export function FieldRow({
  label,
  infoId,
  hint,
  fact,
  children,
}: {
  label: string
  infoId?: InfoId
  hint?: ReactNode
  /** The figure this row holds, when it is one a person confirms against a document (lib/facts.ts). */
  fact?: string
  children: (wire: { id: string; describedBy: string | undefined }) => ReactNode
}) {
  const id = useId()
  const hintId = useId()
  const guided = useGuided()
  return (
    <div className={'field-row' + (fact !== undefined && guided === fact ? ' field-row--guided' : '')} data-fact={fact}>
      <div className="field-row__head">
        <label className="field-row__label" htmlFor={id}>
          {label}
        </label>
        {(fact !== undefined || infoId) && (
          <span className="field-row__tools">
            {fact !== undefined && <FactMark id={fact} label={label} />}
            {infoId && <FieldInfo id={infoId} label={label} />}
          </span>
        )}
      </div>
      <div className="field-row__control">
        <div className="field-row__box">{children({ id, describedBy: hint ? hintId : undefined })}</div>
      </div>
      {hint && (
        <p id={hintId} className="field-row__hint">
          {glossed(hint)}
        </p>
      )}
    </div>
  )
}
