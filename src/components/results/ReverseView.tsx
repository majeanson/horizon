import { MAX_EXTRA_RETURN } from '../../engine/reverse'
import type { Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatDecimal, formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { REVERSE_COPY } from '../../lib/reverseCopy'
import { useRegret } from '../../lib/useRegret'
import { useReverse } from '../../lib/useReverse'
import { NumberSlider } from '../NumberSlider'
import { Skeleton } from '../Skeleton'

/** The most rows of « waiting one more year » listed: the first ages that work, which is where the gain is still large. */
const WAIT_ROWS = 6

// « Arrêter à l'âge de mon choix » — the plan asked the other way round. One age to choose (the same `?age=` as « Combien épargner ? »), and what it would take to stop then, four
// ways, each in its own unit and each enough on its own (engine/reverse.ts); under it, what waiting one more year buys and where it stops being worth a year of living (engine/regret.ts).
// Both run in workers. Nothing here ranks one change against another: a dollar less spending and a point more of return are not the same kind of pain.

export function ReverseView({
  household,
  assumptions,
  age,
  onAge,
  minAge,
  maxAge,
}: {
  household: Household
  assumptions: Assumptions
  age: number
  onAge: (age: number) => void
  minAge: number
  maxAge: number
}) {
  const { lang } = useLang()
  const c = REVERSE_COPY[lang]
  const money = (n: number) => formatMoney(Math.round(n), lang)
  const { value: r, busy } = useReverse(household, assumptions, age, true)
  const regret = useRegret(household, assumptions, true).value
  const waitFrom = regret === null ? -1 : regret.points.findIndex((p) => p.gain !== null)
  const waitRows = regret === null || waitFrom < 0 ? [] : regret.points.slice(waitFrom, waitFrom + WAIT_ROWS)
  return (
    <div className="surface answer reverse" aria-live={busy ? 'off' : 'polite'} aria-busy={busy}>
      <NumberSlider kind="int" label={c.age} help="saveTargetAge" min={minAge} max={maxAge} step={1} value={age} onChange={onAge} />
      {busy && r !== null && (
        <p className="bridge__updating" role="status">
          {c.updating}
        </p>
      )}
      {r === null ? (
        <Skeleton count={3} />
      ) : r.works ? (
        <>
          <p className="answer__big">{c.works(age)}</p>
          {r.spend.max !== null && r.spend.max > r.spend.current && <p className="answer__note">{c.margin(money(r.spend.max))}</p>}
        </>
      ) : (
        <>
          <p className="answer__note">{c.needs(age)}</p>
          <ul className="reverse__levers">
            <li>{r.spend.max === null ? c.spendNone : c.spend(money(r.spend.current), money(r.spend.max), formatPct(1 - r.spend.max / r.spend.current, lang, 0))}</li>
            <li>{r.save === null ? c.saveNone : c.save(money(r.save), money(r.save / 12))}</li>
            <li>{r.earliest === null ? c.workNone : c.work(r.earliest, r.earliest - age)}</li>
            <li>{r.partTime === null ? c.partTimeNone : c.partTime(r.partTime, r.partTime - age)}</li>
            <li>{r.returns === null ? c.returnsNone(formatDecimal(MAX_EXTRA_RETURN * 100, lang, 0)) : c.returns(formatDecimal(r.returns * 100, lang, 1))}</li>
          </ul>
          <p className="answer__note">{c.alone}</p>
        </>
      )}
      <div className="reverse__wait">
        <p className="verdict__range-title">{c.waitTitle}</p>
        {regret === null ? (
          <Skeleton count={2} />
        ) : waitRows.length === 0 ? (
          <p className="answer__note">{c.waitNone}</p>
        ) : (
          <>
            <p className="field-row__hint">{c.waitHint}</p>
            <ul className="reverse__levers">
              {waitRows.map((p) => (
                <li key={p.age}>{p.gain === null ? '' : c.waitRow(p.age, money(p.gain))}</li>
              ))}
            </ul>
            <p className="answer__note">{regret.knee === null ? c.waitStill(money(regret.threshold)) : c.waitKnee(regret.knee, money(regret.threshold))}</p>
          </>
        )}
      </div>
    </div>
  )
}
