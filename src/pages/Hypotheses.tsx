import { useRef, useState } from 'react'
import type { AccountKind } from '../engine/types'
import { Accordion, AccordionMode, type AccordionOpen } from '../components/Accordion'
import { Chip } from '../components/Chip'
import { Fold } from '../components/Fold'
import { ASSUMPTION_PRESETS, PRESET_KEYS, presetOf, type PresetKey, type PresetValues } from '../engine/assumptionPresets'
import { impactOf, type ImpactField } from '../engine/assumptionImpact'
import { ImpactMeter } from '../components/ImpactMeter'
import { NextStep } from '../components/NextStep'
import { FieldRow } from '../components/FieldRow'
import { Icon } from '../components/Icon'
import { NumberField } from '../components/NumberField'
import { NumberSlider } from '../components/NumberSlider'
import type { SliderMark } from '../components/Slider'
import { PageHead } from '../components/PageHead'
import { PinnedMap } from '../components/PinnedMap'
import { Section } from '../components/profile/shared'
import { StatusMessage } from '../components/StatusMessage'
import { SubTabs } from '../components/SubTabs'
import { Switch } from '../components/Switch'
import { useLang, useT } from '../i18n'
import { CARD_COPY } from '../lib/cardCopy'
import { useConfirm } from '../lib/confirm'
import { formatPct } from '../lib/format'
import { applyPreset, hasSpouse, mapPerson, resizeMarketPath, restoreCustom, sameScenario, scenarioOf, setAssumptions, setMarketPreset, setMarketYear, setReturn } from '../lib/profileEdit'
import { MARKET_PATHS, MARKET_PRESETS } from '../engine/marketPaths'
import { Cluster } from '../components/Layout'
import { profileGaps } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'
import { useParamChoice } from '../lib/useParamChoice'
import { HYPOTHESES_COPY } from '../lib/hypothesesCopy'
import { realWage } from '../lib/realWage'
import { REAL_WAGE_COPY } from '../lib/realWageCopy'
import { LIFE_COPY } from '../lib/lifeCopy'
import { MARKET_COPY } from '../lib/marketCopy'
import { useNotice } from '../lib/toast'

// What the household assumes about the future. These are the person's own numbers: nothing here is an official figure,
// and the page says so. The scenario comes first — it IS the page for most people (the Neutre set is already in place) —
// then the few figures behind it, in plain words, then the two options and the path the markets take. Each change is
// one pure profile edit (lib/profileEdit.ts). What the household SPENDS is a fact about it, not a guess about the
// future: it lives on Profil (« Budget »), with the other facts a document confirms.
// The seven blocks are read ONE AT A TIME (components/Accordion.tsx): the scenario open, the rest closed to their titles, « Suivant » at the foot of
// each; the address keeps which is open (`?bloc=`, « tout » opens them all), and the map's chips open the block they name.

