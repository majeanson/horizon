import { rregopPension } from '../../engine/presets'
import type { DbPension } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import { useConfirm } from '../../lib/confirm'
import { formatDecimal, formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { addPension, blankPension, inPayPension, removePension, updatePension } from '../../lib/profileEdit'
import { MAX_IN_PAY_ANNUAL } from '../../lib/schema'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { Disclosure } from '../Disclosure'
import { EditField } from '../EditField'
import { FieldInfo } from '../FieldInfo'
import { FieldRow } from '../FieldRow'
import { Icon } from '../Icon'
import { NumberField } from '../NumberField'
import { Section, type PersonEditor } from './shared'

// The employer's defined-benefit plans: a formula, not a balance. A plan is entered once from its own booklet —
// or started from the RREGOP preset, whose rules are cited in engine/params/plans.ts — and the engine reads it
// as « accrual × service × the best years' average », reduced, coordinated, indexed as the plan says.

const NEUTRAL = {
  // Switching a rule ON must not smuggle in another plan's numbers: each starts at a value that changes nothing.
  coordination: { rate: 0, fromAge: 65, maxYears: 35 },
  bridge: { share: 0, untilAge: 65 },
  factor: { minAge: 75, total: 120 },
}

function Rules({ pension, set }: { pension: DbPension; set: (change: (p: DbPension) => DbPension) => void }) {
  const t = useT()
  const p = t.plans
  return (
    <div className="plan-rules">
      <p className="field-row__hint">{p.rulesHint}</p>
      <div className="earnings__tools">
        <FieldInfo id="dbRules" label={p.rules} />
      </div>

      {!pension.inPay && (
        <>
      <FieldRow label={p.accrual}>
        {(w) => <NumberField kind="percent" min={0} max={0.1} value={pension.accrualRate} onChange={(accrualRate) => set((x) => ({ ...x, accrualRate }))} id={w.id} />}
      </FieldRow>
      <FieldRow label={p.maxService}>
        {(w) => (
          <NumberField kind="decimal" allowEmpty min={1} max={60} unit={t.fields.years} placeholder={p.maxServiceNone} value={pension.maxServiceYears} onChange={(maxServiceYears) => set((x) => ({ ...x, maxServiceYears }))} id={w.id} />
        )}
      </FieldRow>
      <FieldRow label={p.averaging}>
        {(w) => <NumberField kind="int" min={1} max={10} unit={t.fields.years} value={pension.averagingYears} onChange={(averagingYears) => set((x) => ({ ...x, averagingYears }))} id={w.id} />}
      </FieldRow>
      <FieldRow label={p.earliestAge}>
        {(w) => <NumberField kind="int" min={45} max={75} unit={t.fields.years} value={pension.earliestAge} onChange={(earliestAge) => set((x) => ({ ...x, earliestAge }))} id={w.id} />}
      </FieldRow>
      <FieldRow label={p.unreducedAge}>
        {(w) => <NumberField kind="int" min={45} max={75} unit={t.fields.years} value={pension.unreduced.age} onChange={(age) => set((x) => ({ ...x, unreduced: { ...x.unreduced, age } }))} id={w.id} />}
      </FieldRow>
      <FieldRow label={p.unreducedService}>
        {(w) => (
          <NumberField kind="decimal" allowEmpty min={1} max={60} unit={t.fields.years} value={pension.unreduced.serviceYears} onChange={(serviceYears) => set((x) => ({ ...x, unreduced: { ...x.unreduced, serviceYears } }))} id={w.id} />
        )}
      </FieldRow>
      <Chip selected={pension.unreduced.factor !== null} onClick={() => set((x) => ({ ...x, unreduced: { ...x.unreduced, factor: x.unreduced.factor ? null : NEUTRAL.factor } }))}>
        {p.factor}
      </Chip>
      {pension.unreduced.factor && (
        <>
          <FieldRow label={p.factorMinAge}>
            {(w) => <NumberField kind="int" min={45} max={75} unit={t.fields.years} value={pension.unreduced.factor!.minAge} onChange={(minAge) => set((x) => ({ ...x, unreduced: { ...x.unreduced, factor: { ...x.unreduced.factor!, minAge } } }))} id={w.id} />}
          </FieldRow>
          <FieldRow label={p.factorTotal}>
            {(w) => <NumberField kind="int" min={50} max={120} value={pension.unreduced.factor!.total} onChange={(total) => set((x) => ({ ...x, unreduced: { ...x.unreduced, factor: { ...x.unreduced.factor!, total } } }))} id={w.id} />}
          </FieldRow>
        </>
      )}
      <FieldRow label={p.earlyReduction}>
        {(w) => <NumberField kind="percent" min={0} max={0.2} value={pension.earlyReductionPerYear} onChange={(earlyReductionPerYear) => set((x) => ({ ...x, earlyReductionPerYear }))} id={w.id} />}
      </FieldRow>

      <Chip selected={pension.coordination !== null} onClick={() => set((x) => ({ ...x, coordination: x.coordination ? null : NEUTRAL.coordination }))}>
        {p.coordination}
      </Chip>
      {pension.coordination && (
        <>
          <div className="earnings__tools">
            <FieldInfo id="dbCoordination" label={p.coordination} />
          </div>
          <FieldRow label={p.coordinationRate}>
            {(w) => <NumberField kind="percent" min={0} max={0.05} value={pension.coordination!.rate} onChange={(rate) => set((x) => ({ ...x, coordination: { ...x.coordination!, rate } }))} id={w.id} />}
          </FieldRow>
          <FieldRow label={p.coordinationFromAge}>
            {(w) => <NumberField kind="int" min={55} max={75} unit={t.fields.years} value={pension.coordination!.fromAge} onChange={(fromAge) => set((x) => ({ ...x, coordination: { ...x.coordination!, fromAge } }))} id={w.id} />}
          </FieldRow>
          <FieldRow label={p.coordinationMaxYears}>
            {(w) => <NumberField kind="decimal" min={1} max={60} unit={t.fields.years} value={pension.coordination!.maxYears} onChange={(maxYears) => set((x) => ({ ...x, coordination: { ...x.coordination!, maxYears } }))} id={w.id} />}
          </FieldRow>
        </>
      )}

      <Chip selected={pension.bridge !== null} onClick={() => set((x) => ({ ...x, bridge: x.bridge ? null : NEUTRAL.bridge }))}>
        {p.bridge}
      </Chip>
      {pension.bridge && (
        <>
          <FieldRow label={p.bridgeShare}>
            {(w) => <NumberField kind="percent" min={0} max={1} value={pension.bridge!.share} onChange={(share) => set((x) => ({ ...x, bridge: { ...x.bridge!, share } }))} id={w.id} />}
          </FieldRow>
          <FieldRow label={p.bridgeUntil}>
            {(w) => <NumberField kind="int" min={55} max={75} unit={t.fields.years} value={pension.bridge!.untilAge} onChange={(untilAge) => set((x) => ({ ...x, bridge: { ...x.bridge!, untilAge } }))} id={w.id} />}
          </FieldRow>
        </>
      )}

        </>
      )}

      <FieldRow label={p.indexShare} hint={p.indexHint}>
        {(w) => <NumberField kind="percent" min={0} max={1} value={pension.indexation.share} onChange={(share) => set((x) => ({ ...x, indexation: { ...x.indexation, share } }))} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      <FieldRow label={p.indexMinus}>
        {(w) => <NumberField kind="percent" min={0} max={0.1} value={pension.indexation.minus} onChange={(minus) => set((x) => ({ ...x, indexation: { ...x.indexation, minus } }))} id={w.id} />}
      </FieldRow>
    </div>
  )
}

export function PensionPlans({ person, edit }: PersonEditor) {
  const t = useT()
  const { lang } = useLang()
  const confirm = useConfirm()
  const p = t.plans
  const add = (pension: DbPension) => edit((x) => addPension(x, pension))

  return (
    <Section title={p.title} subtitle={p.subtitle} icon="users-three-bold">
      {person.pensions.length === 0 && <p className="field-row__hint">{p.empty}</p>}
      {person.pensions.map((pension, i) => {
        const set = (change: (x: DbPension) => DbPension) => edit((x) => updatePension(x, i, change))
        const name = pension.label || p.unnamed
        return (
          <article key={i} className="plan-card">
            <header className="plan-card__head">
              <div>
                <h3 className="plan-card__name">{name}</h3>
                <p className="plan-card__summary mono">
                  {pension.inPay ? p.inPaySummary(formatMoney(pension.inPay.annual, lang)) : p.summary(formatPct(pension.accrualRate, lang, 2), formatDecimal(pension.serviceYearsToDate, lang, 2), pension.startAge)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn--icon btn--ghost"
                aria-label={p.removeLabel(name)}
                title={p.removeLabel(name)}
                onClick={async () => {
                  if (await confirm({ message: p.removeConfirm, confirmLabel: t.common.remove })) edit((x) => removePension(x, i))
                }}
              >
                <Icon name="trash-bold" size={18} />
              </button>
            </header>
            <FieldRow label={p.label}>
              {(w) => <EditField as="div" value={pension.label} onChange={(label) => set((x) => ({ ...x, label }))} submitIcon={null} maxLength={60} id={w.id} ariaLabel={p.label} />}
            </FieldRow>
            {pension.inPay ? (
              <>
              <FieldRow label={p.inPayAnnual} hint={p.inPayHint}>
                {(w) => (
                  <NumberField kind="money" min={0} max={MAX_IN_PAY_ANNUAL} value={pension.inPay!.annual} onChange={(annual) => set((x) => ({ ...x, inPay: { ...x.inPay, annual } }))} id={w.id} ariaDescribedBy={w.describedBy} />
                )}
              </FieldRow>
              <FieldRow label={p.inPayAfter65} hint={p.inPayAfter65Hint}>
                {(w) => (
                  <NumberField
                    kind="money"
                    allowEmpty
                    min={0}
                    max={MAX_IN_PAY_ANNUAL}
                    value={pension.inPay!.after65 ?? null}
                    onChange={(after65) => set((x) => ({ ...x, inPay: { annual: x.inPay!.annual, ...(after65 === null ? {} : { after65 }) } }))}
                    id={w.id}
                    ariaDescribedBy={w.describedBy}
                  />
                )}
              </FieldRow>
              </>
            ) : (
              <>
                <FieldRow label={p.service} infoId="dbService">
                  {(w) => <NumberField kind="decimal" min={0} max={60} unit={t.fields.years} value={pension.serviceYearsToDate} onChange={(serviceYearsToDate) => set((x) => ({ ...x, serviceYearsToDate }))} id={w.id} />}
                </FieldRow>
                <FieldRow label={p.serviceRate}>
                  {(w) => <NumberField kind="decimal" min={0} max={1} value={pension.serviceRatePerYear} onChange={(serviceRatePerYear) => set((x) => ({ ...x, serviceRatePerYear }))} id={w.id} />}
                </FieldRow>
                <FieldRow label={p.startAge} hint={pension.deferred ? p.startHint : undefined}>
                  {(w) => <NumberField kind="int" min={45} max={75} unit={t.fields.years} value={pension.startAge} onChange={(startAge) => set((x) => ({ ...x, startAge }))} id={w.id} />}
                </FieldRow>
              </>
            )}
            <Disclosure label={pension.inPay ? p.inPayRules : p.rules}>
              <Rules pension={pension} set={set} />
            </Disclosure>
          </article>
        )
      })}
      <Cluster>
        <button type="button" className="btn btn--sm" onClick={() => add({ ...rregopPension({ serviceYearsToDate: 0, startAge: 60 }) })}>
          {p.addRregop}
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => add(blankPension())}>
          {p.addOther}
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => add(inPayPension())}>
          {p.addInPay}
        </button>
      </Cluster>
    </Section>
  )
}
