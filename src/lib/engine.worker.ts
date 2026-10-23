import { handle as answer } from './answer.job.ts'
import { handle as bracketFill } from './bracketFill.job.ts'
import { handle as bridge } from './bridge.job.ts'
import { handle as careEarliest } from './careEarliest.job.ts'
import { handle as deathSweep } from './deathSweep.job.ts'
import { handle as decide } from './decide.job.ts'
import { handle as earliestEach } from './earliestEach.job.ts'
import { handle as factImpact } from './factImpact.job.ts'
import { handle as leversEarliest } from './leversEarliest.job.ts'
import { handle as marketEarliest } from './marketEarliest.job.ts'
import { handle as planFacts } from './planFacts.job.ts'
import { handle as plansCompare } from './plansCompare.job.ts'
import { handle as presetEarliest } from './presetEarliest.job.ts'
import { handle as runs } from './runs.job.ts'
import { handle as savingsNeeded } from './savingsNeeded.job.ts'
import { handle as sensitivity } from './sensitivity.job.ts'
import { handle as spendEarliest } from './spendEarliest.job.ts'
import { handle as spouseBalance } from './spouseBalance.job.ts'
import { handle as withdrawalOrders } from './withdrawalOrders.job.ts'
import type { JobPort } from './engineJob.ts'

// THE ONE WORKER. Every heavy question runs here, off the page's thread — and the engine is shipped to the device once, not once per question: nineteen scripts of ~34 KiB gzip each, nearly all the
// same engine, were nineteen downloads and nineteen entries in the offline cache. The page still makes one worker per question and ends it when answered (lib/engineWorker.ts), so questions
// still run side by side on several cores; only the script is shared. A message is `{ job, req }`: the job names the module whose `handle` takes the request. Nothing here touches the network or storage.

const jobs = {
  answer,
  bracketFill,
  bridge,
  careEarliest,
  deathSweep,
  decide,
  earliestEach,
  factImpact,
  leversEarliest,
  marketEarliest,
  planFacts,
  plansCompare,
  presetEarliest,
  runs,
  savingsNeeded,
  sensitivity,
  spendEarliest,
  spouseBalance,
  withdrawalOrders,
}

export type EngineJob = keyof typeof jobs

self.onmessage = (event: MessageEvent<{ job: EngineJob; req: unknown }>) => {
  const { job, req } = event.data
  const run = jobs[job] as (e: { data: unknown }, port: JobPort) => void
  run({ data: req }, self)
}
