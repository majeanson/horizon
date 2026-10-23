import type { Page } from '@playwright/test'

// WHICH HEAVY QUESTIONS THE PAGE ASKED. Every question runs in the same worker script (src/lib/engine.worker.ts), so a worker's URL no longer names it; `engineWorker` gives each worker the
// name of its job instead (`new Worker(url, { name: 'deathSweep' })`). This wraps `Worker` before the page's own scripts run and records those names, so a spec can say « nothing was asked
// before this was in view » and « it is asked now ». `delay` holds a job's request back that many ms (a question whose answer must be slow on purpose).
// Call it BEFORE the first `page.goto`; the record starts again with every navigation.

export async function trackJobs(page: Page, delay: Record<string, number> = {}): Promise<{ asked: (job: string) => Promise<boolean> }> {
  await page.addInitScript((delays: Record<string, number>) => {
    const w = window as unknown as { Worker: typeof Worker; __jobs?: string[] }
    const seen: string[] = (w.__jobs = [])
    const Native = w.Worker
    w.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        const name = options?.name
        if (!name) return
        seen.push(name)
        const ms = delays[name]
        if (ms) {
          const post = this.postMessage.bind(this) as (m: unknown) => void
          this.postMessage = ((m: unknown) => void setTimeout(() => post(m), ms)) as Worker['postMessage']
        }
      }
    }
  }, delay)
  return { asked: (job) => page.evaluate((j) => ((window as unknown as { __jobs?: string[] }).__jobs ?? []).includes(j), job) }
}
