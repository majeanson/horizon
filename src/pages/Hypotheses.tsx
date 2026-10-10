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
import { LiveAnswer } from '../components/LiveAnswer'
import { PageHead } from '../components/PageHead'
import { Section } from '../components/profile/shared'
import { StatusMessage } from '../components/StatusMessage'
import { SubTabs } from '../components/SubTabs'
import { Switch } from '../components/Switch'
import { useLang, useT } from '../i18n'
import { useConfirm } from '../lib/confirm'
import { formatPct } from '../lib/format'
import { applyPreset, hasSpouse, mapPerson, resizeMarketPath, restoreCustom, sameScenario, scenarioOf, setAssumptions, setMarketPreset, setMarketYear, setReturn } from '../lib/profileEdit'
import { MARKET_PATHS, MARKET_PRESETS } from '../engine/marketPaths'
import { Cluster } from '../components/Layout'
import { profileGaps } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'
import { LIFE_COPY } from '../lib/lifeCopy'
import { MARKET_COPY } from '../lib/marketCopy'
import { useNotice } from '../lib/toast'

// What the household assumes about the future. These are the person's own numbers: nothing here is an official figure,
// and the page says so. The scenario comes first — it IS the page for most people (the Neutre set is already in place) —
// then the few figures behind it, in plain words, then the two options and the path the markets take. Each change is
// one pure profile edit (lib/profileEdit.ts). What the household SPENDS is a fact about it, not a guess about the
// future: it lives on Profil (« Budget »), with the other facts a document confirms.
export function Hypotheses() {
  const t = useT()
  const a = t.assumptions
  const profile = useProfile()
  const { assumptions } = profile
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
  // ONE return by default: most households hold the same mix in every account, so three boxes plus an averaged meter was
  // extra work. The three open when the rates already differ, or when asked; closing them again makes them equal.
  const { returns } = assumptions
  const sameReturn = returns.rrsp === returns.tfsa && returns.tfsa === returns.nonReg
  const [perAccount, setPerAccount] = useState(!sameReturn)
  const setAllReturns = (v: number) => updateProfile((p) => setAssumptions(p, { returns: { rrsp: v, tfsa: v, nonReg: v } }))
  const averageReturn = (returns.rrsp + returns.tfsa + returns.nonReg) / 3

  return (
    <section className="page-body">
      <LiveAnswer />
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
        {active !== null && <p className="field-row__hint">{presetSummary(active)}</p>}
        {/* What « Personnalisé » holds while a ready-made scenario is on: the figures can be seen before going back to them. */}
        {active !== null && kept !== null && <p className="field-row__hint">{a.presets.keptSummary(presetSummary('kept'))}</p>}
        <div className="preset-sources">
          {/* Folded by default: the provenance is for whoever asks, not for everyone who lands here. */}
          <Chip expanded={sourcesOpen} onClick={() => setSourcesOpen((o) => !o)}>
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

      <Section title={a.returns.title} subtitle={a.returns.hint} icon="chart-line-up-bold">
        {perAccount ? (
          (['rrsp', 'tfsa', 'nonReg'] as const).map((kind) => (
            <FieldRow key={kind} label={accountName[kind]} infoId="returns">
              {(w) => <NumberField kind="percent" min={-0.2} max={0.3} value={assumptions.returns[kind]} onChange={(v) => updateProfile((p) => setReturn(p, kind, v))} id={w.id} />}
            </FieldRow>
          ))
        ) : (
          <FieldRow label={a.returns.all} infoId="returns">
            {(w) => <NumberField kind="percent" min={-0.2} max={0.3} value={returns.rrsp} onChange={setAllReturns} id={w.id} />}
          </FieldRow>
        )}
        <Chip
          expanded={perAccount}
          onClick={() => {
            // Closing the three boxes makes the rates one again: the REER's, the one most people know.
            if (perAccount && !sameReturn) setAllReturns(returns.rrsp)
            setPerAccount((x) => !x)
          }}
        >
          {a.returns.perAccount}
        </Chip>
        {meter('returns', averageReturn)}
      </Section>

      {/* Each person's own age — the scenario's (95 in Neutre) until they set one; a chip gives it back to the scenario. In a couple the
          first death hands the plan to the survivor (engine/projection.ts), so the survivor's spending share sits here too. */}
      <Section title={a.horizon.title} subtitle={a.horizon.hint} icon="calendar-blank-bold">
        {profile.household.persons.map((person, i) => {
          const own = person.horizonAge ?? null
          const name = person.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse)
          return (
            <div key={person.id} className="horizon-person">
              <FieldRow label={profile.household.persons.length === 1 ? a.horizon.age : a.horizon.person(name)} infoId="horizonAge" hint={own === null ? a.horizon.followHint : undefined}>
                {(w) => (
                  <NumberField
                    kind="int"
                    min={50}
                    max={110}
                    unit={t.fields.years}
                    value={own ?? assumptions.horizonAge}
                    onChange={(horizonAge) => updateProfile((p) => mapPerson(p, person.id, (x) => ({ ...x, horizonAge })))}
                    id={w.id}
                    ariaDescribedBy={w.describedBy}
                  />
                )}
              </FieldRow>
              {own !== null && (
                <Cluster>
                  <Chip onClick={() => updateProfile((p) => mapPerson(p, person.id, (x) => ({ ...x, horizonAge: null })))}>{a.horizon.follow(assumptions.horizonAge)}</Chip>
                </Cluster>
              )}
            </div>
          )
        })}
        {meter('horizonAge', Math.max(...profile.household.persons.map((p) => p.horizonAge ?? assumptions.horizonAge)))}
        {hasSpouse(profile) && (
          <FieldRow label={a.horizon.survivor} infoId="survivorSpending" hint={a.horizon.survivorHint}>
            {(w) => (
              <NumberField kind="percent" min={0.3} max={1} value={assumptions.survivorSpending ?? 0.7} onChange={(survivorSpending) => updateProfile((p) => setAssumptions(p, { survivorSpending }))} id={w.id} ariaDescribedBy={w.describedBy} />
            )}
          </FieldRow>
        )}
      </Section>

      <Section title={LIFE_COPY[lang].drift.title} subtitle={LIFE_COPY[lang].drift.hint} icon="chart-line-up-bold">
        <Cluster role="radiogroup" aria-label={LIFE_COPY[lang].drift.title}>
          {[0, -0.01, -0.02].map((v) => (
            <Chip key={v} radio selected={(assumptions.retiredSpendingDrift ?? 0) === v} onClick={() => updateProfile((p) => setAssumptions(p, { retiredSpendingDrift: v }))}>
              {v === 0 ? LIFE_COPY[lang].drift.level : LIFE_COPY[lang].drift.slows(formatPct(-v, lang, 0))}
            </Chip>
          ))}
          {![0, -0.01, -0.02].includes(assumptions.retiredSpendingDrift ?? 0) && (
            <Chip radio selected onClick={() => undefined}>
              {LIFE_COPY[lang].drift.slows(formatPct(-(assumptions.retiredSpendingDrift ?? 0), lang, 1))}
            </Chip>
          )}
        </Cluster>
      </Section>

      <Section title={a.options.title} icon="lock-bold">
        {/* The splitting switch only when there is someone to split with. */}
        {hasSpouse(profile) && <Switch checked={assumptions.pensionSplitting} onChange={(pensionSplitting) => updateProfile((p) => setAssumptions(p, { pensionSplitting }))} label={a.splitting.on} hint={a.splitting.hint} />}
        <Switch checked={assumptions.surplusToRrsp === true} onChange={(surplusToRrsp) => updateProfile((p) => setAssumptions(p, { surplusToRrsp }))} label={m.surplus.on} hint={m.surplus.hint} />
      </Section>

      <Section title={m.path.title} subtitle={m.path.hint} icon="chart-line-up-bold">
        <SubTabs
          ariaLabel={m.path.title}
          value={assumptions.marketPath.preset}
          onSelect={(k) => updateProfile((p) => setMarketPreset(p, k))}
          options={([...MARKET_PRESETS, 'custom'] as const).map((k) => ({ key: k, label: m.path.names[k] }))}
        />
        <p className="field-row__hint">
          {m.path.about[assumptions.marketPath.preset]}
          {assumptions.marketPath.preset !== 'smooth' && assumptions.marketPath.preset !== 'custom' ? ` ${MARKET_PATHS[assumptions.marketPath.preset].map((r) => formatPct(r, lang, 0)).join(' · ')}` : ''}
        </p>
        {assumptions.marketPath.preset === 'custom' && (
          <>
            {assumptions.marketPath.custom.map((v, i) => (
              <FieldRow key={i} label={m.path.year(i + 1)}>
                {(w) => <NumberField kind="percent" min={-0.6} max={0.6} value={v ?? averageReturn} onChange={(x) => updateProfile((p) => setMarketYear(p, i, x))} id={w.id} />}
              </FieldRow>
            ))}
            <Cluster>
              <Chip icon="plus-bold" onClick={() => updateProfile((p) => resizeMarketPath(p, 1, (p.assumptions.returns.rrsp + p.assumptions.returns.tfsa + p.assumptions.returns.nonReg) / 3))}>{m.path.add}</Chip>
              <Chip icon="minus-bold" onClick={() => updateProfile((p) => resizeMarketPath(p, -1, 0))}>{m.path.remove}</Chip>
            </Cluster>
            <p className="field-row__hint">{m.path.countsFrom}</p>
          </>
        )}
      </Section>

      {gaps.length === 0 ? (
        <NextStep to="/resultats" label={t.next.toResults}>
          <p>{t.next.assumptionsReady}</p>
        </NextStep>
      ) : (
        <NextStep to="/profil" label={t.next.toProfile}>
          <p>{t.results.gaps.lead}</p>
          <ul className="next__gaps">
            {gaps.map((g) => (
              <li key={g}>{t.results.gaps[g]}</li>
            ))}
          </ul>
        </NextStep>
      )}
    </section>
  )
}
