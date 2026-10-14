import type { Lang } from '../i18n.ts'

// THE WORDS OF THE RELEVÉ CHECK. Outside the eager dictionaries: only Profil reads them.

export interface StatementCheckCopy {
  /** « Le calcul donne le même montant : 307 $ par mois. » */
  same: (engine: string) => string
  /** The calculation is higher or lower than the relevé's figure; the amount, and the share it is of it. */
  higher: (engine: string, diff: string, share: string) => string
  lower: (engine: string, diff: string, share: string) => string
  /** What the calculation is, and why it is not the projection's pension. */
  method: string
  /** What to do when the two differ. */
  check: string
}

const FR: StatementCheckCopy = {
  same: (engine) => `Le calcul donne le même montant : ${engine} par mois.`,
  higher: (engine, diff, share) => `Le calcul donne ${engine} par mois, soit ${diff} (${share}) de plus que votre relevé.`,
  lower: (engine, diff, share) => `Le calcul donne ${engine} par mois, soit ${diff} (${share}) de moins que votre relevé.`,
  method:
    'Le calcul refait celui du relevé : aucun autre revenu de travail, les barèmes d’aujourd’hui et la première bonification seulement. Ce n’est pas la rente de votre plan, qui compte aussi vos années de travail à venir.',
  check: 'Un écart vient presque toujours des revenus saisis plus bas : ils doivent être ceux de votre relevé, année par année.',
}

const EN: StatementCheckCopy = {
  same: (engine) => `The calculation gives the same amount: ${engine} a month.`,
  higher: (engine, diff, share) => `The calculation gives ${engine} a month, ${diff} (${share}) more than your statement.`,
  lower: (engine, diff, share) => `The calculation gives ${engine} a month, ${diff} (${share}) less than your statement.`,
  method:
    'The calculation redoes the statement’s own: no more work income, today’s rules and the first enhancement only. It is not your plan’s pension, which also counts your future working years.',
  check: 'A gap almost always comes from the earnings entered below: they should be those on your statement, year by year.',
}

export const STATEMENT_CHECK_COPY: Record<Lang, StatementCheckCopy> = { fr: FR, en: EN }
