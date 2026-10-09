import { roundTo } from './params/project.ts'
import { adjustmentFactor, ampe5, type RrqRules } from './rrq.ts'

// The QPP surviving spouse's pension — Loi sur le régime de rentes du Québec, articles 133 to 137.2, as read on
// LégisQuébec (params/2026.ts cites each share). The month after a contributor's death, their spouse receives, for life:
//
//   · a share of the deceased's BASE component (art. 137): the 25 % part of their retirement pension, « sans tenir compte des
//     ajustements prévus à l'article 120.1 » — unadjusted for the age it started — or, for a contributor not yet receiving
//     one, the base pension computed for the year of death; indexed to the year paid;
//   · 50 % of each of the deceased's two ADDITIONAL components (arts. 137.1, 137.2), likewise unadjusted and indexed;
//   · under 65, the FLAT-RATE portion (« prestation uniforme », art. 133 2nd para.), by the survivor's age.
//
// Under 65 with no retirement pension of their own (art. 133): 37,5 % × base + additional + flat rate.
// From 65 with none (art. 134): 60 % × base + additional.
// With a retirement pension of their own, the two are COMBINED and capped (arts. 136 and 136.1): the base part becomes
//   under 65: min( 37,5 % × a + b , b + (c − d) ), and from 65: min( c − d , max( 37,5 % × a , 60 % × a − 40 % × d ) ),
// where a is the deceased's base component, b the flat rate, d the survivor's own base retirement pension (as adjusted for
// its start age, indexed), and c the year's maximum monthly base pension (art. 116.6: 25 % of a twelfth of the average
// maximum pensionable earnings) adjusted for the age the survivor's own pension started « en considérant que le rapport … est
// égal à un » (the full 0,6 % a month early, 0,7 % a month late). A result below zero is nil; the additional shares are added
// outside the cap. The death benefit, the orphan's pension and a disabled survivor's rules are not modelled.

export interface SurvivorRules {
  baseShareUnder65: number
  baseShare65: number
  additionalShare: number
  ownPensionOffset: number
  /** The flat-rate portion for the year, indexed (45–64, and under 45 without a dependent child). */
  flatRate45to64: number
  flatRateUnder45: number
}

/** The deceased's three components for the month of death, unadjusted for their start age, in the dollars of the year paid. */
export interface DeceasedComponents {
  base: number
  additionalFirst: number
  additionalSecond: number
}

export interface SurvivorInput {
  /** The survivor's age attained in the year. */
  age: number
  deceased: DeceasedComponents
  /** The survivor's OWN base retirement pension this year (adjusted for its start age, indexed), or null while none is payable. */
  ownBase: number | null
  /** The age the survivor's own pension started (read only when `ownBase` is not null). */
  ownStartAge: number
  /** The year paid (for the year's maximum base pension). */
  year: number
}

/** The year's maximum monthly base pension (art. 116.6), to the cent. */
export function maxBasePension(year: number, rrq: RrqRules): number {
  return roundTo((rrq.baseRate * ampe5(year, rrq)) / 12, 0.01)
}

/** The surviving spouse's monthly pension for one month of `input.year`, to the cent. */
export function survivorPensionMonthly(input: SurvivorInput, rules: SurvivorRules, rrq: RrqRules): number {
  const a = input.deceased.base
  const additional = rules.additionalShare * (input.deceased.additionalFirst + input.deceased.additionalSecond)
  const from65 = input.age >= rrq.normalAge
  const flat = from65 ? 0 : input.age >= 45 ? rules.flatRate45to64 : rules.flatRateUnder45

  let basePart: number
  if (input.ownBase === null) {
    basePart = from65 ? rules.baseShare65 * a : rules.baseShareUnder65 * a + flat
  } else {
    const d = input.ownBase
    // « c »: the maximum base pension of the year, adjusted for the survivor's own start age at the maximum's ratio of one.
    const c = maxBasePension(input.year, rrq) * adjustmentFactor(input.ownStartAge, 1, 1, rrq)
    if (from65) {
      const e = rules.baseShareUnder65 * a
      const f = rules.baseShare65 * a - rules.ownPensionOffset * d
      basePart = Math.min(c - d, Math.max(e, f))
    } else {
      const g = rules.baseShareUnder65 * a + flat
      const h = flat + (c - d)
      basePart = Math.min(g, h)
    }
    basePart = Math.max(0, basePart)
  }
  return roundTo(basePart + additional, 0.01)
}
