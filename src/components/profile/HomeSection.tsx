import { useLang, useT } from '../../i18n'
import { payoffMonths, payoffYear } from '../../engine/home'
import { useConfirm } from '../../lib/confirm'
import { factId } from '../../lib/facts'
import { formatMoney } from '../../lib/money'
import { addHome, removeHome, updateHome } from '../../lib/profileEdit'
import { updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { StatusMessage } from '../StatusMessage'
import { HOME_COPY } from '../../lib/homeCopy'
import { LevelSlot } from './LevelSlot'
import { MortgageTerms } from './MortgageTerms'
import { Section } from './shared'

// The principal residence: what it is worth, what is still owed on it, and — if the person plans it — when it is sold or traded
// down. It is the household's, not one person's, so it sits above the two columns. The mortgage is a cost that ENDS (the plan
// stops paying it the year it is paid off, so « dépenses à la retraite » never has to carry it), and the house is wealth the
// accounts do not show (engine/home.ts says what is modelled and what is not).

export function HomeSection() {
  const t = useT()
  const { lang } = useLang()
  const h = t.profile.home
  const profile = useProfile()
  const confirm = useConfirm()
  const home = profile.household.home ?? null
  const now = today()
  const money = (n: number) => formatMoney(n, lang)

  const payoff = (() => {
    if (home === null || home.mortgage.balance <= 0) return null
    const months = payoffMonths(home.mortgage, now.year)
    if (months === null) return 'never' as const
    return { year: payoffYear(now.year, months), years: Math.ceil(months / 12) }
  })()

  return (
    <Section title={h.title} subtitle={h.hint} icon="house-bold">
      {home === null ? (
        <>
          <p className="field-row__hint">{h.none}</p>
          <Chip onClick={() => updateProfile(addHome)}>{h.own}</Chip>
        </>
      ) : (
        <>
          <FieldRow label={h.value} hint={h.valueHint} fact={factId('household', 'homeValue')}>
            {(w) => <NumberField kind="money" max={1e8} value={home.value} onChange={(value) => updateProfile((p) => updateHome(p, (x) => ({ ...x, value })))} id={w.id} ariaDescribedBy={w.describedBy} />}
          </FieldRow>
          <LevelSlot kind="homeValue" owner="household" />
          <FieldRow label={h.balance} fact={factId('household', 'mortgage')}>
            {(w) => <NumberField kind="money" max={1e8} value={home.mortgage.balance} onChange={(balance) => updateProfile((p) => updateHome(p, (x) => ({ ...x, mortgage: { ...x.mortgage, balance } })))} id={w.id} />}
          </FieldRow>
          {home.mortgage.balance > 0 && (
            <>
              <FieldRow label={h.rate} hint={h.rateHint}>
                {(w) => <NumberField kind="percent" min={0} max={0.25} value={home.mortgage.rate} onChange={(rate) => updateProfile((p) => updateHome(p, (x) => ({ ...x, mortgage: { ...x.mortgage, rate } })))} id={w.id} ariaDescribedBy={w.describedBy} />}
              </FieldRow>
              <MortgageTerms home={home} label={h.payment} />
              {/* What the payment means: the day the cost stops — or, plainly, that it never does. */}
              {payoff === 'never' ? (
                <StatusMessage tone="error">{h.noPayoff}</StatusMessage>
              ) : (
                payoff !== null && <p className="field-row__hint">{h.payoff(String(payoff.year), h.years(payoff.years))}</p>
              )}
            </>
          )}
          {home.mortgage.balance <= 0 && <p className="field-row__hint">{h.paidOff}</p>}
          <p className="field-row__hint">{h.equity(money(Math.max(0, home.value - home.mortgage.balance)))}</p>
          <p className="field-row__hint">{HOME_COPY[lang].nudge}</p>

          <Chip selected={home.sale !== null} expanded={home.sale !== null} onClick={() => updateProfile((p) => updateHome(p, (x) => ({ ...x, sale: x.sale ? null : { age: 75, replacementCost: 0 } })))}>
            {h.sell}
          </Chip>
          {home.sale !== null && (
            <>
              <FieldRow label={h.sellAge} hint={h.sellHint}>
                {(w) => <NumberField kind="int" min={40} max={100} unit={t.fields.years} value={home.sale!.age} onChange={(age) => updateProfile((p) => updateHome(p, (x) => ({ ...x, sale: { ...x.sale!, age } })))} id={w.id} ariaDescribedBy={w.describedBy} />}
              </FieldRow>
              <FieldRow label={h.replacement} hint={h.replacementHint}>
                {(w) => <NumberField kind="money" max={1e8} value={home.sale!.replacementCost} onChange={(replacementCost) => updateProfile((p) => updateHome(p, (x) => ({ ...x, sale: { ...x.sale!, replacementCost } })))} id={w.id} ariaDescribedBy={w.describedBy} />}
              </FieldRow>
            </>
          )}

          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={async () => {
              if (await confirm({ message: h.removeConfirm, confirmLabel: t.common.remove })) updateProfile(removeHome)
            }}
          >
            {h.remove}
          </button>
        </>
      )}
    </Section>
  )
}
