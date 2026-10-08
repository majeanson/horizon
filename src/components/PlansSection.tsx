import { useState } from 'react'
import { useLang } from '../i18n'
import { useConfirm } from '../lib/confirm'
import { PLANS_COPY } from '../lib/plansCopy'
import { cleanPlanName, deletePlan, openPlan, planIsCurrent, savePlan } from '../lib/profileEdit'
import { MAX_PLANS, MAX_PLAN_NAME, type Profile } from '../lib/schema'
import { replaceProfile, updateProfile, useProfile } from '../lib/store'
import { useNotice } from '../lib/toast'
import { Chip } from './Chip'
import { Cluster } from './Layout'
import { Section } from './profile/shared'

// « Mes plans » — named versions of the whole plan, kept in the profile (so they travel with the export). Opening one replaces what is on
// screen, so it asks first in words that say what is lost, and hands the previous profile back to the page for its « rétablir » offer.

export function PlansSection({ onReplace }: { onReplace: (before: Profile) => void }) {
  const { lang } = useLang()
  const c = PLANS_COPY[lang]
  const confirm = useConfirm()
  const notice = useNotice()
  const profile = useProfile()
  const [name, setName] = useState('')
  const clean = cleanPlanName(name)
  const full = profile.plans.length >= MAX_PLANS && !profile.plans.some((x) => x.name === clean)

  const keep = () => {
    if (clean === '' || full) return
    updateProfile((p) => savePlan(p, clean))
    notice(c.kept(clean))
    setName('')
  }

  return (
    <Section title={c.title} subtitle={c.hint} icon="users-three-bold">
      <form
        className="plans__new"
        onSubmit={(e) => {
          e.preventDefault()
          keep()
        }}
      >
        <input className="input" value={name} maxLength={MAX_PLAN_NAME} aria-label={c.nameLabel} placeholder={c.namePlaceholder} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn btn--sm" disabled={clean === '' || full}>
          {c.keep}
        </button>
      </form>
      {full && <p className="field-row__hint">{c.full(MAX_PLANS)}</p>}
      {profile.plans.length === 0 ? (
        <p className="field-row__hint">{c.empty}</p>
      ) : (
        <ul className="plans__list">
          {profile.plans.map((plan) => {
            const same = planIsCurrent(profile, plan.name)
            return (
              <li key={plan.name} className="plans__item">
                <span className="plans__name">
                  <strong>{plan.name}</strong>
                  {same && <span className="field-row__hint"> · {c.current}</span>}
                </span>
                <Cluster>
                  <Chip
                    ariaLabel={`${c.open} — ${plan.name}`}
                    disabled={same}
                    onClick={async () => {
                      if (!(await confirm({ message: c.openConfirm(plan.name), confirmLabel: c.openLabel, tone: 'default' }))) return
                      onReplace(profile)
                      replaceProfile(openPlan(profile, plan.name))
                      notice(c.opened(plan.name))
                    }}
                  >
                    {c.open}
                  </Chip>
                  <Chip
                    ariaLabel={`${c.update} — ${plan.name}`}
                    disabled={same}
                    onClick={async () => {
                      if (!(await confirm({ message: c.updateConfirm(plan.name), confirmLabel: c.updateLabel, tone: 'default' }))) return
                      updateProfile((p) => savePlan(p, plan.name))
                      notice(c.updated(plan.name))
                    }}
                  >
                    {c.update}
                  </Chip>
                  <Chip
                    ariaLabel={`${c.remove} — ${plan.name}`}
                    onClick={async () => {
                      if (!(await confirm({ message: c.removeConfirm(plan.name), confirmLabel: c.removeLabel, tone: 'danger' }))) return
                      updateProfile((p) => deletePlan(p, plan.name))
                      notice(c.removed(plan.name))
                    }}
                  >
                    {c.remove}
                  </Chip>
                </Cluster>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
