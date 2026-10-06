import { useId, type ReactNode } from 'react'
import type { InfoId } from '../i18n'
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
  children,
}: {
  label: string
  infoId?: InfoId
  hint?: ReactNode
  children: (wire: { id: string; describedBy: string | undefined }) => ReactNode
}) {
  const id = useId()
  const hintId = useId()
  return (
    <div className="field-row">
      <label className="field-row__label" htmlFor={id}>
        {label}
      </label>
      <div className="field-row__control">
        <div className="field-row__box">{children({ id, describedBy: hint ? hintId : undefined })}</div>
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
