import { useEffect, useRef, useState } from 'react'

// « The answer moved »: tells a component when a figure CHANGED from one real value to another, and which way. Not on arrival (the first value is not a change), not
// when the figure goes to or from « none » (there is no direction to say), not on a re-render with the same figure. The component keys a small decoration (a ring)
// on `count`, so it plays once per move; `dir` tints it — earlier is good news, later is a change to look at.
//
// And by HOW MUCH (`delta`, components/DeltaBadge.tsx): the whole years the age moved, and the money left at the horizon — the second given alongside the age, so an
// edit that does not move the whole age still has something to show. The badge keys on `delta.take`, the ring on `count`: a change in money alone replays the badge
// and never the ring.

type PulseDir = 'earlier' | 'later'

export function pulseDir(before: number | null, now: number | null): PulseDir | null {
  if (before === null || now === null || before === now) return null
  return now < before ? 'earlier' : 'later'
}

/** One answer as the badge sees it: the earliest age (null = « none »), and what is left at the horizon in that plan (null when not known). */
export interface AnswerPoint {
  age: number | null
  money: number | null
}
/** What moved between two answers: `years` = now − before (negative = earlier, 0 = the age held); `money` = the change at the horizon, null under the floor. */
export interface AnswerDelta {
  years: number
  money: number | null
}
/** Below this, the money at the horizon is said not to have moved — the floor Décider already uses before it prints a lever's `endGain`. */
export const DELTA_MONEY_FLOOR = 1000

/** Null when there is nothing to say: an age missing on either side (to or from « none »), or the age held and the money moved less than the floor. */
export function answerDelta(before: AnswerPoint, now: AnswerPoint): AnswerDelta | null {
  if (before.age === null || now.age === null) return null
  const years = now.age - before.age
  const moved = before.money !== null && now.money !== null && Math.abs(now.money - before.money) >= DELTA_MONEY_FLOOR
  const money = moved ? now.money! - before.money! : null
  return years === 0 && money === null ? null : { years, money }
}

export interface ChangePulse {
  count: number
  dir: PulseDir | null
  /** The last move worth a badge, with `take` counting them (the badge's key); null until one happens. */
  delta: (AnswerDelta & { take: number }) | null
}

export function useChangePulse(value: number | null, money: number | null = null): ChangePulse {
  const last = useRef<AnswerPoint | undefined>(undefined)
  const [pulse, setPulse] = useState<ChangePulse>({ count: 0, dir: null, delta: null })
  useEffect(() => {
    const before = last.current
    const now: AnswerPoint = { age: value, money }
    last.current = now
    if (before === undefined) return
    const dir = pulseDir(before.age, value)
    const d = answerDelta(before, now)
    if (dir === null && d === null) return
    setPulse((p) => ({
      count: dir === null ? p.count : p.count + 1,
      dir: dir ?? p.dir,
      delta: d === null ? p.delta : { take: (p.delta?.take ?? 0) + 1, ...d },
    }))
  }, [value, money])
  return pulse
}
