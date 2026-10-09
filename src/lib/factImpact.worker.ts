import { factSwings, type FactSwing, type ImpactKind } from '../engine/factImpact.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// Off the page's thread: two short walks of a few full projections for every figure not yet read off a document. Nothing here
// touches the network or storage.

export interface FactImpactRequest {
  household: Household
  assumptions: Assumptions
  facts: { id: string; owner: 'self' | 'spouse' | 'household'; kind: ImpactKind }[]
}

export type FactImpactAnswer = { base: number | null; swings: Record<string, FactSwing> }

self.onmessage = (event: MessageEvent<FactImpactRequest>) => {
  const { household, assumptions, facts } = event.data
  self.postMessage(factSwings(household, assumptions, facts) satisfies FactImpactAnswer)
}
