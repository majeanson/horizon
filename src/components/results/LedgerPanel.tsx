import { agesLedger } from '../../engine/ledger'
import type { AccountKind, Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatPct } from '../../lib/format'
import { LEDGER_COPY } from '../../lib/ledgerCopy'
import { formatMoney } from '../../lib/money'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'

// « Mes chiffres et leur calcul »: every number that sets the answer, with the calculation it triggers and the amount it becomes.
// The ages (when the pay stops, when the QPP starts, when the OAS starts), then the spending and the economy (inflation, returns).
// READ-ONLY: a figure is changed in ONE place — the person's own on Profil, the household's guesses on Hypothèses — and each block here
// links to it. The results page is where the plan is read, so nothing on it writes the profile behind the reader's back.

const KINDS: readonly AccountKind[] = ['rrsp', 'tfsa', 'nonReg']

const monthYear = (ym: { year: number; month: number }) => `${String(ym.month).padStart(2, '0')}/${ym.year}`

export function LedgerPanel({ household, assumptions, names }: { household: Household; assumptions: Assumptions; names: readonly string[] }) {
  const { lang } = useLang()
  const c = LEDGER_COPY[lang]
  const ledger = agesLedger(household, assumptions)
  const money = (n: number, cents = false) => formatMoney(n, lang, { cents })
  const pct = (rate: number) => formatPct(rate, lang, 1)

  /** One figure: its name and value on a line, then the amount it becomes (when there is one) and the calculation under it. */
  const row = (label: string, value: string, result: string | null, ...calcs: (string | null)[]) => (
    <div className="ledger__row">
      <p className="ledger__fixed">
        <span className="field-row__label">{label}</span> <span className="mono">{value}</span>
      </p>
      {result !== null && <p className="ledger__result">{result}</p>}
      {calcs.map((line, i) => (line === null ? null : <p key={i} className="ledger__calc">{line}</p>))}
    </div>
  )

  return (
    <div className="ledger">
      <p className="field-row__hint">{c.hint}</p>
      {/* The same frame as the Profil: one column per person, a coloured top bar and the name — whether there is one or two. */}
      <div className={'persons' + (ledger.length > 1 ? ' persons--two' : '')}>
        {ledger.map((l, i) => {
          const name = names[i] ?? ''
          const p = household.persons[i]
          const done = (is: boolean) => (is ? ` · ${c.done}` : '')
          return (
            <section key={l.id} className={`ledger__person person who who--${Math.min(i, 1)}`} aria-label={c.person(name)}>
              <h3 className="year-table__title">{c.person(name)}</h3>
              <Chip to={`/profil?person=${l.id}`} ariaLabel={`${c.editProfile} : ${name}`}>{c.editProfile}</Chip>
              {row(c.retireLabel, c.age(String(p.retirementAge)) + done(l.retirement.done), null, c.retireCalc(monthYear(l.retirement.leaving)))}
              {row(
                c.rrqLabel,
                c.age(String(p.rrq.startAge)) + done(l.rrq.done),
                c.rrqResult(money(l.rrq.monthlyToday)),
                c.rrqCalc(monthYear(l.rrq.start), money(l.rrq.base, true), money(l.rrq.additionalFirst, true), money(l.rrq.additionalSecond, true), formatPct(l.rrq.adjustment, lang, 1), money(l.rrq.monthly, true)),
                !l.rrq.done && l.rrq.monthlyToday > l.rrq.maxToday * 1.2 ? c.rrqContext(money(l.rrq.maxToday), formatPct(Math.max(0, assumptions.wageGrowth - assumptions.inflation), lang, 1)) : null,
              )}
              {row(
                c.oasLabel,
                c.age(String(p.oas.startAge)) + done(l.oas.done),
                c.oasResult(money(l.oas.monthlyToday)),
                l.oas.monthly > 0 ? c.oasCalc(monthYear(l.oas.start), money(l.oas.full, true), formatPct(l.oas.residence, lang, 0), formatPct(l.oas.multiplier - 1, lang, 1), money(l.oas.monthly, true)) : c.oasNone(monthYear(l.oas.start)),
              )}
            </section>
          )
        })}
      </div>

      <section className="ledger__person" aria-label={c.moneyTitle}>
        <h3 className="year-table__title">{c.moneyTitle}</h3>
        <Cluster>
          <Chip to="/profil?fact=household:spendingRetired">{c.editSpending}</Chip>
          <Chip to="/hypotheses">{c.editAssumptions}</Chip>
        </Cluster>
        {row(c.spendWorkLabel, money(household.spending.workingToday), null, c.spendCalc(money(household.spending.workingToday), money(household.spending.workingToday / 12)))}
        {row(c.spendRetLabel, money(household.spending.retiredToday), null, c.spendCalc(money(household.spending.retiredToday), money(household.spending.retiredToday / 12)))}
        {row(c.inflationLabel, pct(assumptions.inflation), null, c.inflationCalc(pct(assumptions.inflation), money(1000 * (1 + assumptions.inflation) ** 10)))}
        {KINDS.map((kind) => (
          <div key={kind}>{row(c.returnLabel[kind], pct(assumptions.returns[kind]), null, c.returnCalc(pct(assumptions.returns[kind]), formatPct((1 + assumptions.returns[kind]) / (1 + assumptions.inflation) - 1, lang, 1)))}</div>
        ))}
      </section>
    </div>
  )
}
