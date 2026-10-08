import { useId, type ReactNode } from 'react'
import type { InfoId } from '../i18n'
import { useGuided } from '../lib/guide'
import { FactMark } from './FactMark'
import { FieldInfo } from './FieldInfo'

// One labelled field of a form: the label above, the control with its ⓘ beside it, a quiet hint under. Every
// number of the profile and the assumptions is one of these, so « the label is tied to the box, the hint is
// read with it, and the ⓘ names the field it explains » is true everywhere by construction.
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
      <label className="field-row__label" htmlFor={id}>
        {label}
      </label>
      <div className={'field-row__control' + (fact !== undefined ? ' field-row__control--fact' : '')}>
        <div className="field-row__box">{children({ id, describedBy: hint ? hintId : undefined })}</div>
        {fact !== undefined && <FactMark id={fact} label={label} />}
        {infoId && <FieldInfo id={infoId} label={label} />}
      </div>
      {hint && (
        <p id={hintId} className="field-row__hint">
          {hint}
        </p>
      )}
    </div>
  )
}
