import { useState } from 'react'
import { useT } from '../../i18n'
import { useConfirm } from '../../lib/confirm'
import { addChild, addSpouse, hasSpouse, removeChild, removeSpouse } from '../../lib/profileEdit'
import { updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip, ChipGroup } from '../Chip'
import { EditField } from '../EditField'
import { Cluster } from '../Layout'
import { StatusMessage } from '../StatusMessage'
import { Section } from './shared'

// The household: whether there is a spouse (their own tab, their own numbers), and the children — birth years
// only, noted for the record because this version computes no child benefits.

export function FamilySection() {
  const t = useT()
  const f = t.profile.family
  const profile = useProfile()
  const confirm = useConfirm()
  const spouse = hasSpouse(profile)
  const [year, setYear] = useState('')
  const [bad, setBad] = useState(false)

  const submitChild = () => {
    const n = Number(year.trim())
    if (!Number.isInteger(n) || n < 1950 || n > 2100) return setBad(true)
    setBad(false)
    updateProfile((p) => addChild(p, n))
    setYear('')
  }

  return (
    <Section title={f.title} icon="users-three-bold">
      <Cluster>
        {spouse ? (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={async () => {
              if (await confirm({ message: f.removeSpouseConfirm, confirmLabel: t.common.remove })) updateProfile(removeSpouse)
            }}
          >
            {f.removeSpouse}
          </button>
        ) : (
          <button type="button" className="btn btn--sm" onClick={() => updateProfile((p) => addSpouse(p, today()))}>
            {f.addSpouse}
          </button>
        )}
      </Cluster>

      <div className="family__children">
        <p className="field-row__hint">{f.childrenHint}</p>
        {profile.children.length === 0 ? (
          <p className="field-row__hint">{f.none}</p>
        ) : (
          <ChipGroup label={f.children}>
            {profile.children.map((y, i) => (
              <Chip key={`${y}-${i}`} onRemove={() => updateProfile((p) => removeChild(p, i))} removeLabel={f.removeChild(y)}>
                {y}
              </Chip>
            ))}
          </ChipGroup>
        )}
        <EditField
          as="div"
          value={year}
          onChange={(v) => {
            setBad(false)
            setYear(v)
          }}
          onSubmit={submitChild}
          submitLabel={f.addChild}
          inputMode="numeric"
          maxLength={4}
          ariaLabel={f.childYear}
          placeholder={f.childYear}
        />
        {bad && <StatusMessage tone="error">{t.fields.invalid}</StatusMessage>}
      </div>
    </Section>
  )
}
