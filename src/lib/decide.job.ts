import { fan, type FanLine } from "../engine/fan.ts";
import { regretAnswer, type RegretAnswer } from "../engine/regret.ts";
import { reverseTarget, type ReverseTarget } from "../engine/reverse.ts";
import { spouseTiming, type SpouseTiming } from "../engine/spouseTiming.ts";
import type { Assumptions, Household } from "../engine/types.ts";
import type { JobPort } from './engineJob.ts'

// The heavy questions that Phase 16 added to « Décider » and « Preuve » — « I want to stop at X » (four searches), « what does one more year of work buy » (one sweep over the ages) and « who
// starts the QPP first » (nine combinations of three runs), and the plan year by year under five ways the markets could go — share ONE worker, so the engine is shipped to the device once and not once each. Each is a few dozen full
// projections, off the page's thread, answered once. Nothing here touches the network or storage.

export type DecideRequest =
  | { what: "reverse"; household: Household; assumptions: Assumptions; age: number }
  | { what: "regret"; household: Household; assumptions: Assumptions }
  | { what: "timing"; household: Household; assumptions: Assumptions }
  | { what: "fan"; household: Household; assumptions: Assumptions };

export type DecideMessage =
  | { what: "reverse"; answer: ReverseTarget }
  | { what: "regret"; answer: RegretAnswer }
  | { what: "timing"; answer: { timing: SpouseTiming | null } }
  | { what: "fan"; answer: { lines: FanLine[] } };

export function handle(event: { data: DecideRequest }, self: JobPort): void {
  const r = event.data;
  const message: DecideMessage =
    r.what === "reverse"
      ? { what: "reverse", answer: reverseTarget(r.household, r.assumptions, r.age) }
      : r.what === "regret"
        ? { what: "regret", answer: regretAnswer(r.household, r.assumptions) }
        : r.what === "timing"
          ? { what: "timing", answer: { timing: spouseTiming(r.household, r.assumptions) } }
          : { what: "fan", answer: { lines: fan(r.household, r.assumptions) } };
  self.postMessage(message);
}
