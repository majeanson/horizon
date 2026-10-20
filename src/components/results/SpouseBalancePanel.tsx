import type { Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatMoney } from '../../lib/money'
import { SPOUSE_BALANCE_COPY } from '../../lib/spouseBalanceCopy'
import { spouseBalanceNudge } from '../../lib/spouseBalanceNudge'
import type { SpouseBalanceAnswer } from '../../lib/spouseBalance.worker'
import type { Answer } from '../../lib/useOffThread'
import { Fold } from '../Fold'
import { SkeletonStatus } from '../Skeleton'
import { SkeletonGhost } from '../SkeletonShapes'

// « Even out the spouses' RRSPs? » — the household's plan as it is, and again with part of the larger RRSP held in the other spouse's
// (engine/spouseBalance.ts), two rows: each person's balance, the earliest age that works, the tax over the whole plan. Read-only: moving
// money between spouses is done at the bank, not in this app. Computed in a worker, behind the first paint — by the VIEW (DecideView asks
// once, reads the answer to decide whether the block is worth opening, and hands it here to draw).

/** Money differences under this are « the same »: a sentence about 40 $ is noise. */
const SAME = 500

export function SpouseBalancePanel({ household, age, names, balance }: { household: Household; age: number; names: readonly string[]; balance: Answer<SpouseBalanceAnswer> }) {
  const { lang } = useLang()
  const c = SPOUSE_BALANCE_COPY[lang]
  const { value, busy } = balance
  // Opened before the comparison is in: the panel waits as a ghost of itself with stand-in figures (as OrderPanel does), at the height it will have.
  if (value === null)
    return (
      <>
        <SkeletonStatus />
        <SkeletonGhost>
          <SpouseBalancePanel household={household} age={age} names={names} balance={{ value: ghostBalance(household, age), busy: false }} />
        </SkeletonGhost>
      </>
    )
  const r = value.balance
  const money = (n: number) => formatMoney(n, lang)
  const note =
    r === null || r.moved <= 0
      ? c.level
      : spouseBalanceNudge(r) !== null
        ? c.better(money(r.moved), money(Math.max(0, r.taxSaved)), r.balanced.earliestOk, r.current.earliestOk)
        : c.effect({ tax: Math.abs(r.taxSaved) < SAME ? null : money(Math.abs(r.taxSaved)), less: r.taxSaved > 0 })
  return (
    <div className="spouse-balance" aria-busy={busy}>
      <p className="field-row__hint">{c.hint(age)}</p>
      {busy && (
        <p className="bridge__updating" role="status">
          {c.updating}
        </p>
      )}
      <p className="answer__note" aria-live={busy ? 'off' : 'polite'}>
        {note}
      </p>
      {r !== null && r.moved > 0 && (
        <div className="table-wrap" role="region" aria-label={c.title} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">{c.plan}</th>
                {household.persons.map((p, i) => (
                  <th key={p.id} scope="col">
                    {c.rrspOf(names[i] ?? '')}
                  </th>
                ))}
                <th scope="col">{c.earliest}</th>
                <th scope="col">{c.tax}</th>
              </tr>
            </thead>
            <tbody>
              {([['current', r.current], ['balanced', r.balanced]] as const).map(([key, o]) => (
                <tr key={key} className={key === 'current' ? 'is-own' : undefined}>
                  <th scope="row">{c.rows[key]}</th>
                  {o.rrsp.map((b, i) => (
                    <td key={household.persons[i].id}>{money(b)}</td>
                  ))}
                  <td>{o.earliestOk === null ? '—' : c.age(o.earliestOk)}</td>
                  <td>{money(o.lifetimeTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Fold summary={c.howTitle}>
        <p className="field-row__hint">{c.how}</p>
      </Fold>
      <p className="answer__note">{c.caveat}</p>
    </div>
  )
}

/** A stand-in comparison for this couple: the ghost needs the panel's shape, never its answer. */
function ghostBalance(household: Household, age: number): SpouseBalanceAnswer {
  const [a, b] = household.persons
  const outcome = { rrsp: household.persons.map(() => 200000), earliestOk: age, lifetimeTax: 400000 }
  return { balance: { age, share: 0.7, from: a.id, to: (b ?? a).id, moved: 50000, current: outcome, balanced: outcome, taxSaved: 20000, yearsEarlier: 0 } }
}
