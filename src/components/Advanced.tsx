import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { useMode } from '../lib/mode'
import { Disclosure } from './Disclosure'

// What Simple mode folds away. In Full mode the children are drawn exactly where they are; in Simple mode the same
// children sit behind ONE collapsed « Voir les détails » (a Disclosure), so nothing is ever lost, only one tap away.
// Use it around an OPTIONAL or EXPERT group — never around a field the plan cannot do without.
export function Advanced({ children, label, count }: { children: ReactNode; label?: string; count?: number }) {
  const t = useT()
  const mode = useMode()
  if (mode === 'full') return <>{children}</>
  return (
    <Disclosure label={label ?? t.mode.details} count={count}>
      {children}
    </Disclosure>
  )
}
