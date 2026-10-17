import { reverseTarget, type ReverseTarget } from "../engine/reverse.ts";
import type { Assumptions, Household } from "../engine/types.ts";

// « I want to stop at X, what has to be true? » is four searches (a few dozen full projections). It runs here, off the page's thread, and answers once. Nothing here touches the network or storage.

export interface ReverseRequest {
  household: Household;
  assumptions: Assumptions;
  age: number;
}

export type ReverseMessage = { answer: ReverseTarget };

self.onmessage = (event: MessageEvent<ReverseRequest>) => {
  const { household, assumptions, age } = event.data;
  self.postMessage({ answer: reverseTarget(household, assumptions, age) } satisfies ReverseMessage);
};
