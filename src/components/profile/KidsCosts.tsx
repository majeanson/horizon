import { useState } from 'react'
import { CHILD_COSTS, CPI_ANNUAL } from '../../engine/params/childCosts'
import { pageFor } from '../../engine/params/twins'
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
import { FieldRow } from '../FieldRow'
import { Cluster } from '../Layout'
import { NumberField } from '../NumberField'

// « Ce que coûte un enfant » — what Statistics Canada says a family like this one spends per child, by the child's age, as a SUGGESTION: an estimate, said so,
// offered with a button and never put over a figure the person typed. It shows once there is a child at home or one still to come. The amounts by age are for a
// child still to come (its cost is ADDED to the budget from its birth); the amount per child at home is what already sits inside the budget and drops when they leave.
const SOURCES = [CHILD_COSTS, CPI_ANNUAL].map((x) => x.source)

export function KidsCosts() {
  const { lang } = useLang()
  const t = useT()
  const k = KIDS_COPY[lang]
  const c = k.cost
  const profile = useProfile()
  const now = today()
  const [how, setHow] = useState(false)
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
      <p className="kids-cost__title">
        <strong>{c.title}</strong> <span className="mono">({c.estimated})</span>
      </p>
      <p className="field-row__hint">{c.lead(c.families[s.family], c.levels[s.level], s.children)}</p>
      <ul className="kids-cost__bands">
        {s.bands.map((b, i) => (
          <li key={c.bands[i]}>{c.bandLine(c.bands[i], money(b))}</li>
        ))}
      </ul>
      {hasHome && s.perChildNow !== null && <p className="field-row__hint">{c.nowHint(money(s.perChildNow))}</p>}
      <Cluster>
        {hasFuture && !byAge && <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { byAge: s.bands }))}>{c.useAll}</Chip>}
        {hasHome && s.perChildNow !== null && (cost?.perChild ?? 0) !== s.perChildNow && <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { perChild: s.perChildNow! }))}>{c.useNow(money(s.perChildNow))}</Chip>}
        {!hasHome && hasFuture && (cost?.perChild ?? 0) === 0 && <Chip onClick={() => updateProfile((p) => patchChildSpending(p, { perChild: s.perChildAverage }))}>{c.useAverage(money(s.perChildAverage))}</Chip>}
      </Cluster>

      {byAge && (
        <div className="kids-cost__edit" role="group" aria-label={c.byAgeTitle}>
          <p className="field-row__hint">{c.byAgeTitle}</p>
          {byAge.map((value, i) => (
            <FieldRow key={c.bands[i]} label={c.bands[i]}>
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
          <p className="kids-cost__title">
            <strong>{b.title}</strong> <span className="mono">({c.estimated})</span>
          </p>
          {summary.atHome && <p>{b.atHome(summary.atHome.children, money(Math.round(summary.atHome.cost)), money(Math.round(summary.atHome.benefit)), money(Math.round(summary.atHome.net)))}</p>}
          {summary.planned && (
            <p>{b.planned(String(summary.planned.born), money(Math.round(summary.planned.cost)), money(Math.round(summary.planned.benefit)), money(Math.round(summary.planned.net)), money(Math.round(summary.planned.lifetime)))}</p>
          )}
          <p className="field-row__hint">{b.note}</p>
          <Chip selected={counted} onClick={() => updateProfile((p) => patchKidsEffects(p, { benefits: !counted }))}>
            {b.toggle}
          </Chip>
        </div>
      )}

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
              <FieldRow label={k.leave.weeksOf(nameOf(leave.birthParent))}>
                {(w) => (
                  <NumberField kind="int" min={0} max={32 - (people.length > 1 ? leave.otherParentWeeks : 0)} value={leave.birthParentWeeks} onChange={(birthParentWeeks) => updateProfile((p) => patchKidsEffects(p, { leave: { ...leave, birthParentWeeks } }))} id={w.id} />
                )}
              </FieldRow>
              {people.length > 1 && (
                <FieldRow label={k.leave.weeksOf(nameOf(otherOf(leave.birthParent)))}>
                  {(w) => (
                    <NumberField kind="int" min={0} max={32 - leave.birthParentWeeks} value={leave.otherParentWeeks} onChange={(otherParentWeeks) => updateProfile((p) => patchKidsEffects(p, { leave: { ...leave, otherParentWeeks } }))} id={w.id} />
                  )}
                </FieldRow>
              )}
              {lines?.map((l) => (l.weeks > 0 ? <p key={l.person}>{k.leave.line(nameOf(l.person), l.weeks, money(Math.round(l.lostPay)), money(Math.round(l.benefit)))}</p> : null))}
              <p className="field-row__hint">{k.leave.hint}</p>
            </>
          )}
        </div>
      )}

      <Chip expanded={how} onClick={() => setHow((v) => !v)}>
        {k.how.open}
      </Chip>
      {how && (
        <div className="kids-cost__how">
          <ul>
            {k.how.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="field-row__hint">{k.how.sources}</p>
          <ul className="kids-cost__sources">
            {SOURCES.map((src) => {
              const page = pageFor(src, lang)
              return (
                <li key={src.url}>
                  <a className="info-note__link" href={page.url} target="_blank" rel="noopener noreferrer">
                    {page.title}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
