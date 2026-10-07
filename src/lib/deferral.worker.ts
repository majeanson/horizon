import { deferralView, type DeferralView } from '../engine/deferral.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « When should I start my pension? » is one projection per start age plus a retirement-age search for each — a few
// seconds of arithmetic for a couple. It runs here, off the page's thread, and answers once. Nothing here touches the
// network or storage: it receives a household and assumptions, and answers with numbers.

export interface DeferralRequest {
  household: Household
  assumptions: Assumptions
}

export type DeferralMessage = { view: DeferralView }

self.onmessage = (event: MessageEvent<DeferralRequest>) => {
  self.postMessage({ view: deferralView(event.data.household, event.data.assumptions) } satisfies DeferralMessage)
}
