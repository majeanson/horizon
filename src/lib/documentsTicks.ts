import { useSyncExternalStore } from 'react'

// Which documents the person has already gathered. Not part of the profile (no schema change, not exported with it): a tick is a note to oneself on
// this device, kept under its own key like the theme and the backup stamps. Every access is guarded: a browser that keeps nothing simply forgets.

const KEY = 'horizon-documents-ticked'
const listeners = new Set<() => void>()
let cache: { raw: string | null; set: ReadonlySet<string> } | null = null

function read(): ReadonlySet<string> {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    /* nothing kept */
  }
  if (cache !== null && cache.raw === raw) return cache.set
  let ids: string[] = []
  try {
    const parsed: unknown = raw === null ? [] : JSON.parse(raw)
    ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && x.length < 40).slice(0, 40) : []
  } catch {
    ids = []
  }
  cache = { raw, set: new Set(ids) }
  return cache.set
}

function write(next: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    /* nothing kept: the tick lives until the page closes */
  }
  cache = null
  listeners.forEach((l) => l())
}

export const toggleTick = (id: string): void => {
  const next = new Set(read())
  if (next.has(id)) next.delete(id)
  else next.add(id)
  write(next)
}
export const clearTicks = (): void => write(new Set())

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const useTicks = (): ReadonlySet<string> => useSyncExternalStore(subscribe, read, read)
