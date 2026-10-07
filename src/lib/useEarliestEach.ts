import { useEffect, useState } from "react";
import { earliestEach, type EarliestEach } from "../engine/retireAt.ts";
import type { Assumptions, Household } from "../engine/types.ts";
import type {
  EarliestEachMessage,
  EarliestEachRequest,
} from "./earliestEach.worker.ts";

// The per-person « earliest age » for a couple, computed in a web worker where there is one (and, where a worker
// cannot be made, on the page's own thread after a turn of the event loop so the screen paints first). `null` while
// it runs, so the page can show a placeholder of the right shape. A household of one never asks.

export function useEarliestEach(
  household: Household,
  assumptions: Assumptions,
  enabled: boolean,
): EarliestEach[] | null {
  const [answer, setAnswer] = useState<{
    key: string;
    each: EarliestEach[];
  } | null>(null);
  const key = JSON.stringify([household, assumptions]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let worker: Worker | null = null;
    const done = (each: EarliestEach[]) => {
      if (!cancelled) setAnswer({ key, each });
    };
    const onThisThread = () => {
      const timer = setTimeout(
        () => done(earliestEach(household, assumptions)),
        0,
      );
      return () => clearTimeout(timer);
    };
    let stopFallback: (() => void) | null = null;
    // One turn of the event loop before the worker is made: React's development double-mount would otherwise create one and
    // terminate it while its modules are still loading, which leaves requests pending and a page that is never « idle ».
    const begin = () => {
      try {
        worker = new Worker(
          new URL("./earliestEach.worker.ts", import.meta.url),
          { type: "module" },
        );
      } catch {
        worker = null;
      }
      if (worker) {
        const w = worker;
        w.onmessage = (e: MessageEvent<EarliestEachMessage>) => {
          done(e.data.each);
          w.terminate();
        };
        w.onerror = () => {
          w.terminate();
          stopFallback = onThisThread();
        };
        w.postMessage({ household, assumptions } satisfies EarliestEachRequest);
      } else {
        stopFallback = onThisThread();
      }
    };
    const starter = setTimeout(begin, 0);
    return () => {
      cancelled = true;
      clearTimeout(starter);
      worker?.terminate();
      stopFallback?.();
    };
    // `key` stands for the two objects: they are rebuilt every render, their content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return enabled && answer?.key === key ? answer.each : null;
}
