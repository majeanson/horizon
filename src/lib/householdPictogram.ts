import type { Person } from '../engine/types'
import type { ConceptId } from './concepts'
import type { Profile } from './schema'

// A household as a short row of pictograms — who is in it (and how far along in a working life), the children, the home, what is saved, an employer pension,
// an inheritance or care still ahead — read off the profile and nothing else. Pure: the clock is an input. It carries no words (the household's story and the
// answer beside it say them), so it is a picture, never the only cue.

type LifeStage = 'young' | 'middle' | 'near' | 'retired'

interface PictogramToken {
  /** Stable within a row: the key, and what a test names. */
  id: string
  concept: ConceptId
  /** A person's place in the household (0 = the first, the marigold; 1 = the second, the sky): only on a person. */
  who?: 0 | 1
}

/** From the planned stop on is retired; under 40 is young (whatever the stop: a young person who plans to stop at 47 is still young); within ten years of the stop is near; the rest is the middle of a working life. */
export function lifeStage(person: Pick<Person, 'birth' | 'retirementAge'>, year: number): LifeStage {
  const age = year - person.birth.year
  if (age >= person.retirementAge) return 'retired'
  if (age < 40) return 'young'
  if (person.retirementAge - age <= 10) return 'near'
  return 'middle'
}

const STAGE_CONCEPT: Record<LifeStage, ConceptId> = { young: 'jeune', middle: 'personne', near: 'avance', retired: 'retraite' }

/** One to three « $ » for what is saved in the three accounts: under 100 000 $, under 500 000 $, more; none at all shows none. */
export function savingsTier(persons: readonly Pick<Person, 'accounts'>[]): 0 | 1 | 2 | 3 {
  const total = persons.reduce((s, p) => s + p.accounts.rrsp.balance + p.accounts.tfsa.balance + p.accounts.nonReg.balance, 0)
  return total <= 0 ? 0 : total < 100_000 ? 1 : total < 500_000 ? 2 : 3
}

/** Children shown: those still at home or to come (a child older than 18 has left), at most three. */
const KIDS_SHOWN = 3
const LEFT_HOME_AT = 18

export function pictogramOf(profile: Profile, year: number): PictogramToken[] {
  const h = profile.household
  const tokens: PictogramToken[] = h.persons.map((p, i) => ({ id: `person-${i}`, concept: STAGE_CONCEPT[lifeStage(p, year)], who: Math.min(i, 1) as 0 | 1 }))
  const kids = (h.children ?? []).filter((born) => year - born < LEFT_HOME_AT).length
  for (let i = 0; i < Math.min(kids, KIDS_SHOWN); i++) tokens.push({ id: `child-${i}`, concept: 'enfants' })
  if (h.home) tokens.push({ id: 'home', concept: 'maison' })
  for (let i = 0; i < savingsTier(h.persons); i++) tokens.push({ id: `money-${i}`, concept: 'dollars' })
  if (h.persons.some((p) => p.pensions.length > 0)) tokens.push({ id: 'pension', concept: 'employeur' })
  const flows = h.flows ?? []
  if (flows.some((f) => f.kind === 'windfall' && f.toYear >= year)) tokens.push({ id: 'windfall', concept: 'heritage' })
  // Care is shown only where the household said it was care (the starting point of Dépenses à prévoir): a dated cost with another name is not guessed at.
  if (flows.some((f) => f.kind === 'expense' && f.estimate === 'care')) tokens.push({ id: 'care', concept: 'soins' })
  return tokens
}
