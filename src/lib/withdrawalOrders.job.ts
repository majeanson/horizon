import { withdrawalOrders, type WithdrawalOrders } from "../engine/withdrawalOrders.ts";
import type { Assumptions, Household } from "../engine/types.ts";
import type { JobPort } from './engineJob.ts'

// Six orders × a scan of retirement ages is a hundred-odd full projections. It runs here, off the page's thread, and
// answers once. Nothing here touches the network or storage.

export interface WithdrawalOrdersRequest {
  household: Household;
  assumptions: Assumptions;
  age: number;
  firstAge: number;
}

export type WithdrawalOrdersMessage = { answer: WithdrawalOrders };

export function handle(event: { data: WithdrawalOrdersRequest }, self: JobPort): void {
  const { household, assumptions, age, firstAge } = event.data;
  self.postMessage({ answer: withdrawalOrders(household, assumptions, age, firstAge) } satisfies WithdrawalOrdersMessage);
}
