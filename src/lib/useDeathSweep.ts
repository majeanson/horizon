import type { BridgeLevers } from '../engine/bridge.ts'
import { deathSweep, type DeathSweep } from '../engine/deathSweep.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { DeathSweepRequest } from './deathSweep.worker.ts'
import { useOffThread } from './useOffThread.ts'

/** The ways of starting under each death age, or `undefined` while they are being worked out (idle priority: after what the reader is waiting for). */
export function useDeathSweep(household: Household, assumptions: Assumptions, levers: BridgeLevers, enabled: boolean): DeathSweep | undefined {
  const { value, busy } = useOffThread<DeathSweepRequest, DeathSweep, DeathSweep>(
    { household, assumptions, levers },
    () => new Worker(new URL('./deathSweep.worker.ts', import.meta.url), { type: 'module' }),
    () => deathSweep(household, assumptions, levers),
    (m) => m,
    enabled,
    'idle',
  )
  return busy || value === null ? undefined : value
}
