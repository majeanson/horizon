import { computeAnswer, type AnswerRequest, type AnswerResult } from './answer.ts'

// The results page's answer, worked out off the page's thread (lib/answer.ts says what it is). Nothing here touches the
// network or storage.

export type AnswerMessage = AnswerResult

self.onmessage = (event: MessageEvent<AnswerRequest>) => {
  self.postMessage(computeAnswer(event.data) satisfies AnswerMessage)
}
