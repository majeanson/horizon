// What a job module is given to answer with: the worker's own `postMessage`. Each `*.job.ts` exports `handle(event, self)` — the body the worker used to have, with `self` shadowed by this port —
// and lib/engine.worker.ts calls it. A test hands it a stub instead of a thread.

export interface JobPort {
  postMessage(message: unknown): void
}
