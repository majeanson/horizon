import { framed, isPreview } from './preview'

// THE FIRST ANSWER: the first time this device sees the plan produce an answer, the results page's map lights its pips one after another (styles/motion.css), once.
// Whether it was seen is a preference of THIS device, like the time budget (lib/timeBudget.ts) — not part of the profile, so not in the versioned store.
// A frame (the portfolio's live preview) and the preview household are shown the finished page: the flourish is for a person's own first plan.

const FIRST_ANSWER_KEY = 'horizon-first-answer'

export function firstAnswerSeen(): boolean {
  if (framed() || isPreview()) return true
  try {
    return localStorage.getItem(FIRST_ANSWER_KEY) === 'done'
  } catch {
    return true // storage blocked: never repeat it on every visit
  }
}

export function markFirstAnswerSeen(): void {
  try {
    localStorage.setItem(FIRST_ANSWER_KEY, 'done')
  } catch {
    /* storage blocked — nothing to remember */
  }
}
