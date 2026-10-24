import { useEffect, useState, type CSSProperties } from 'react'
import type { Lang } from '../i18n'
import { LIVE_COPY } from '../lib/liveCopy'
import { formatSignedCompactMoney } from '../lib/money'

// WHAT AN EDIT CHANGED, floated off the answer: the whole years the age moved (« −1 an », « +2 ans ») and the money left at the horizon
// (« −40 k$ »), signed. The age is a whole number (the engine tries whole ages), so the years line is never fractional; the money line is there on every
// move — the one thing a small edit still changes when the age holds — in the horizon year's own dollars (nominal, like `Headline.netWorthAtHorizon`).
// Fed by `useChangePulse`'s `delta` (lib/useChangePulse.ts): never on arrival, never to or from « aucun âge ».
//
// Decoration, not a control: `aria-hidden` (it sits inside the live region that already says the age; a second voice would say it twice), no role, no
// tab stop, no pointer. It leaves BY ITS OWN TIMER rather than on `animationend`, so a reader with « réduire les animations » gets the same badge,
// still, for the same while — it carries information; only the ring beside it is mere decoration. Its motion is in styles/motion.css (`.answer-delta`),
// transform only; the dwell is handed to the CSS as a custom property so the exit starts a beat before the DOM removal.

/** How long the badge stays before it leaves by itself. Not a `--dur-*` token: it is a reading time, not a movement's. */
export const DELTA_DWELL_MS = 2200

interface Props {
  /** Counts the moves (the badge replays on each). */
  take: number
  /** Signed whole years the age moved; 0 = the age held. */
  years: number
  /** Signed dollars at the horizon; null = under the floor. */
  money: number | null
  lang: Lang
}

export function DeltaBadge({ take, years, money, lang }: Props) {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    setShown(true)
    const t = setTimeout(() => setShown(false), DELTA_DWELL_MS)
    return () => clearTimeout(t)
  }, [take])
  if (!shown || (years === 0 && money === null)) return null
  // The money is tinted by its sign only when it is the whole story: beside a move of the age, an earlier age normally LEAVES LESS at the horizon, and a red
  // figure under a green one would read as a contradiction where it is a trade-off.
  return (
    <span key={take} className="answer-delta" aria-hidden="true" style={{ '--delta-dwell': `${DELTA_DWELL_MS}ms` } as CSSProperties}>
      {years !== 0 && (
        <span className="answer-delta__years" data-dir={years < 0 ? 'earlier' : 'later'}>
          {LIVE_COPY[lang].deltaYears(years)}
        </span>
      )}
      {money !== null && (
        <span className={'answer-delta__money' + (years === 0 ? ' is-signed' : '')} data-sign={money < 0 ? 'down' : 'up'}>
          {formatSignedCompactMoney(money, lang)}
        </span>
      )}
    </span>
  )
}
