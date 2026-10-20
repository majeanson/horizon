import type { AccountKind } from '../../engine/types'
import { ALL_ORDERS, type WithdrawalOrders } from '../../engine/withdrawalOrders'
import { useLang, useT } from '../../i18n'
import { formatMoney } from '../../lib/money'
import { setAssumptions } from '../../lib/profileEdit'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { updateProfile } from '../../lib/store'
import type { Answer } from '../../lib/useOffThread'
import { Chip } from '../Chip'
import { ConceptPip } from '../ConceptPip'
import { ACCOUNT_CONCEPT } from '../../lib/concepts'
import { SkeletonStatus } from '../Skeleton'
import { SkeletonGhost } from '../SkeletonShapes'

// « In which order should I draw my accounts? » — the household's plan under each of the six orders (engine/withdrawalOrders.ts),
// one row each: the earliest age that works, the tax paid over the whole plan, and what is left. The household's own order is
// marked; the one that comes out ahead can be adopted in a tap. Computed in a worker, behind the first paint — by the VIEW
// (DecideView asks once, reads the answer to decide whether the block is worth opening, and hands it here to draw).

export function OrderPanel({ orders }: { orders: Answer<WithdrawalOrders> }) {
  const t = useT()
  const { lang } = useLang()
  const o = RESULTS_COPY[lang].orders
  const a = t.assumptions
  const accountName: Record<AccountKind, string> = { nonReg: a.returns.nonReg, rrsp: a.returns.rrsp, tfsa: a.returns.tfsa }
  const { value, busy } = orders
  // Seconds on a slow phone when the card is opened before the comparison is in: the panel waits as a ghost of itself — its six rows, its sentences — with stand-in
  // figures (a row per order is known before any is worked out), so it opens at the height it will have.
  if (value === null)
    return (
      <>
        <SkeletonStatus />
        <SkeletonGhost>
          <OrderPanel orders={{ value: GHOST_ORDERS, busy: false }} />
        </SkeletonGhost>
      </>
    )
  const own = value.outcomes[value.current]
  const best = value.outcomes[value.best]
  const adopt = (order: readonly AccountKind[]) => updateProfile((p) => setAssumptions(p, { withdrawalOrder: [...order] }))

  return (
    <div className="orders" aria-busy={busy}>
      <p className="field-row__hint">{o.hint(value.age)}</p>
      {busy && (
        <p className="bridge__updating" role="status">
          {o.updating}
        </p>
      )}
      <p className="answer__note" aria-live={busy ? 'off' : 'polite'}>
        {value.best === value.current ? o.keep : o.better(best.order.map((k) => accountName[k]).join(' → '), best.earliestOk, own.earliestOk, formatMoney(own.lifetimeTax - best.lifetimeTax, lang))}
      </p>
      <div className="table-wrap" role="region" aria-label={o.title} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">{o.order}</th>
              <th scope="col">{o.earliest}</th>
              <th scope="col">{o.tax}</th>
              <th scope="col">{o.worth}</th>
              <th scope="col">
                <span className="sr-only">{o.use}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {value.outcomes.map((x, i) => (
              <tr key={x.order.join('>')} className={i === value.current ? 'is-own' : undefined}>
                <th scope="row">
                  {x.order.map((k, n) => (
                    <span key={k} className="order-step">
                      {n > 0 && ' → '}
                      <ConceptPip id={ACCOUNT_CONCEPT[k]} size="sm" /> {accountName[k]}
                    </span>
                  ))}
                  {i === value.current && <span className="projected mono"> {o.yours}</span>}
                  {i === value.best && i !== value.current && <span className="projected mono"> {o.ahead}</span>}
                </th>
                <td>{x.earliestOk === null ? '—' : o.age(x.earliestOk)}</td>
                <td>{formatMoney(x.lifetimeTax, lang)}</td>
                <td>{formatMoney(x.worthToday, lang)}</td>
                <td>{i !== value.current && <Chip onClick={() => adopt(x.order)} ariaLabel={`${o.use} — ${x.order.map((k) => accountName[k]).join(' → ')}`}>{o.use}</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="answer__note">{o.caveat}</p>
    </div>
  )
}

/** The six orders with the same stand-in figures: the ghost needs the table's shape, never its answer. */
const GHOST_ORDERS: WithdrawalOrders = {
  age: 60,
  outcomes: ALL_ORDERS.map((order) => ({ order, earliestOk: 60, ok: true, firstShortfallYear: null, lifetimeTax: 400000, worthToday: 900000 })),
  current: 0,
  best: 1,
}
