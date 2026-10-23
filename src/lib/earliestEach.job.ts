import { earliestEach, type EarliestEach } from "../engine/retireAt.ts";
import type { Assumptions, Household } from "../engine/types.ts";
import type { JobPort } from './engineJob.ts'

// « When can EACH of us retire? » is up to two searches of a dozen full projections each — a second or two of
// arithmetic. It runs here, off the page's thread, and answers once with both people's earliest ages. Nothing here
// touches the network or storage: it receives a household and assumptions, and answers with ages.

export interface EarliestEachRequest {
  household: Household;
  assumptions: Assumptions;
}

export type EarliestEachMessage = { each: EarliestEach[] };

export function handle(event: { data: EarliestEachRequest }, self: JobPort): void {
  self.postMessage({
    each: earliestEach(event.data.household, event.data.assumptions),
  } satisfies EarliestEachMessage);
}
