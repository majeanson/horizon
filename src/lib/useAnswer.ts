import { computeAnswer, type AnswerRequest, type AnswerResult } from './answer.ts'
import type { AnswerMessage } from './answer.worker.ts'
import { useOffThread } from './useOffThread.ts'

// The answer of the results page, off the page's thread: `value` is null until the first answer is in (the page shows a
// skeleton), then always the LAST answer — a re-asked question (a slider released, a figure typed) keeps it on screen,
// flagged `busy`, until the new one lands. The forty-odd projections behind it used to run on the page's own thread at
// every change of the profile and froze every control for their duration.
//
// The question is built by `answerRequest` (lib/answerRequest.ts). `priority: 'idle'` is for a card that is not the page's
// verdict: it waits for the first paint and the `now` requests, as useOffThread says.
export function useAnswer(request: AnswerRequest, enabled: boolean, priority: 'now' | 'idle' = 'now'): { value: AnswerResult | null; busy: boolean } {
  return useOffThread<AnswerRequest, AnswerMessage, AnswerResult>(
    request,
    () => new Worker(new URL('./answer.worker.ts', import.meta.url), { type: 'module' }),
    () => computeAnswer(request),
    (m) => m,
    enabled,
    priority,
  )
}
