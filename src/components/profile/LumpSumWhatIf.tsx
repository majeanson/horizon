import { useState } from 'react'
import { lumpSum, payoffYear } from '../../engine/home'
import type { Home } from '../../engine/types'
import { useLang } from '../../i18n'
import { HOME_COPY } from '../../lib/homeCopy'
import { formatMoney } from '../../lib/money'
import { updateHome } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { FieldRow } from '../FieldRow'
import { Fold } from '../Fold'
import { NumberField } from '../NumberField'

// « Et si je remboursais un montant d'un coup ? » — a lump sum on the balance, the payment and the rate unchanged: the date the loan ends and the interest it saves (engine/home.ts
// `lumpSum`, the plan's own month-by-month arithmetic). A worksheet: nothing is stored until « Appliquer à mon solde », which lowers the balance by the amount — to be done
// once the payment has been made, since the balance is what is owed today.
export function LumpSumWhatIf({ home }: { home: Home }) {
  const { lang } = useLang()
  const c = HOME_COPY[lang].lump
  const now = today().year
  const [lump, setLump] = useState<number | null>(null)
  const result = lump === null ? null : lumpSum(home.mortgage, lump, now)
  const money = (n: number) => formatMoney(Math.round(n), lang, { cents: false })
  const apply = () => {
    if (lump === null) return
    updateProfile((p) => updateHome(p, (x) => ({ ...x, mortgage: { ...x.mortgage, balance: Math.max(0, x.mortgage.balance - lump) } })))
    setLump(null)
  }
  const saved = result === null ? 0 : result.interest.without - result.interest.with
  const sentence = (() => {
    if (result === null) return null
    if (result.months.with === 0) return c.clears(money(saved))
    const withYear = payoffYear(now, result.months.with)
    const withoutYear = payoffYear(now, result.months.without)
    return withYear === withoutYear ? c.sameYear(String(withYear), money(saved)) : c.effect(String(withYear), String(withoutYear), c.sooner(withoutYear - withYear), money(saved))
  })()
  return (
    <Fold summary={c.summary}>
      <FieldRow label={c.amount} help="lumpSum" hint={c.amountHint}>
        {(w) => <NumberField kind="money" allowEmpty max={1e8} value={lump} onChange={setLump} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      {sentence !== null && (
        <div role="status">
          <p className="field-row__hint">{sentence}</p>
          <Chip onClick={apply}>{c.apply}</Chip>
          <p className="field-row__hint">{c.applyHint}</p>
        </div>
      )}
    </Fold>
  )
}
