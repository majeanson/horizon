import { regretAnswer, type RegretAnswer } from "../engine/regret.ts";
import type { Assumptions, Household } from "../engine/types.ts";

// The regret curve is one sweep of the plan over the ages (a few dozen full projections). It runs here, off the page's thread, and answers once. Nothing here touches the network or storage.

export interface RegretRequest {
  household: Household;
  assumptions: Assumptions;
}

export type RegretMessage = { answer: RegretAnswer };

self.onmessage = (event: MessageEvent<RegretRequest>) => {
  const { household, assumptions } = event.data;
  self.postMessage({ answer: regretAnswer(household, assumptions) } satisfies RegretMessage);
};
