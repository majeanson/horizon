import { MAX_EXTRA_RETURN } from '../../engine/reverse'
import type { Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatDecimal, formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { REVERSE_COPY } from '../../lib/reverseCopy'
import { useRegret } from '../../lib/useRegret'
import { useReverse } from '../../lib/useReverse'
import { NumberSlider } from '../NumberSlider'
import { SkeletonStatus } from '../Skeleton'
import { SkeletonText } from '../SkeletonShapes'

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
  expectWorks = false,
}: {
  household: Household
  assumptions: Assumptions
  age: number
  onAge: (age: number) => void
  minAge: number
  maxAge: number
  /** Whether the age is at or past the earliest one (Décider knows it): the waiting card takes the shape of the answer it is about to be. */
  expectWorks?: boolean
}) {
  const { lang } = useLang()
  const c = REVERSE_COPY[lang]
  const money = (n: number) => formatMoney(Math.round(n), lang)
  // The answer held while a new age is worked out is the OLD age's: every sentence is worded from the age it was computed for (r.age), never the slider's —
  // « needs 65 » beside 60's levers read « 2 years less » as « -2 ».
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
        // the answer about to come, in its own sentences with likely figures (ghost text): « it works » is two lines, « it needs » a list of five
        <>
          <SkeletonStatus />
          {expectWorks ? (
            <>
              <p className="answer__big">
                <SkeletonText>{c.works(age)}</SkeletonText>
              </p>
              <p className="answer__note">
                <SkeletonText>{c.margin(money(52000))}</SkeletonText>
              </p>
            </>
          ) : (
            <>
              <p className="answer__note">
                <SkeletonText>{c.needs(age)}</SkeletonText>
              </p>
              <ul className="skeleton__levers" aria-hidden="true">
                <li>
                  <SkeletonText>{c.spend(money(48000), money(42000), formatPct(0.12, lang, 0))}</SkeletonText>
                </li>
                <li>
                  <SkeletonText>{c.save(money(5000), money(417), c.saveInto.tfsa)}</SkeletonText>
                </li>
                <li>
                  <SkeletonText>{c.work(age + 2, 2)}</SkeletonText>
                </li>
                <li>
                  <SkeletonText>{c.partTime(age + 3, 3)}</SkeletonText>
                </li>
                <li>
                  <SkeletonText>{c.returns(formatDecimal(1.5, lang, 1))}</SkeletonText>
                </li>
              </ul>
              <p className="answer__note">
                <SkeletonText>{c.alone}</SkeletonText>
              </p>
            </>
          )}
        </>
      ) : r.works ? (
        <>
          <p className="answer__big">{c.works(r.age)}</p>
          {r.spend.max !== null && r.spend.max > r.spend.current && <p className="answer__note">{c.margin(money(r.spend.max))}</p>}
        </>
      ) : (
        <>
          <p className="answer__note">{c.needs(r.age)}</p>
          <ul className="reverse__levers">
            <li>{r.spend.max === null ? c.spendNone : c.spend(money(r.spend.current), money(r.spend.max), formatPct(1 - r.spend.max / r.spend.current, lang, 0))}</li>
            <li>{r.save === null ? c.saveNone : c.save(money(r.save), money(r.save / 12), c.saveInto[r.saveAccount ?? 'nonReg'])}</li>
            <li>{r.earliest === null ? c.workNone : c.work(r.earliest, r.earliest - r.age)}</li>
            <li>{r.partTime === null ? c.partTimeNone : c.partTime(r.partTime, r.partTime - r.age)}</li>
            <li>{r.returns === null ? c.returnsNone(formatDecimal(MAX_EXTRA_RETURN * 100, lang, 0)) : c.returns(formatDecimal(r.returns * 100, lang, 1))}</li>
          </ul>
          <p className="answer__note">{c.alone}</p>
        </>
      )}
      <div className="reverse__wait">
        <p className="verdict__range-title">{c.waitTitle}</p>
        {regret === null ? (
          // its hint, its rows of years and its closing line, as ghost text
          <>
            <p className="field-row__hint">
              <SkeletonText>{c.waitHint}</SkeletonText>
            </p>
            <ul className="skeleton__levers" aria-hidden="true">
              {Array.from({ length: WAIT_ROWS }, (_, i) => (
                <li key={i}>
                  <SkeletonText>{c.waitRow(age + i, money(12000))}</SkeletonText>
                </li>
              ))}
            </ul>
            <p className="answer__note">
              <SkeletonText>{c.waitKnee(age + 3, money(8000))}</SkeletonText>
            </p>
          </>
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
