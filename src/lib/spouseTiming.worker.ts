import { spouseTiming, type SpouseTiming } from "../engine/spouseTiming.ts";
import type { Assumptions, Household } from "../engine/types.ts";

// Nine combinations of start ages, three runs each, is about thirty full projections. It runs here, off the page's thread, and answers once. Nothing here touches the network or storage.

export interface SpouseTimingRequest {
  household: Household;
  assumptions: Assumptions;
}

export type SpouseTimingMessage = { answer: { timing: SpouseTiming | null } };

self.onmessage = (event: MessageEvent<SpouseTimingRequest>) => {
  const { household, assumptions } = event.data;
  self.postMessage({ answer: { timing: spouseTiming(household, assumptions) } } satisfies SpouseTimingMessage);
};
