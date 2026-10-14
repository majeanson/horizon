import type { Lang } from '../i18n.ts'

// THE WORDS OF « COMME SUR LE DOCUMENT » (the facsimile views of « Par document »). Outside the eager dictionaries: only a reader who opens the view loads them.
//
// Two kinds of string live here, and they follow different rules:
//   · the QUOTES are the DOCUMENT'S OWN words, verbatim, in the document's own language — the Retraite Québec relevé is French even in the English app, the CRA
//     account is English even in the French app — so they are byte-identical in `fr` and `en` on purpose (facsimileCopy.test.ts pins both the exact wording and
//     that equality). The reader holds the paper: the screen must say what the paper says, or the box cannot be found.
//   · the CHROME (the hint, the frame line, the reason a column is unused) is the app's, in the reader's language.

export interface FacsimileQuotes {
  /** The relevé de participation (Retraite Québec). */
  rrq: { section: string; table: string; age60: string; age65: string; current: string; projected: string }
  /** The CRA account, « Savings and pension plans ». */
  cra: { screen: string; rrsp: string; tfsa: string }
}

export interface FacsimileCopy {
  quotes: FacsimileQuotes
  rrq: {
    /** Under the view's switch: what to do with the screen. */
    hint: string
    /** The frame line: this is the document's LAYOUT, never the document. */
    frame: string
    /** Why the « projected » column is drawn but not a box to fill. */
    projectedWhy: string
    /** The accessible name of the table. */
    tableLabel: string
  }
  cra: { hint: string; frame: string; groupLabel: string }
}

const FR: FacsimileCopy = {
  quotes: {
    rrq: { section: 'Estimation des prestations', table: 'Rente de retraite', age60: '60 ans', age65: '65 ans', current: 'Montant actuel', projected: 'Montant projeté' },
    cra: { screen: 'Savings and pension plans', rrsp: 'RRSP deduction limit', tfsa: 'TFSA contribution room — As of January 1' },
  },
  rrq: {
    hint: 'Recopiez les cases de votre relevé.',
    frame: 'Disposé comme votre relevé, sans en être une copie.',
    projectedWhy: 'La colonne projetée ne sert pas, car son estimation ne compte que la première bonification du régime.',
    tableLabel: 'Estimation de la rente de retraite du relevé',
  },
  cra: {
    hint: 'Recopiez les cases de votre compte de l’ARC.',
    frame: 'Disposé comme votre compte de l’ARC, sans en être une copie.',
    groupLabel: 'Les droits de cotisation du compte de l’ARC',
  },
}

const EN: FacsimileCopy = {
  quotes: {
    rrq: { section: 'Estimation des prestations', table: 'Rente de retraite', age60: '60 ans', age65: '65 ans', current: 'Montant actuel', projected: 'Montant projeté' },
    cra: { screen: 'Savings and pension plans', rrsp: 'RRSP deduction limit', tfsa: 'TFSA contribution room — As of January 1' },
  },
  rrq: {
    hint: 'Copy the boxes of your statement. It is in French, whatever language the app is in.',
    frame: 'Laid out like your statement, not a copy of it.',
    projectedWhy: 'The projected column is not used: its estimate counts only the first enhancement of the plan.',
    tableLabel: 'The statement’s retirement pension estimate',
  },
  cra: {
    hint: 'Copy the boxes of your CRA account.',
    frame: 'Laid out like your CRA account, not a copy of it.',
    groupLabel: 'The contribution room of the CRA account',
  },
}

export const FACSIMILE_COPY: Record<Lang, FacsimileCopy> = { fr: FR, en: EN }
