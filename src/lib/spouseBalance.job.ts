import { spouseBalance, type SpouseBalance } from "../engine/spouseBalance.ts";
import type { Assumptions, Household } from "../engine/types.ts";

// Two plans (the household's own and the evened-out one) × a scan of retirement ages: a few dozen projections. It runs here,
// off the page's thread, and answers once. Nothing here touches the network or storage.

export interface SpouseBalanceRequest {
  household: Household;
  assumptions: Assumptions;
  age: number;
  firstAge: number;
}

/** Boxed: « no such insight here » (a one-person household, no RRSP) is an answer, and a bare null would read as « still computing ». */
export interface SpouseBalanceAnswer {
  balance: SpouseBalance | null;
}

export type SpouseBalanceMessage = { answer: SpouseBalanceAnswer };

self.onmessage = (event: MessageEvent<SpouseBalanceRequest>) => {
  const { household, assumptions, age, firstAge } = event.data;
  self.postMessage({ answer: { balance: spouseBalance(household, assumptions, age, firstAge) } } satisfies SpouseBalanceMessage);
};
