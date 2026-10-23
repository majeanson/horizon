import { fillComparison, type FillComparison } from "../engine/bracketFillCompare.ts";
import type { Assumptions, Household } from "../engine/types.ts";
import type { JobPort } from './engineJob.ts'

// Three full plans × a scan of retirement ages is a few dozen projections. It runs here, off the page's thread, and
// answers once. Nothing here touches the network or storage.

export interface BracketFillRequest {
  household: Household;
  assumptions: Assumptions;
  firstAge: number;
}

export type BracketFillMessage = { answer: FillComparison };

export function handle(event: { data: BracketFillRequest }, self: JobPort): void {
  const { household, assumptions, firstAge } = event.data;
  self.postMessage({ answer: fillComparison(household, assumptions, firstAge) } satisfies BracketFillMessage);
}
