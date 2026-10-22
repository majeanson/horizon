import { Link } from 'react-router-dom'
import { childStage } from '../../engine/lifeEvents'
import { useLang, useT } from '../../i18n'
import { DEFAULT_LEAVE_AGE, suggestChildCost } from '../../lib/kidsCost'
import { KIDS_COPY } from '../../lib/kidsCopy'
import { formatMoney } from '../../lib/money'
import { kidsSummary, leaveSummary } from '../../lib/kidsSummary'
import { patchChildSpending, patchKidsEffects } from '../../lib/profileLife'
import { updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { ConceptPip } from '../ConceptPip'
import { Fold } from '../Fold'
import { FieldRow } from '../FieldRow'
import { Cluster } from '../Layout'
import { NumberField } from '../NumberField'

// « Ce que coûte un enfant » — what Statistics Canada says a family like this one spends per child, by the child's age, as a SUGGESTION: an estimate, said so,
// offered with a button and never put over a figure the person typed. It shows once there is a child at home or one still to come. The amounts by age are for a
// child still to come (its cost is ADDED to the budget from its birth); the amount per child at home is what already sits inside the budget and drops when they leave.
export function KidsCosts() {
  const { lang } = useLang()
  const t = useT()
  const k = KIDS_COPY[lang]
  const c = k.cost
  const profile = useProfile()
  const now = today()
  const cost = profile.household.childSpending ?? null
  const untilAge = cost?.untilAge ?? DEFAULT_LEAVE_AGE
  const stages = (profile.household.children ?? []).map((y) => childStage(y, now.year, untilAge))
  const hasFuture = stages.includes('future')
  const hasHome = stages.includes('home')
  const s = suggestChildCost(profile, now.year)
  if (s === null || (!hasFuture && !hasHome)) return null
  const money = (n: number) => formatMoney(n, lang)
  const byAge = cost?.byAge ?? null
  const summary = kidsSummary(profile, now.year)
  const counted = profile.household.kidsEffects?.benefits ?? false
  const leave = profile.household.kidsEffects?.leave ?? null
  const lines = leaveSummary(profile, now.year)
  const people = profile.household.persons
  const nameOf = (id: 'self' | 'spouse') => profile.household.persons.find((x) => x.id === id)?.name.trim() || (id === 'self' ? t.profile.self : t.profile.spouse)
  const otherOf = (id: 'self' | 'spouse') => (id === 'self' ? 'spouse' : 'self')
  const b = k.benefits

  return (
    <div className="kids-cost">
      {/* The numbers themselves — what a child costs by age, what the state pays back — are READ on Ma fiche; what acts on them is chosen here. */}
      <p className="field-row__hint">
        <ConceptPip id="enfants" size="sm" /> <strong>{c.title}</strong> <span className="mono">({c.estimated})</span> · <Link className="info-note__link" to="/fiche?bloc=enfants">{k.cost.seeSheet}</Link>
      </p>
      <Cluster>
        {hasFuture && !byAge && <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { byAge: s.bands }))}>{c.useAll}</Chip>}
        {hasHome && s.perChildNow !== null && (cost?.perChild ?? 0) !== s.perChildNow && <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { perChild: s.perChildNow! }))}>{c.useNow(money(s.perChildNow))}</Chip>}
        {!hasHome && hasFuture && (cost?.perChild ?? 0) === 0 && <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { perChild: s.perChildAverage }))}>{c.useAverage(money(s.perChildAverage))}</Chip>}
      </Cluster>

      {byAge && (
        <div className="kids-cost__edit" role="group" aria-label={c.byAgeTitle}>
          <p className="field-row__hint">{c.byAgeTitle}</p>
          {byAge.map((value, i) => (
            <FieldRow key={c.bands[i]} label={c.bands[i]} help="childCostByAge">
              {(w) => (
                <NumberField
                  kind="money"
                  max={1e6}
                  value={value}
                  onChange={(v) => updateProfile((p) => patchChildSpending(p, { byAge: byAge.map((x, j) => (j === i ? v : x)) as [number, number, number, number] }))}
                  id={w.id}
                />
              )}
            </FieldRow>
          ))}
          <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { byAge: null }))}>{c.byAgeClear}</Chip>
        </div>
      )}

      {summary && (
        <div className="kids-benefits">
          <Chip selected={counted} onClick={() => updateProfile((p) => patchKidsEffects(p, { benefits: !counted }))}>
            {b.toggle}
          </Chip>
        </div>
      )}

      <div className="kids-benefits">
        <Chip selected={profile.household.kidsEffects?.qppExclusion ?? false} onClick={() => updateProfile((p) => patchKidsEffects(p, { qppExclusion: !(p.household.kidsEffects?.qppExclusion ?? false) }))}>
          {k.qpp.toggle}
        </Chip>
      </div>

      {hasFuture && (
        <div className="kids-leave">
          <Chip selected={leave !== null} onClick={() => updateProfile((p) => patchKidsEffects(p, { leave: leave ? null : { birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 } }))}>
            {k.leave.toggle}
          </Chip>
          {leave && (
            <>
              {people.length > 1 && (
                <Cluster role="radiogroup" aria-label={k.leave.birthParent}>
                  {people.map((x) => (
                    <Chip key={x.id} radio selected={leave.birthParent === x.id} onClick={() => updateProfile((p) => patchKidsEffects(p, { leave: { ...leave, birthParent: x.id } }))}>
                      {k.leave.birthParent} : {nameOf(x.id)}
                    </Chip>
                  ))}
                </Cluster>
              )}
              {/* One adult: the leave is theirs alone — written as such, so a share kept from a former second parent can never count against the 32 weeks. */}
              <FieldRow label={k.leave.weeksOf(nameOf(people.length > 1 ? leave.birthParent : 'self'))} help="parentalLeaveWeeks">
                {(w) => (
                  <NumberField kind="int" min={0} max={32 - (people.length > 1 ? leave.otherParentWeeks : 0)} value={leave.birthParentWeeks} onChange={(birthParentWeeks) => updateProfile((p) => patchKidsEffects(p, { leave: people.length > 1 ? { ...leave, birthParentWeeks } : { birthParent: 'self', birthParentWeeks, otherParentWeeks: 0 } }))} id={w.id} />
                )}
              </FieldRow>
              {people.length > 1 && (
                <FieldRow label={k.leave.weeksOf(nameOf(otherOf(leave.birthParent)))} help="parentalLeaveWeeks">
                  {(w) => (
                    <NumberField kind="int" min={0} max={32 - leave.birthParentWeeks} value={leave.otherParentWeeks} onChange={(otherParentWeeks) => updateProfile((p) => patchKidsEffects(p, { leave: { ...leave, otherParentWeeks } }))} id={w.id} />
                  )}
                </FieldRow>
              )}
              {lines?.map((l) => (l.weeks > 0 ? <p key={l.person}>{k.leave.line(nameOf(l.person), l.weeks, money(Math.round(l.lostPay)), money(Math.round(l.benefit)))}</p> : null))}
              <Fold summary={t.common.howToRead}>
                <p className="field-row__hint">{k.leave.hint}</p>
              </Fold>
            </>
          )}
        </div>
      )}

      {/* What the toggles mean — one tap away; the numbers they act on are on Ma fiche. */}
      <Fold summary={t.common.moreDetails}>
        <p className="field-row__hint">{b.note}</p>
        <p className="field-row__hint">{k.qpp.note}</p>
      </Fold>
    </div>
  )
}
