import { useState } from 'react'
import { useLang, useT } from '../../i18n'
import { useConfirm } from '../../lib/confirm'
import { LIFE_COPY } from '../../lib/lifeCopy'
import { formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { scrollBehavior } from '../../lib/motion'
import { addSpouse, hasSpouse, removeChild, removeSpouse, setLivesAlone } from '../../lib/profileEdit'
import { childStage } from '../../engine/lifeEvents'
import { KIDS_COPY } from '../../lib/kidsCopy'
import { CARD_COPY } from '../../lib/cardCopy'
import { addChildCounted, patchChildSpending } from '../../lib/profileLife'
import { KidsCosts } from './KidsCosts'
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
  const f = t.profile.family
  const profile = useProfile()
  const confirm = useConfirm()
  const spouse = hasSpouse(profile)
  const [year, setYear] = useState('')
  const [bad, setBad] = useState(false)
  const cost = profile.household.childSpending ?? null
  const kc = KIDS_COPY[lang]
  const stageOf = (born: number) => childStage(born, today().year, cost?.untilAge ?? 23)

  const submitChild = () => {
    // A four-digit year typed as text: digits only, then the same range sentence every NumberField
    // gives — « Valeur invalide. » said nothing about WHAT was permitted.
    const n = /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : NaN
    if (!Number.isInteger(n) || n < 1950 || n > 2100) return setBad(true)
    setBad(false)
    updateProfile((p) => addChildCounted(p, n))
    setYear('')
  }

  return (
    <Section
      id="famille"
      title={f.title}
      subtitle={CARD_COPY[lang].family}
      details={withKids ? (<><p>{f.childrenHint}</p><p>{kc.planned.hint}</p></>) : undefined}
      concept="famille"
    >
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
        {(profile.household.children ?? []).length === 0 ? (
          <p className="field-row__hint">{f.none}</p>
        ) : (
          <ChipGroup label={f.children}>
            {(profile.household.children ?? []).map((y, i) => (
              <Chip key={`${y}-${i}`} onRemove={() => updateProfile((p) => removeChild(p, i))} removeLabel={f.removeChild(y)}>
                {y} · {kc.stage[stageOf(y)]}
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
        <Cluster>
          <Chip onClick={() => updateProfile((p) => addChildCounted(p, today().year + 1))}>{kc.planned.add}</Chip>
        </Cluster>
      </div>)}

    </Section>
  )
}

// What a child costs, and WHERE it sits: inside the annual budget already, or on top of it. A spending question, so it rides inside the Budget card (BudgetSection),
// right after the two budgets it qualifies — asked only of someone who said there are children (« Ma situation »).
export function ChildCosts({ withKids = true }: { withKids?: boolean }) {
  const t = useT()
  const { lang } = useLang()
  const lc = LIFE_COPY[lang].children
  const kc = KIDS_COPY[lang]
  const profile = useProfile()
  const children = profile.household.children ?? []
  const cost = profile.household.childSpending ?? null
  const stageOf = (born: number) => childStage(born, today().year, cost?.untilAge ?? 23)
  // The years the children who are still at home today will leave: what the plan drops, and from when.
  // The years the children who are AT HOME today will leave (a child still to come is not in today's budget, a grown one is gone): what the plan drops, and from when.
  const leaving = cost === null ? [] : children.filter((born) => stageOf(born) === 'home').map((born) => born + cost.untilAge)
  const coming = cost === null ? [] : children.filter((born) => stageOf(born) === 'future')
  // The cost per child is an average until the person says what they pay. Against a budget they typed from their own accounts it can take most of it: say so, and offer a quarter.
  const budget = profile.household.spending.workingToday
  const kidsTotal = cost === null ? 0 : leaving.length * cost.perChild
  const heavy = cost !== null && !cost.onTop && budget > 0 && leaving.length > 0 && kidsTotal >= budget * 0.5
  const quarter = leaving.length === 0 ? 0 : Math.round((budget * 0.25) / leaving.length / 100) * 100


  return (
    <>
      {withKids && children.length > 0 && (
        <div className="family__cost">
          {cost && (
            <div className="situation__q">
              <p id="child-where" className="situation__question">
                {lc.where}
              </p>
              <Cluster role="radiogroup" aria-labelledby="child-where">
                <Chip radio selected={!cost.onTop} onClick={() => updateProfile((p) => patchChildSpending(p, { onTop: false }))}>
                  {lc.inside}
                </Chip>
                <Chip radio selected={!!cost.onTop} onClick={() => updateProfile((p) => patchChildSpending(p, { onTop: true }))}>
                  {lc.onTop}
                </Chip>
              </Cluster>
              <p className="field-row__hint">{cost.onTop ? lc.onTopHint : lc.insideHint}</p>
            </div>
          )}
          <FieldRow label={lc.cost} help="childCost" hint={lc.costHint}>
            {(w) => (
              <NumberField
                kind="money"
                max={1e6}
                value={cost?.perChild ?? 0}
                onChange={(perChild) => updateProfile((p) => patchChildSpending(p, { perChild }))}
                id={w.id}
                ariaDescribedBy={w.describedBy}
              />
            )}
          </FieldRow>
          {cost && (
            <>
              <FieldRow label={lc.leaves} help="childLeaves" hint={lc.leavesHint}>
                {(w) => (
                  <NumberField kind="int" min={16} max={35} unit={t.fields.years} value={cost.untilAge} onChange={(untilAge) => updateProfile((p) => patchChildSpending(p, { untilAge }))} id={w.id} ariaDescribedBy={w.describedBy} />
                )}
              </FieldRow>
              {/* what leaving home takes out of the budget: only said when a flat amount per child at home is stated (the amounts by age are for a child still to come) */}
              {heavy && (
                <>
                  <StatusMessage tone="info">{lc.heavy(leaving.length, formatMoney(kidsTotal, lang), formatPct(kidsTotal / budget, lang, 0), formatMoney(budget, lang), formatMoney(Math.max(0, budget - kidsTotal), lang))}</StatusMessage>
                  <Cluster>
                    <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { perChild: quarter }))}>{lc.heavyFix(formatMoney(quarter, lang))}</Chip>
                  </Cluster>
                </>
              )}
              {cost.perChild > 0 && !cost.onTop && <p className="field-row__hint">{leaving.length === 0 ? lc.none : lc.effect(formatMoney(cost.perChild, lang), leaving.length, String(Math.min(...leaving)))}</p>}
              {coming.map((born) => (
                <p key={born} className="field-row__hint">
                  {cost.byAge ? kc.planned.effectBands(String(born), String(born + cost.untilAge)) : kc.planned.effect(String(born), formatMoney(cost.perChild, lang), String(born + cost.untilAge))}
                </p>
              ))}
            </>
          )}
          <KidsCosts />
        </div>
      )}
    </>
  )
}
