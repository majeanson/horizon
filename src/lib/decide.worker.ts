import { regretAnswer, type RegretAnswer } from "../engine/regret.ts";
import { reverseTarget, type ReverseTarget } from "../engine/reverse.ts";
import { spouseTiming, type SpouseTiming } from "../engine/spouseTiming.ts";
import type { Assumptions, Household } from "../engine/types.ts";

// The three heavy questions of « Décider » that Phase 16 added — « I want to stop at X » (four searches), « what does one more year of work buy » (one sweep over the ages) and « who
// starts the QPP first » (nine combinations of three runs) — share ONE worker, so the engine is shipped to the device once for the three and not three times. Each is a few dozen full
// projections, off the page's thread, answered once. Nothing here touches the network or storage.

export type DecideRequest =
  | { what: "reverse"; household: Household; assumptions: Assumptions; age: number }
  | { what: "regret"; household: Household; assumptions: Assumptions }
  | { what: "timing"; household: Household; assumptions: Assumptions };

export type DecideMessage =
  | { what: "reverse"; answer: ReverseTarget }
  | { what: "regret"; answer: RegretAnswer }
  | { what: "timing"; answer: { timing: SpouseTiming | null } };

self.onmessage = (event: MessageEvent<DecideRequest>) => {
  const r = event.data;
  const message: DecideMessage =
    r.what === "reverse"
      ? { what: "reverse", answer: reverseTarget(r.household, r.assumptions, r.age) }
      : r.what === "regret"
        ? { what: "regret", answer: regretAnswer(r.household, r.assumptions) }
        : { what: "timing", answer: { timing: spouseTiming(r.household, r.assumptions) } };
  self.postMessage(message);
};
