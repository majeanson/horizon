import { lazy, Suspense } from 'react'
import type { FactKind, FactOwner } from '../../lib/facts'

// The « Je ne sais pas » helper under a field, loaded on its own: it carries the Statistics Canada figures, which the first screen does not need.
const Helper = lazy(() => import('./LevelHelper'))
export function LevelSlot({ kind, owner }: { kind: FactKind; owner: FactOwner }) {
  return (
    <Suspense fallback={null}>
      <Helper kind={kind} owner={owner} />
    </Suspense>
  )
}
