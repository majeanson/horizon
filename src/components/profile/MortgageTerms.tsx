import { PAYMENTS_PER_YEAR, payoffMonths, payoffYear, termsAtRenewal } from '../../engine/home'
import type { Home } from '../../engine/types'
import { useLang } from '../../i18n'
import { HOME_COPY } from '../../lib/homeCopy'
import { formatMoney } from '../../lib/money'
import { updateHome } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { FieldRow } from '../FieldRow'
import { Cluster } from '../Layout'
import { NumberField } from '../NumberField'

// How the mortgage's PAYMENT is counted, and a RENEWAL. The payment is typed in the unit the statement uses (every 2 weeks, say) and kept as its monthly
// equivalent — the calculation only ever sees that; the frequency is the screen's. A renewal is optional: a new rate from a year, and whether the
// payment stays (the payoff date moves) or the payoff date stays (the payment changes). The effect is said in words, from the engine's own arithmetic.
type Frequency = NonNullable<Home['mortgage']['frequency']>
const FREQUENCIES: readonly Frequency[] = ['monthly', 'biweekly', 'weekly']

export function MortgageTerms({ home, label }: { home: Home; /** The row label of the payment, when the card's own wording is wanted. */ label?: string }) {
  const { lang } = useLang()
  const c = HOME_COPY[lang]
  const now = today()
  const money = (n: number) => formatMoney(n, lang)
  const m = home.mortgage
  const frequency = m.frequency ?? 'monthly'
  const perYear = PAYMENTS_PER_YEAR[frequency]
  const shown = Math.round(((m.monthlyPayment * 12) / perYear) * 100) / 100
  const set = (patch: Partial<Home['mortgage']>) => updateProfile((p) => updateHome(p, (x) => ({ ...x, mortgage: { ...x.mortgage, ...patch } })))
  const renewal = m.renewal ?? null

  // What the renewal does, said from the same arithmetic as the plan.
  const effect = (() => {
    if (renewal === null) return null
    const at = termsAtRenewal(m, now.year)
    if (at === null) return c.renewal.effectNone
    const withIt = payoffMonths(m, now.year)
    if (withIt === null) return c.renewal.effectNever
    const without = payoffMonths({ ...m, renewal: null }, now.year)
    const year = (months: number | null) => (months === null ? '—' : String(payoffYear(now.year, months)))
    return renewal.keep === 'amortization' ? c.renewal.effectPayment(money(Math.round(at.payment)), String(renewal.year)) : c.renewal.effectPayoff(year(withIt), year(without))
  })()

  return (
    <>
      <Cluster role="radiogroup" aria-label={c.frequencyTitle}>
        {FREQUENCIES.map((f) => (
          <Chip key={f} radio selected={frequency === f} onClick={() => set({ frequency: f })}>
            {c.frequency[f]}
          </Chip>
        ))}
      </Cluster>
      <FieldRow label={label && frequency === 'monthly' ? label : c.payment[frequency]}>
        {(w) => <NumberField kind="money" max={1e6} value={shown} onChange={(typed) => set({ monthlyPayment: (typed * perYear) / 12 })} id={w.id} />}
      </FieldRow>
      {frequency !== 'monthly' && <p className="field-row__hint">{c.equals(formatMoney(Math.round(m.monthlyPayment * 100) / 100, lang, { cents: true }))}</p>}

      <Chip selected={renewal !== null} expanded={renewal !== null} onClick={() => set({ renewal: renewal ? null : { year: now.year + 3, rate: m.rate, keep: 'amortization' } })}>
        {c.renewal.toggle}
      </Chip>
      {renewal !== null && (
        <>
          <FieldRow label={c.renewal.year} hint={c.renewal.yearHint}>
            {(w) => <NumberField kind="year" min={now.year} max={2100} value={renewal.year} onChange={(year) => set({ renewal: { ...renewal, year } })} id={w.id} ariaDescribedBy={w.describedBy} />}
          </FieldRow>
          <FieldRow label={c.renewal.rate}>
            {(w) => <NumberField kind="percent" min={0} max={0.25} value={renewal.rate} onChange={(rate) => set({ renewal: { ...renewal, rate } })} id={w.id} />}
          </FieldRow>
          <Cluster role="radiogroup" aria-label={c.renewal.keepTitle}>
            <Chip radio selected={renewal.keep === 'amortization'} onClick={() => set({ renewal: { ...renewal, keep: 'amortization' } })}>
              {c.renewal.keepAmortization}
            </Chip>
            <Chip radio selected={renewal.keep === 'payment'} onClick={() => set({ renewal: { ...renewal, keep: 'payment' } })}>
              {c.renewal.keepPayment}
            </Chip>
          </Cluster>
          {effect !== null && <p className="field-row__hint">{effect}</p>}
        </>
      )}
    </>
  )
}
