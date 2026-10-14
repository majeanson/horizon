import { useLang, useT } from '../../i18n'
import type { AccountKind } from '../../engine/types'
import { depositsCheck } from '../../lib/deposits'
import { formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { netPayCheck } from '../../lib/netPay'
import { PERSON_CHECKS_COPY } from '../../lib/personChecksCopy'
import { setDeposited, setNetPay } from '../../lib/profileEdit'
import { useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { FieldRow } from '../FieldRow'
import { Fold } from '../Fold'
import { NumberField } from '../NumberField'
import type { PersonEditor } from './shared'

// « Vérifier avec mes relevés »: two CHECKS the person may fill in and the plan never reads — the year's net pay against what the salary leaves (lib/netPay.ts), and what was put
// into each account against what it is worth (lib/deposits.ts). Closed until asked for: a person who does not have the figures to hand loses nothing.
export function PersonChecks({ person, edit, withNonReg = true }: PersonEditor & { /** Money outside the registered accounts is asked only of someone who has some (« Ma situation »). */ withNonReg?: boolean }) {
  const t = useT()
  const { lang } = useLang()
  const c = PERSON_CHECKS_COPY[lang]
  const { household, assumptions } = useProfile()
  const money = (n: number) => formatMoney(Math.round(n), lang, { cents: false })
  const netPay = netPayCheck(person, assumptions, household.livesAlone ?? true, today().year)
  const accountName: Record<AccountKind, string> = { rrsp: t.profile.accounts.rrsp, tfsa: t.profile.accounts.tfsa, nonReg: t.profile.accounts.nonReg }
  const rrspPlanned = person.accounts.rrsp.annualContribution
  return (
    <Fold summary={c.summary}>
      <FieldRow label={c.netPay.label} hint={c.netPay.hint}>
        {(w) => <NumberField kind="money" allowEmpty max={1e8} value={person.netPayYearly ?? null} onChange={(v) => edit((x) => setNetPay(x, v))} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      {netPay !== null && (
        <div role="status">
          <p className="field-row__hint">
            {netPay.kind === 'same' ? c.netPay.same(money(netPay.expected)) : netPay.kind === 'fewer' ? c.netPay.fewer(money(netPay.expected), money(netPay.gap)) : c.netPay.more(money(netPay.expected), money(-netPay.gap))}
          </p>
          {netPay.kind === 'fewer' && rrspPlanned > 0 && <p className="field-row__hint">{c.netPay.rrsp(money(rrspPlanned))}</p>}
        </div>
      )}
      {(withNonReg ? (['rrsp', 'tfsa', 'nonReg'] as const) : (['rrsp', 'tfsa'] as const)).map((kind) => {
        const account = person.accounts[kind]
        const check = depositsCheck(account.deposited, account.balance)
        return (
          <div key={kind}>
            <FieldRow label={c.deposits.label(accountName[kind])} hint={c.deposits.hint}>
              {(w) => <NumberField kind="money" allowEmpty max={1e9} value={account.deposited ?? null} onChange={(v) => edit((x) => setDeposited(x, kind, v))} id={w.id} ariaDescribedBy={w.describedBy} />}
            </FieldRow>
            {check !== null && (
              <div role="status">
                <p className="field-row__hint">{c.deposits.line(money(account.deposited!), money(account.balance), (check.change > 0 ? '+' : '') + formatPct(check.change, lang, 0))}</p>
                {check.below && <p className="field-row__hint">{c.deposits.below(formatPct(assumptions.returns[kind], lang, 1))}</p>}
              </div>
            )}
          </div>
        )
      })}
    </Fold>
  )
}
