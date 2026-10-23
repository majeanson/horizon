import { computeAnswer, type AnswerRequest, type AnswerResult } from './answer.ts'
import type { JobPort } from './engineJob.ts'

// The results page's answer, worked out off the page's thread (lib/answer.ts says what it is). Nothing here touches the
// network or storage.

export type AnswerMessage = AnswerResult

export function handle(event: { data: AnswerRequest }, self: JobPort): void {
  self.postMessage(computeAnswer(event.data) satisfies AnswerMessage)
}
