import { useState } from 'react'
import type { AccountKind } from '../engine/types'
import { Chip } from '../components/Chip'
import { ASSUMPTION_PRESETS, presetOf, type PresetKey } from '../engine/assumptionPresets'
import { impactOf, type ImpactField } from '../engine/assumptionImpact'
import { ImpactMeter } from '../components/ImpactMeter'
import { NextStep } from '../components/NextStep'
import { FieldRow } from '../components/FieldRow'
import { Icon } from '../components/Icon'
import { NumberField } from '../components/NumberField'
import { PageHead } from '../components/PageHead'
import { Section } from '../components/profile/shared'
import { StatusMessage } from '../components/StatusMessage'
import { SubTabs } from '../components/SubTabs'
import { useLang, useT } from '../i18n'
import { useConfirm } from '../lib/confirm'
import { factId } from '../lib/facts'
import { formatPct } from '../lib/format'
import { applyPreset, restoreCustom, sameScenario, scenarioOf, setAssumptions, setReturn, setSpending } from '../lib/profileEdit'
import { profileGaps } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'
import { MARKET_COPY } from '../lib/marketCopy'
import { useNotice } from '../lib/toast'

// What the household assumes about the future, and what it spends. These are the person's own numbers: nothing
// here is an official figure, and the page says so. Each change is one pure profile edit (lib/profileEdit.ts).
export function Hypotheses() {
  const t = useT()
  const a = t.assumptions
  const profile = useProfile()
  const { assumptions, household } = profile
  const gaps = profileGaps(profile)
  const { lang } = useLang()
  const confirm = useConfirm()
  const notice = useNotice()
  const kept = profile.customScenario
  const active = presetOf(assumptions)
  const m = MARKET_COPY[lang]
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const presetSummary = (key: PresetKey | 'kept') => {
    const v = key === 'kept' ? kept! : ASSUMPTION_PRESETS[key]
    const pct = (x: number) => formatPct(x, lang, 1)
    return a.presets.summary(pct(v.inflation), pct(v.wageGrowth), [v.returns.rrsp, v.returns.tfsa, v.returns.nonReg].map(pct).join(' / '), v.horizonAge)
  }
  const impact = t.assumptions.impact
  /** The meter for one assumption: where the value sits against the three scenarios, and why it matters. */
  const meter = (field: ImpactField, value: number) => {
    const { level, tilt } = impactOf(field, value)
    const side = level === 'below' ? 'low' : level === 'above' ? 'high' : level
    return <ImpactMeter level={level} tilt={tilt} levelLabel={impact.level[level]} tiltLabel={impact.tilt[tilt]} why={impact.why[field][side]} whyTitle={impact.whyTitle} outside={impact.outside} />
  }
  const accountName: Record<AccountKind, string> = { nonReg: a.returns.nonReg, rrsp: a.returns.rrsp, tfsa: a.returns.tfsa }
  return (
    <section className="page-body">
      <PageHead title={a.title} subtitle={a.subtitle} />

      <Section title={a.presets.title} subtitle={a.presets.hint} icon="sliders-horizontal-bold">
        <SubTabs<PresetKey | 'custom'>
          ariaLabel={a.presets.label}
          value={active ?? 'custom'}
          options={[
            ...(['prudent', 'neutral', 'bold'] as const).map((key) => ({ key, label: a.presets[key], tone: key })),
            // « Personnalisé » stays on offer while one is kept aside, so a ready-made scenario can be tried and left again.
            ...(active === null || kept !== null ? [{ key: 'custom' as const, label: a.presets.custom }] : []),
          ]}
          onSelect={async (key) => {
            if (key === 'custom') {
              // Back to the kept hand-typed scenario (already the one in use: nothing to do).
              if (active !== null) updateProfile(restoreCustom)
              return
            }
            // Leaving the person's OWN scenario keeps it aside (« Personnalisé » takes it back), so nothing is lost and nothing is asked —
            // except when that would replace a DIFFERENT one already kept: then it says so first.
            if (active === null) {
              if (kept !== null && !sameScenario(kept, scenarioOf(assumptions)) && !(await confirm({ message: a.presets.confirmReplace(a.presets[key]), confirmLabel: a.presets.confirmLabel, tone: 'default' }))) return
              notice(a.presets.kept)
            }
            updateProfile((p) => applyPreset(p, key))
          }}
        />
        <p className="field-row__hint">{active === null ? a.presets.blurb.custom : a.presets.blurb[active]}</p>
        {active !== null && <p className="field-row__hint mono">{presetSummary(active)}</p>}
        {/* What « Personnalisé » holds while a ready-made scenario is on: the figures can be seen before going back to them. */}
        {active !== null && kept !== null && <p className="field-row__hint mono">{a.presets.keptSummary(presetSummary('kept'))}</p>}
        <div className="preset-sources">
          {/* Folded by default: the provenance is for whoever asks, not for everyone who lands here. */}
          <Chip selected={sourcesOpen} expanded={sourcesOpen} onClick={() => setSourcesOpen((o) => !o)}>
            {a.presets.sourceTitle}
          </Chip>
          {sourcesOpen && (
            <>
              <StatusMessage tone="info">{a.presets.source}</StatusMessage>
              <ul className="info-links">
                {a.presets.links.map((l) => (
                  <li key={l.url}>
                    <a className="info-note__link" href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <Icon name="arrow-up-right-bold" size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Section>

      <Section title={a.spending.title} icon="house-bold">
        <FieldRow label={a.spending.working} infoId="spendingWorking" hint={a.spending.hint} fact={factId('household', 'spendingWorking')}>
          {(w) => <NumberField kind="money" max={1e8} value={household.spending.workingToday} onChange={(workingToday) => updateProfile((p) => setSpending(p, { workingToday }))} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
        <FieldRow label={a.spending.retired} infoId="spendingRetired" fact={factId('household', 'spendingRetired')}>
          {(w) => <NumberField kind="money" max={1e8} value={household.spending.retiredToday} onChange={(retiredToday) => updateProfile((p) => setSpending(p, { retiredToday }))} id={w.id} />}
        </FieldRow>
      </Section>

      <Section title={a.economy.title} icon="chart-line-up-bold">
        <FieldRow label={a.economy.inflation} infoId="inflation" hint={a.economy.inflationHint}>
          {(w) => <NumberField kind="percent" min={-0.02} max={0.15} value={assumptions.inflation} onChange={(inflation) => updateProfile((p) => setAssumptions(p, { inflation }))} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
        {meter('inflation', assumptions.inflation)}
        <FieldRow label={a.economy.wageGrowth} infoId="wageGrowth" hint={a.economy.wageHint}>
          {(w) => <NumberField kind="percent" min={-0.02} max={0.15} value={assumptions.wageGrowth} onChange={(wageGrowth) => updateProfile((p) => setAssumptions(p, { wageGrowth }))} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
        {meter('wageGrowth', assumptions.wageGrowth)}
      </Section>

      <Section title={a.returns.title} subtitle={a.returns.hint} icon="sliders-horizontal-bold">
        {(['rrsp', 'tfsa', 'nonReg'] as const).map((kind) => (
          <FieldRow key={kind} label={accountName[kind]} infoId="returns">
            {(w) => <NumberField kind="percent" min={-0.2} max={0.3} value={assumptions.returns[kind]} onChange={(v) => updateProfile((p) => setReturn(p, kind, v))} id={w.id} />}
          </FieldRow>
        ))}
        {meter('returns', (assumptions.returns.rrsp + assumptions.returns.tfsa + assumptions.returns.nonReg) / 3)}
      </Section>

      <Section title={a.horizon.title} icon="calendar-blank-bold">
        <FieldRow label={a.horizon.age} infoId="horizonAge" hint={a.horizon.hint}>
          {(w) => <NumberField kind="int" min={80} max={110} unit={t.fields.years} value={assumptions.horizonAge} onChange={(horizonAge) => updateProfile((p) => setAssumptions(p, { horizonAge }))} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
        {meter('horizonAge', assumptions.horizonAge)}
      </Section>

      <Section title={a.splitting.title} icon="users-three-bold">
        <Chip selected={assumptions.pensionSplitting} onClick={() => updateProfile((p) => setAssumptions(p, { pensionSplitting: !p.assumptions.pensionSplitting }))}>
          {a.splitting.on}
        </Chip>
        <p className="field-row__hint">{a.splitting.hint}</p>
      </Section>

      <Section title={m.surplus.title} icon="lock-bold">
        <Chip selected={assumptions.surplusToRrsp === true} onClick={() => updateProfile((p) => setAssumptions(p, { surplusToRrsp: p.assumptions.surplusToRrsp !== true }))}>
          {m.surplus.on}
        </Chip>
        <p className="field-row__hint">{m.surplus.hint}</p>
      </Section>

      {gaps.length === 0 ? (
        <NextStep to="/resultats" label={t.next.toResults}>
          <p>{t.next.assumptionsReady}</p>
        </NextStep>
      ) : (
        <NextStep to="/" label={t.next.toProfile}>
          <p>{t.results.gaps.lead} {gaps.map((g) => t.results.gaps[g]).join(' ')}</p>
        </NextStep>
      )}
    </section>
  )
}
