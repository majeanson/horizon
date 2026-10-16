import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { countedFigures, countFrame } from '../lib/countUp'

// A money figure COUNTS UP to its value the first time it appears and, from where it was, whenever it changes (the amount a slider has just settled on). The words around it,
// the ages and the small numbers stay whole (lib/countUp.ts decides which figures count). The sentence in the DOM is the FINAL one from the first frame — for a screen reader, a spec
// and find-in-page; the count is a picture drawn over it (`data-live` on a pseudo-element, styles/motion.css) while the real text is hidden for about two thirds of a second. Never for a
// reader who asked for no motion, and never for a text without an amount.
//
//   <p className="answer__big"><CountUp>{q.amount(formatMoney(extra, lang))}</CountUp></p>
const DURATION = 650

export function CountUp({ children }: { children: string }) {
  const { lang } = useLang()
  const [live, setLive] = useState<string | null>(null)
  const last = useRef<number[] | null>(null)
  useEffect(() => {
    const to = countedFigures(children)
    // `last` is what was SHOWN — set when a count lands (or is skipped), never when it starts: a count that is cut short (a new figure, a development double-run of this effect) must
    // still start from what the reader last saw.
    const from = last.current
    const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm || to.length === 0 || (from !== null && from.length === to.length && from.every((v, i) => v === to[i]))) {
      last.current = to
      return setLive(null)
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      if (t >= 1) {
        last.current = to
        return setLive(null)
      }
      setLive(countFrame(children, from, 1 - (1 - t) ** 3, lang))
      frame = requestAnimationFrame(tick)
    }
    setLive(countFrame(children, from, 0, lang))
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [children, lang])
  return (
    <span className={'countup' + (live !== null ? ' is-counting' : '')} data-live={live ?? undefined}>
      <span className="countup__text">{children}</span>
    </span>
  )
}