const BLOCKS = ['scenario', 'prix', 'placements', 'marches', 'age', 'depenses', 'options'] as const
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
  const [bloc, setBloc] = useParamChoice<string>('bloc', [...BLOCKS, 'tout', 'none'], 'scenario')
  const open: AccordionOpen = bloc === 'tout' ? 'all' : bloc === 'none' ? null : bloc
  const setOpen = (next: AccordionOpen) => setBloc(next === 'all' ? 'tout' : (next ?? 'none'))
  const presetSummary =(key: PresetKey | 'kept') => {
    const v = key === 'kept' ? kept! : ASSUMPTION_PRESETS[key]
    const pct = (x: number) => formatPct(x, lang, 1)
    return a.presets.summary(pct(v.inflation), pct(v.wageGrowth), [v.returns.rrsp, v.returns.tfsa, v.returns.nonReg].map(pct).join(' / '), v.horizonAge)
  }
  const impact = t.assumptions.impact
  /** The meter for one assumption: where the value sits against the three scenarios, and why it matters. */
  const meter = (field: ImpactField, value: number) => {
    const { level, tilt } = impactOf(field, value)
    const side = level === 'below' ? 'low' : level === 'above' ? 'high' : level
    return <ImpactMeter level={level} tilt={tilt} levelLabel={impact.level[level]} tiltLabel={impact.tilt[tilt]} why={impact.why[field][side]} whyTitle={impact.whyTitle} outside={impact.outside} ends={[impact.level.below, impact.level.above]} />
  }
  /** The prudent · neutral · bold value of one assumption, as the marks on its track (a tap on a legend chip applies it). */
  const marksOf = (pick: (v: PresetValues) => number): SliderMark[] => PRESET_KEYS.map((key) => ({ value: pick(ASSUMPTION_PRESETS[key]), label: a.presets[key], tone: key }))
  const accountName: Record<AccountKind, string> = { nonReg: a.returns.nonReg, rrsp: a.returns.rrsp, tfsa: a.returns.tfsa }
  // ONE return by default: most households hold the same mix in every account, so three boxes plus an averaged meter was
  // extra work. The three open when the rates already differ, or when asked; closing them again makes them equal.
  const { returns } = assumptions
  const sameReturn = returns.rrsp === returns.tfsa && returns.tfsa === returns.nonReg
  const [perAccount, setPerAccount] = useState(!sameReturn)
  const setAllReturns = (v: number) => updateProfile((p) => setAssumptions(p, { returns: { rrsp: v, tfsa: v, nonReg: v } }))
  const averageReturn = (returns.rrsp + returns.tfsa + returns.nonReg) / 3

  // A long page of inputs: a one-line map of its blocks (the scenario first, then what it sets), as on Profil and Résultats.
  const page = useRef<HTMLElement>(null)
  const nav = HYPOTHESES_COPY[lang].nav
  const links = [
    { id: 'scenario', label: nav.scenario, concept: 'scenario' as const },
    { id: 'prix', label: nav.prices, concept: 'inflation' as const },
    { id: 'placements', label: nav.returns, concept: 'rendement' as const },
    { id: 'marches', label: nav.markets, concept: 'marches' as const },
    { id: 'age', label: nav.age, concept: 'finPlan' as const },
    { id: 'depenses', label: nav.spending, concept: 'depenses' as const },
    { id: 'options', label: nav.options },
  ]

  return (
    <section className="page-body" ref={page}>
      <PageHead title={a.title} subtitle={a.subtitle} />
      <PinnedMap links={links} ariaLabel={nav.label} page={page} onPick={(id) => open !== 'all' && setBloc(id)} end={<AccordionMode open={open} onOpen={setOpen} />} />

      <Accordion ids={BLOCKS} open={open} onOpen={(id) => setBloc(id ?? 'none')}>
      <Section id="scenario" title={a.presets.title} subtitle={CARD_COPY[lang].scenario} details={a.presets.hint} concept="scenario">
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
          {/* Folded by default: the provenance is for whoever asks, not for everyone who lands here — the one disclosure, a Fold, like every other. */}
          <Fold summary={a.presets.sourceTitle}>
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
          </Fold>
        </div>
      </Section>

      <Section id="prix" title={a.economy.title} subtitle={CARD_COPY[lang].prices} concept="inflation">
        <NumberSlider kind="percent" label={a.economy.inflation} infoId="inflation" hint={a.economy.inflationHint} min={-0.02} max={0.08} bounds={[-0.02, 0.15]} step={0.001} value={assumptions.inflation} onChange={(inflation) => updateProfile((p) => setAssumptions(p, { inflation }))} marks={marksOf((v) => v.inflation)} />
        {meter('inflation', assumptions.inflation)}
        <NumberSlider kind="percent" label={a.economy.wageGrowth} infoId="wageGrowth" hint={a.economy.wageHint} min={-0.02} max={0.08} bounds={[-0.02, 0.15]} step={0.001} value={assumptions.wageGrowth} onChange={(wageGrowth) => updateProfile((p) => setAssumptions(p, { wageGrowth }))} marks={marksOf((v) => v.wageGrowth)} />
        <RealWageLine wageGrowth={assumptions.wageGrowth} inflation={assumptions.inflation} />
        {meter('wageGrowth', assumptions.wageGrowth)}
      </Section>

      <Section id="placements" title={a.returns.title} subtitle={a.returns.hint} concept="rendement">
        {perAccount ? (
          (['rrsp', 'tfsa', 'nonReg'] as const).map((kind) => (
            <NumberSlider key={kind} kind="percent" label={accountName[kind]} infoId="returns" min={0} max={0.1} bounds={[-0.2, 0.3]} step={0.001} value={assumptions.returns[kind]} onChange={(v) => updateProfile((p) => setReturn(p, kind, v))} marks={marksOf((x) => x.returns[kind])} />
          ))
        ) : (
          <NumberSlider kind="percent" label={a.returns.all} infoId="returns" min={0} max={0.1} bounds={[-0.2, 0.3]} step={0.001} value={returns.rrsp} onChange={setAllReturns} marks={marksOf((x) => x.returns.rrsp)} />
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

      <Section id="marches" title={m.path.title} subtitle={CARD_COPY[lang].markets} details={m.path.hint} concept="marches">
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
              <FieldRow key={i} label={m.path.year(i + 1)} help="marketYear">
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

      {/* Each person's own age — the scenario's (95 in Neutre) until they set one; a chip gives it back to the scenario. In a couple the
          first death hands the plan to the survivor (engine/projection.ts), so the survivor's spending share sits here too. */}
      <Section id="age" title={a.horizon.title} subtitle={CARD_COPY[lang].horizon} details={a.horizon.hint} concept="finPlan">
        {profile.household.persons.map((person, i) => {
          const own = person.horizonAge ?? null
          const name = person.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse)
          return (
            <div key={person.id} className="horizon-person">
              <NumberSlider
                kind="int"
                label={profile.household.persons.length === 1 ? a.horizon.age : a.horizon.person(name)}
                infoId="horizonAge"
                hint={own === null ? a.horizon.followHint : undefined}
                min={75}
                max={105}
                bounds={[50, 110]}
                step={1}
                value={own ?? assumptions.horizonAge}
                onChange={(horizonAge) => updateProfile((p) => mapPerson(p, person.id, (x) => ({ ...x, horizonAge })))}
                marks={marksOf((v) => v.horizonAge)}
              />
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
          <NumberSlider kind="percent" label={a.horizon.survivor} infoId="survivorSpending" hint={a.horizon.survivorHint} digits={0} min={0.3} max={1} step={0.05} value={assumptions.survivorSpending ?? 0.7} onChange={(survivorSpending) => updateProfile((p) => setAssumptions(p, { survivorSpending }))} marks={[0.5, 0.7, 1].map((value) => ({ value, label: formatPct(value, lang, 0) }))} />
        )}
      </Section>

      <Section id="depenses" title={LIFE_COPY[lang].drift.title} subtitle={CARD_COPY[lang].drift} details={LIFE_COPY[lang].drift.hint} concept="depenses">
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
      <Section id="options" title={a.options.title} subtitle={CARD_COPY[lang].options} icon="lock-bold">
        {/* The splitting switch only when there is someone to split with. */}
        {hasSpouse(profile) && <Switch checked={assumptions.pensionSplitting} onChange={(pensionSplitting) => updateProfile((p) => setAssumptions(p, { pensionSplitting }))} label={a.splitting.on} hint={a.splitting.hint} />}
        {hasSpouse(profile) && <Switch checked={assumptions.drawTogether === true} onChange={(drawTogether) => updateProfile((p) => setAssumptions(p, { drawTogether }))} label={m.together.on} hint={m.together.hint} />}
        <Switch checked={assumptions.surplusToRrsp === true} onChange={(surplusToRrsp) => updateProfile((p) => setAssumptions(p, { surplusToRrsp }))} label={m.surplus.on} hint={m.surplus.hint} />
      </Section>
      </Accordion>

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

/** Wage growth after inflation, beside Retraite Québec's: the rate typed above is nominal, and the pension grows by the real part. */
function RealWageLine({ wageGrowth, inflation }: { wageGrowth: number; inflation: number }) {
  const { lang } = useLang()
  const c = REAL_WAGE_COPY[lang]
  const w = realWage(wageGrowth, inflation)
  const signed = (x: number) => (x > 0 ? '+' : '') + formatPct(x, lang, 1)
  return (
    <p className="field-row__hint">
      {c.line(signed(w.real), signed(w.reference))}
      {w.above && ` ${c.above}`}
    </p>
  )
}
