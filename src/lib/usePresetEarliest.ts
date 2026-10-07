import { withPreset } from '../engine/assumptionPresets.ts'
import { retireAt } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { PresetEarliestMessage, PresetEarliestRequest } from './presetEarliest.worker.ts'
import { useOffThread } from './useOffThread.ts'

/** The earliest age that works under the prudent scenario (null: none up to 70), or `undefined` while it is being worked out. A result for an OLDER profile is never returned. */
export function usePresetEarliest(household: Household, assumptions: Assumptions, enabled: boolean): number | null | undefined {
  const { value, busy } = useOffThread<PresetEarliestRequest, PresetEarliestMessage, { prudent: number | null }>(
    { household, assumptions },
    () => new Worker(new URL('./presetEarliest.worker.ts', import.meta.url), { type: 'module' }),
    () => ({ prudent: retireAt(household, withPreset(assumptions, 'prudent'), { stopAtFirstOk: true }).earliestOk }),
    (m) => m,
    enabled,
  )
  return busy || value === null ? undefined : value.prudent
}
