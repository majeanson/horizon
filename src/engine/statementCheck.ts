import { LAST_KNOWN_YEAR } from './params/index.ts'
import { rrqPension, type YearMonth } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'

// « MONTANT ACTUEL » — what Retraite Québec's relevé de participation prints as the monthly retirement pension at 60 and at 65.
//
// The relevé says it is « une estimation de la rente de retraite que vous pourriez recevoir à l'âge indiqué, s'il n'y a pas d'autres revenus de travail qui s'ajoutent à
// ceux déjà inscrits à votre nom », « estimé selon le mode de calcul en vigueur », and that it « ne prend temporairement en compte que l'effet du premier volet » de la
// bonification. Three rules follow, and each is what the projection does NOT do (it projects a future pension in the dollars of its own start year):
//   · NO MORE EARNINGS — only the years on the relevé count; every later year is zero, so the career is as long as the start age says;
//   · TODAY'S RULES — the earnings are adjusted by today's average of the last five ceilings (AMPE5), not by a projected one, so the figure is in today's dollars;
//   · FIRST ENHANCEMENT ONLY — the second additional component (2024 on) is left out.
// Read together they reproduce a person's relevé to the dollar (a 16-year history gave 307,02 $ at 60 and 407,29 $ at 65 against the printed 307 and 407). The
// projection's own pension is another thing, and a person who compares the two should know why they differ.

/** The two ages the relevé prints. */
export type StatementAge = 60 | 65

/**
 * The relevé's « Montant actuel » at `at`, in dollars a month and to the cent, for a person with these pensionable earnings, as of `todayYear` (its last known
 * tax year at most: there is no later rule to read).
 */
export function statementEstimate(birth: YearMonth, earnings: Readonly<Record<number, number>>, at: StatementAge, todayYear: number): number {
  const year = Math.min(todayYear, LAST_KNOWN_YEAR)
  // No inflation and no wage growth: the ceilings are the published ones up to `year`, and nothing is projected beyond it.
  const base = makeRrqRules({ inflation: 0, wageGrowth: 0 })
  let sum = 0
  for (let y = year - 4; y <= year; y++) sum += base.mga(y)
  const rules = { ...base, ampe5Fixed: sum / 5, secondFrom: Number.MAX_SAFE_INTEGER }
  return rrqPension({ birth, earnings, startAge: at }, rules).monthly
}
