import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// A choice that lives in the address bar: which set of hypotheses a table shows, which horizon, which scenario. A link keeps
// it, the back button does not step through it (the address is replaced, like the results page's other chips), and the
// default never writes anything — an address with no key IS the default. A value that is not on offer (an old link, a
// scenario since removed) falls back instead of showing an empty table.
//
//   const [hyp, setHyp] = useParamChoice('hyp', ['prudent', 'neutral', 'bold'], 'neutral')
export function useParamChoice<K extends string>(key: string, allowed: readonly K[], fallback: K): [K, (next: K) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(key)
  const value = allowed.find((k) => k === raw) ?? fallback
  const set = useCallback(
    (next: K) =>
      setParams(
        () => {
          // Built from the address as it is NOW (a second tap before the re-render must not undo the first).
          const url = new URLSearchParams(window.location.search)
          if (next === fallback) url.delete(key)
          else url.set(key, next)
          return url
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  )
  return [value, set]
}
