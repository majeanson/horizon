import type { EngineJob } from './engine.worker.ts'

// A worker for one heavy question. The script is the SAME for every question (lib/engine.worker.ts: the engine is downloaded and cached once), so the job's name travels with each message and the
// worker picks the module that answers it. The page's code is unchanged by it: it still posts a request and reads the answer, and ends the worker when done — `postMessage` here wraps the request.

export function engineWorker(job: EngineJob): Worker {
  const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
  const post = worker.postMessage.bind(worker) as (message: unknown) => void
  worker.postMessage = ((req: unknown) => post({ job, req })) as Worker['postMessage']
  return worker
}
