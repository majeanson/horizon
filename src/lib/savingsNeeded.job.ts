import { savingsNeeded, type SavingsNeeded } from "../engine/savingsNeeded.ts";
import type { Assumptions, Household } from "../engine/types.ts";

// « How much should I put aside to retire at X? » is a search: a dozen full projections. It runs here, off the page's
// thread, and answers once. Nothing here touches the network or storage.

export interface SavingsNeededRequest {
  household: Household;
  assumptions: Assumptions;
  age: number;
}

export type SavingsNeededMessage = { answer: SavingsNeeded };

self.onmessage = (event: MessageEvent<SavingsNeededRequest>) => {
  const { household, assumptions, age } = event.data;
  self.postMessage({ answer: savingsNeeded(household, assumptions, age) } satisfies SavingsNeededMessage);
};
