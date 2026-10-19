// The words of the cash-buffer card on Ma fiche (components/sheet/CashBufferCard.tsx). Like bracketFillCopy.ts they live outside the
// eager dictionaries (a bundle-budget reason), so cashBufferCopy.test.ts does the parity job: both languages, none empty, none left in the
// other language, and no figure typed into a sentence (the months, the band and the dollars all arrive as arguments).
// French punctuation: U+00A0 before « : », U+202F before « ; ? ! % $ » and inside « … » (frenchSpacing.test.ts).

export interface CashBufferCopy {
  /** The line's label. */
  title: string
  /** Every function takes already-formatted strings: `months` is the buffer, `min` / `max` the band, `liquid` the dollars. */
  empty: (min: string, max: string) => string
  below: (months: string, min: string, max: string) => string
  within: (months: string, min: string, max: string) => string
  above: (months: string, min: string, max: string) => string
  /** What is counted, and what is not: always shown beneath the line. */
  basis: (liquid: string) => string
  /** The band is a rule of thumb, not an official figure. */
  caveat: string
  /** The fold that holds it. */
  caveatTitle: string
}

const FR: CashBufferCopy = {
  title: 'Coussin de liquidités',
  empty: (min, max) => `Aucun argent dans le CELI ni dans un compte non enregistré : un coussin de ${min} à ${max} mois de dépenses de retraite évite de vendre des placements au mauvais moment.`,
  below: (months, min, max) => `Environ ${months} mois de dépenses de retraite en liquidités, sous la zone de ${min} à ${max} mois souvent visée.`,
  within: (months, min, max) => `Environ ${months} mois de dépenses de retraite en liquidités, dans la zone de ${min} à ${max} mois souvent visée.`,
  above: (months, min, max) => `Environ ${months} mois de dépenses de retraite en liquidités, au-delà de la zone de ${min} à ${max} mois souvent visée : le surplus pourrait travailler ailleurs.`,
  basis: (liquid) => `Compté : le CELI et les comptes non enregistrés des deux partenaires (${liquid}). Le REER n’est pas compté, car il est imposable au retrait.`,
  caveat: 'Cette zone est un repère courant, pas un chiffre officiel. Elle n’entre dans aucun calcul du plan.',
  caveatTitle: 'Ce que ce repère veut dire',
}

const EN: CashBufferCopy = {
  title: 'Cash buffer',
  empty: (min, max) => `No money in the TFSA or in a non-registered account: a buffer of ${min} to ${max} months of retirement spending avoids selling investments at a bad time.`,
  below: (months, min, max) => `About ${months} months of retirement spending held in liquid accounts, under the ${min} to ${max} months often aimed for.`,
  within: (months, min, max) => `About ${months} months of retirement spending held in liquid accounts, within the ${min} to ${max} months often aimed for.`,
  above: (months, min, max) => `About ${months} months of retirement spending held in liquid accounts, above the ${min} to ${max} months often aimed for: the surplus could work elsewhere.`,
  basis: (liquid) => `Counted: both spouses’ TFSA and non-registered accounts (${liquid}). The RRSP is not counted, because it is taxable when withdrawn.`,
  caveat: 'This range is a common rule of thumb, not an official figure. It enters no calculation of the plan.',
  caveatTitle: 'What this range means',
}

export const CASH_BUFFER_COPY = { fr: FR, en: EN }
