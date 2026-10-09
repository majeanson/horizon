import { useState } from 'react'
import { useLang, useT } from '../../i18n'
import { useConfirm } from '../../lib/confirm'
import { LIFE_COPY } from '../../lib/lifeCopy'
import { formatMoney } from '../../lib/money'
import { scrollBehavior } from '../../lib/motion'
import { addChild, addSpouse, hasSpouse, removeChild, removeSpouse, setLivesAlone } from '../../lib/profileEdit'
import { setChildSpending } from '../../lib/profileLife'
import { updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip, ChipGroup } from '../Chip'
import { EditField } from '../EditField'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { Cluster } from '../Layout'
import { StatusMessage } from '../StatusMessage'
import { Section } from './shared'

// The household: whether there is a spouse (their own tab, their own numbers), and the children — their birth years, and
// what a child costs inside the budget until they leave home (the plan then drops that part of the working-years spending).

export function FamilySection({ withKids = true }: { /** The children and what each costs: asked only of someone who said there are some (« Ma situation »). */ withKids?: boolean }) {
  const t = useT()
  const { lang } = useLang()
  const lc = LIFE_COPY[lang].children
  const f = t.profile.family
  const profile = useProfile()
  const confirm = useConfirm()
  const spouse = hasSpouse(profile)
  const [year, setYear] = useState('')
  const [bad, setBad] = useState(false)
  const children = profile.household.children ?? []
  const cost = profile.household.childSpending ?? null
  // The years the children who are still at home today will leave: what the plan drops, and from when.
  const leaving = cost === null ? [] : children.filter((born) => today().year - born < cost.untilAge).map((born) => born + cost.untilAge)

  const submitChild = () => {
    // A four-digit year typed as text: digits only, then the same range sentence every NumberField
    // gives — « Valeur invalide. » said nothing about WHAT was permitted.
    const n = /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : NaN
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
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              updateProfile((p) => addSpouse(p, today()))
              // The new column appears far below on a phone with no cue at all: bring it on screen
              // (one frame later — the column mounts with the re-render this update triggers).
              requestAnimationFrame(() => document.getElementById('person-spouse')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }))
            }}
          >
            {f.addSpouse}
          </button>
        )}
      </Cluster>

      {!spouse && (
        <div className="family__alone">
          <Chip selected={profile.household.livesAlone ?? true} onClick={() => updateProfile((p) => setLivesAlone(p, !(p.household.livesAlone ?? true)))}>
            {f.livesAlone}
          </Chip>
          <p className="field-row__hint">{f.livesAloneHint}</p>
        </div>
      )}

      {withKids && (<div className="family__children">
        <p className="field-row__hint">{f.childrenHint}</p>
        {(profile.household.children ?? []).length === 0 ? (
          <p className="field-row__hint">{f.none}</p>
        ) : (
          <ChipGroup label={f.children}>
            {(profile.household.children ?? []).map((y, i) => (
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
        {bad && <StatusMessage tone="error">{t.fields.range('1950', '2100')}</StatusMessage>}
      </div>)}

      {withKids && children.length > 0 && (
        <div className="family__cost">
          <FieldRow label={lc.cost} hint={lc.costHint}>
            {(w) => (
              <NumberField
                kind="money"
                max={1e6}
                value={cost?.perChild ?? 0}
                onChange={(perChild) => updateProfile((p) => setChildSpending(p, perChild > 0 ? { perChild, untilAge: cost?.untilAge ?? 23 } : null))}
                id={w.id}
                ariaDescribedBy={w.describedBy}
              />
            )}
          </FieldRow>
          {cost && (
            <>
              <FieldRow label={lc.leaves} hint={lc.leavesHint}>
                {(w) => (
                  <NumberField kind="int" min={16} max={35} unit={t.fields.years} value={cost.untilAge} onChange={(untilAge) => updateProfile((p) => setChildSpending(p, { perChild: cost.perChild, untilAge }))} id={w.id} ariaDescribedBy={w.describedBy} />
                )}
              </FieldRow>
              <p className="field-row__hint">{leaving.length === 0 ? lc.none : lc.effect(formatMoney(cost.perChild, lang), leaving.length, String(Math.min(...leaving)))}</p>
            </>
          )}
        </div>
      )}
    </Section>
  )
}
