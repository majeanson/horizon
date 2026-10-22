// Where the first-visit questionnaire stopped, kept on this device: a person who closes the tab at the third question finds the third question, not the
// first (their answers were already in the profile; only the place was lost). Like lib/entrySteps.ts: one small key, never an error when nothing can be kept.
// The key starts with « horizon- », so a fresh start sweeps it with the rest (lib/freshStart.ts).

const KEY = 'horizon-onboard-step'

/** The step the person left on, or null: never, finished, or storage refused. The caller checks it against the screens it will show. */
export function lastOnboardStep(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function rememberOnboardStep(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* nothing kept: the questionnaire starts at its first screen, as it always did */
  }
}

export function forgetOnboardStep(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
}
