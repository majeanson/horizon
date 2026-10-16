import { useEffect, useRef, useState } from 'react'

// « The answer moved »: tells a component when a figure CHANGED from one real value to another, and which way. Not on arrival (the first value is not a change), not
// when the figure goes to or from « none » (there is no direction to say), not on a re-render with the same figure. The component keys a small decoration (a ring)
// on `count`, so it plays once per move; `dir` tints it — earlier is good news, later is a change to look at.

type PulseDir = 'earlier' | 'later'

export function pulseDir(before: number | null, now: number | null): PulseDir | null {
  if (before === null || now === null || before === now) return null
  return now < before ? 'earlier' : 'later'
}

export function useChangePulse(value: number | null): { count: number; dir: PulseDir | null } {
  const last = useRef<number | null | undefined>(undefined)
  const [pulse, setPulse] = useState<{ count: number; dir: PulseDir | null }>({ count: 0, dir: null })
  useEffect(() => {
    const before = last.current
    last.current = value
    if (before === undefined) return
    const dir = pulseDir(before, value)
    if (dir !== null) setPulse((p) => ({ count: p.count + 1, dir }))
  }, [value])
  return pulse
}
