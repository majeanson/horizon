import { factsOf, type Fact } from './facts.ts'
import type { Profile } from './schema.ts'

// PROFIL'S MAP, COUNTED (components/profile/ProfileMap.tsx): its own module, so the first screen — which reads lib/facts.ts — does not carry it.
export interface Progress {
  done: number
  total: number
}

/** How far each block of Profil's map is confirmed: a person's chip counts that person's figures, Budget the two budgets, Maison the house and the
 *  mortgage. A block with no figure to confirm (Famille, Événements) has no entry — the map then shows no count for it. */
export function mapProgress(p: Profile): Record<string, Progress> {
  const out: Record<string, Progress> = {}
  const count = (key: string, f: Fact) => {
    const c = (out[key] ??= { done: 0, total: 0 })
    c.total++
    if (f.confirmed) c.done++
  }
  for (const f of factsOf(p)) {
    if (f.owner !== 'household') count(`person-${f.owner}`, f)
    else if (f.doc === 'budget') count('budget', f)
    else if (f.doc === 'home') count('maison', f)
  }
  return out
}
