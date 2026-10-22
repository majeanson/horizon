import type { Lang } from '../i18n.ts'
import type { SheetAbsence, SlotKind, StatId } from './sheetModel.ts'

// THE WORDS OF THE HOUSEHOLD SHEET (/fiche). Outside the eager dictionaries: only the sheet page reads them. The words are given the figures already
// formatted (lib/sheetView.ts): nothing here types a number or a rate (lib/sheetCopy.test.ts).

export interface SheetWords {
  title: string
  intro: string
  stats: Record<StatId, { name: string; hint: string }>
  value: { age: (n: string) => string; years: (n: string) => string; share: (pct: string) => string; count: (n: number, of: number) => string; pending: string; none: string; noAge: (max: number) => string }
  /** What a full bar stands for — the figures arrive formatted. */
  scale: { runway: (years: string) => string; cover: string; saving: (pct: string) => string; keep: string; resilience: (n: number) => string }
  detail: {
    runway: (planned: string, margin: string) => string
    runwayLate: (planned: string, earliest: string) => string
    runwayNone: string
    cover: (yearAge: string) => string
    saving: string
    keep: (yearAge: string) => string
    resilience: (held: string) => string
    resilienceNone: string
    retired: string
    noEarner: string
  }
  verdict: { title: string }
  /** The one sentence under each card's title — and what a closed card says in place of its body. */
  sentences: { situation: string; holdings: string; sharpen: string }
  groups: { today: { title: string; hint: string }; retirement: { title: string; hint: string } }
  howToRead: string
  slots: {
    title: string
    empty: string
    kind: Record<SlotKind, string>
    confirmed: string
    estimated: string
    household: string
    groups: { investable: string; pension: string; home: string }
    investableTotal: (amount: string) => string
    share: (pct: string) => string
    pensionStart: (age: string) => string
    homeNote: string
    roomTitle: string
    room: (account: string, amount: string) => string
    account: { rrsp: string; tfsa: string }
    edit: string
    tags: { diversified: string; mortgageFree: string }
  }
  sharpen: { title: string; intro: string; swing: (years: number) => string; pending: string; remaining: (n: number) => string; allDone: string; none: string; noMover: string; absentTitle: string; absent: Record<SheetAbsence, string> }
  accuracy: (confirmed: number, total: number) => string
  scenarioNames: { prudent: string; neutral: string; bold: string }
  /** The sentence under the title when nothing can be said yet. */
  empty: string
  toProfile: string
  /** The map of the sheet's sections (a screen reader's name for it). */
  nav: string
  toResults: string
  /** The link to the sheet, on the settings page (the header has it too, where the screen is wide enough). */
  open: string
}

const FR: SheetWords = {
  title: 'Ma fiche',
  verdict: { title: 'Où vous en êtes' },
  sentences: { situation: 'Le plus tôt où l’argent dure, et la solidité du plan.', holdings: 'Les comptes, les rentes et la maison sur lesquels le plan repose.', sharpen: 'Les chiffres qui feraient le plus bouger la réponse.' },
  groups: { today: { title: 'Aujourd’hui', hint: 'Pendant que vous travaillez encore.' }, retirement: { title: 'À la retraite', hint: 'Une fois toutes les rentes versées.' } },
  howToRead: 'Comment lire cette mesure',
  intro: 'Votre ménage d’un coup d’œil. Tout vient du même calcul que la réponse, et chaque carte mène à l’endroit où le changer.',
  stats: {
    runway: { name: 'Âge le plus tôt', hint: 'Le plus tôt où tout le monde peut arrêter de travailler et où l’argent dure jusqu’au bout.' },
    cover: { name: 'Rentes', hint: 'La part des dépenses que les rentes paient seules, après impôt, une fois qu’elles sont toutes versées.' },
    saving: { name: 'Épargne', hint: 'Ce que ceux qui travaillent encore mettent de côté chaque année, par rapport à leur salaire.' },
    keep: { name: 'Ce qui reste', hint: 'La part de l’argent reçu qui reste après l’impôt sur le revenu et la récupération de la PSV.' },
    resilience: { name: 'Solidité', hint: 'Dans combien des trois scénarios (Prudent, Neutre, Audacieux) votre plan tient jusqu’à la fin.' },
  },
  value: { age: (n) => `${n} ans`, years: (n) => `${n} ans`, share: (pct) => pct, count: (n, of) => `${n} sur ${of}`, pending: 'Calcul en cours…', none: 'Rien à montrer', noAge: (max) => `Aucun âge jusqu’à ${max} ans` },
  scale: {
    runway: (years) => `Barre pleine : ${years} de marge.`,
    cover: 'Barre pleine : toutes les dépenses payées par les rentes.',
    saving: (pct) => `Barre pleine : ${pct} du salaire mis de côté.`,
    keep: 'Barre pleine : aucun impôt.',
    resilience: (n) => `Barre pleine : les ${n} scénarios.`,
  },
  detail: {
    runway: (planned, margin) => `Vous prévoyez arrêter à ${planned} : ${margin} de marge.`,
    runwayLate: (planned, earliest) => `Vous prévoyez arrêter à ${planned}, mais l’argent ne dure qu’à partir de ${earliest}.`,
    runwayNone: 'L’argent ne dure à aucun âge essayé.',
    cover: (yearAge) => `Lue en ${yearAge}, la première année où toutes les rentes sont versées.`,
    saving: 'Vos cotisations et celles de votre employeur, sur le salaire de ceux qui travaillent encore.',
    keep: (yearAge) => `Lue en ${yearAge}, sur le revenu net des deux déclarations.`,
    resilience: (held) => `Le plan tient sous : ${held}.`,
    resilienceNone: 'Le plan ne tient sous aucun des trois scénarios.',
    retired: 'Tout le monde est déjà à la retraite : la question n’est plus « quand ? ».',
    noEarner: 'Personne ne travaille plus : rien à épargner.',
  },
  slots: {
    title: 'Ce que vous détenez',
    empty: 'Aucun compte ni aucune rente saisis pour l’instant.',
    kind: { rrsp: 'REER', tfsa: 'CELI', nonReg: 'Non enregistré', pension: 'Rente d’employeur', home: 'Maison, valeur nette' },
    confirmed: 'lu sur un document',
    estimated: 'non confirmé',
    household: 'Le ménage',
    groups: { investable: 'Épargne et placements', pension: 'Rentes d’employeur', home: 'Maison' },
    investableTotal: (amount) => `Total : ${amount}, en dollars d’aujourd’hui`,
    share: (pct) => `${pct} du total`,
    pensionStart: (age) => `Débute à ${age}`,
    homeNote: 'Valeur nette, présentée à part : elle n’entre pas dans le total.',
    roomTitle: 'Droits de cotisation inutilisés',
    room: (account, amount) => `${account} : ${amount}`,
    account: { rrsp: 'REER', tfsa: 'CELI' },
    edit: 'Modifier',
    tags: { diversified: 'Trois types de comptes', mortgageFree: 'Hypothèque payée avant la retraite' },
  },
  sharpen: {
    title: 'Ce qui préciserait la réponse',
    intro: 'Les chiffres pas encore lus sur un document, classés selon ce qu’une erreur sur chacun ferait bouger la réponse. Un classement, pas une marge d’erreur.',
    swing: (years) => `jusqu’à ${years} ${years === 1 ? 'an' : 'ans'}`,
    pending: 'Classement en cours…',
    remaining: (n) => `${n} ${n > 1 ? 'chiffres ne sont pas encore lus' : 'chiffre n’est pas encore lu'} sur un document.`,
    allDone: 'Tous les chiffres sont lus sur un document.',
    none: 'Rien à classer pour l’instant.',
    noMover: 'Aucun de ces chiffres, s’il était faux, ne déplacerait la réponse.',
    absentTitle: 'Ce qui manque encore au profil',
    absent: {
      statement: 'Vos revenus admissibles de votre relevé RRQ, année par année.',
      accounts: 'Les soldes de vos comptes : REER, CELI, non enregistré.',
      spendingWork: 'Vos dépenses pendant les années de travail.',
    },
  },
  accuracy: (confirmed, total) => `${confirmed} chiffres sur ${total} sont lus sur un document.`,
  scenarioNames: { prudent: 'Prudent', neutral: 'Neutre', bold: 'Audacieux' },
  empty: 'Entrez un revenu et vos dépenses à la retraite : la fiche se remplit avec le calcul.',
  toProfile: 'Aller au profil',
  nav: 'Sections de la fiche',
  toResults: 'Voir la réponse',
  open: 'Ouvrir ma fiche',
}

const EN: SheetWords = {
  title: 'My sheet',
  verdict: { title: 'Where you stand' },
  sentences: { situation: 'The earliest the money lasts, and how sturdy the plan is.', holdings: 'The accounts, pensions and home the plan stands on.', sharpen: 'The figures that would move the answer most.' },
  groups: { today: { title: 'Today', hint: 'While you still work.' }, retirement: { title: 'Once retired', hint: 'When every pension is in pay.' } },
  howToRead: 'How to read this measure',
  intro: 'Your household at a glance. All of it comes from the same calculation as the answer, and each card leads to where you change it.',
  stats: {
    runway: { name: 'Earliest age', hint: 'The earliest everyone can stop working with the money lasting to the end.' },
    cover: { name: 'Pensions', hint: 'The share of spending the pensions pay on their own, after tax, once they are all in pay.' },
    saving: { name: 'Saving', hint: 'What those who still work put aside each year, against their pay.' },
    keep: { name: 'What is left', hint: 'The share of the money received that is left after income tax and the OAS recovery.' },
    resilience: { name: 'Resilience', hint: 'Under how many of the three scenarios (Prudent, Neutral, Bold) your plan lasts to the end.' },
  },
  value: { age: (n) => `${n}`, years: (n) => `${n} years`, share: (pct) => pct, count: (n, of) => `${n} of ${of}`, pending: 'Working it out…', none: 'Nothing to show', noAge: (max) => `No age up to ${max}` },
  scale: {
    runway: (years) => `Full bar: ${years} of margin.`,
    cover: 'Full bar: all spending paid by the pensions.',
    saving: (pct) => `Full bar: ${pct} of pay put aside.`,
    keep: 'Full bar: no tax.',
    resilience: (n) => `Full bar: all ${n} scenarios.`,
  },
  detail: {
    runway: (planned, margin) => `You plan to stop at ${planned}: ${margin} of margin.`,
    runwayLate: (planned, earliest) => `You plan to stop at ${planned}, but the money only lasts from ${earliest}.`,
    runwayNone: 'The money lasts at no age tried.',
    cover: (yearAge) => `Read in ${yearAge}, the first year every pension is in pay.`,
    saving: 'Your contributions and your employer’s, against the pay of those who still work.',
    keep: (yearAge) => `Read in ${yearAge}, on the net income of both returns.`,
    resilience: (held) => `The plan holds under: ${held}.`,
    resilienceNone: 'The plan holds under none of the three scenarios.',
    retired: 'Everyone is already retired: the question is no longer “when?”.',
    noEarner: 'Nobody works any more: nothing to save.',
  },
  slots: {
    title: 'What you hold',
    empty: 'No account or pension entered yet.',
    kind: { rrsp: 'RRSP', tfsa: 'TFSA', nonReg: 'Non-registered', pension: 'Employer pension', home: 'Home, net equity' },
    confirmed: 'read off a document',
    estimated: 'unconfirmed',
    household: 'The household',
    groups: { investable: 'Savings and investments', pension: 'Employer pensions', home: 'Home' },
    investableTotal: (amount) => `Total: ${amount}, in today’s dollars`,
    share: (pct) => `${pct} of the total`,
    pensionStart: (age) => `Starts at ${age}`,
    homeNote: 'Net equity, shown apart: it is not in the total.',
    roomTitle: 'Unused contribution room',
    room: (account, amount) => `${account}: ${amount}`,
    account: { rrsp: 'RRSP', tfsa: 'TFSA' },
    edit: 'Change',
    tags: { diversified: 'Three kinds of account', mortgageFree: 'Mortgage paid off before retirement' },
  },
  sharpen: {
    title: 'What would sharpen the answer',
    intro: 'The figures not yet read off a document, ranked by how far an error in each would move the answer. A ranking, not a margin of error.',
    swing: (years) => `up to ${years} ${years === 1 ? 'year' : 'years'}`,
    pending: 'Ranking them…',
    remaining: (n) => `${n} ${n > 1 ? 'figures are' : 'figure is'} not yet read off a document.`,
    allDone: 'Every figure is read off a document.',
    none: 'Nothing to rank for now.',
    noMover: 'None of these figures, if wrong, would move the answer.',
    absentTitle: 'What the profile still lacks',
    absent: {
      statement: 'Your pensionable earnings from your QPP statement, year by year.',
      accounts: 'Your account balances: RRSP, TFSA, non-registered.',
      spendingWork: 'Your spending during the working years.',
    },
  },
  accuracy: (confirmed, total) => `${confirmed} of ${total} figures are read off a document.`,
  scenarioNames: { prudent: 'Prudent', neutral: 'Neutral', bold: 'Bold' },
  empty: 'Enter an income and your retirement spending: the sheet fills in with the calculation.',
  toProfile: 'Go to the profile',
  nav: 'Sections of the sheet',
  toResults: 'See the answer',
  open: 'Open my sheet',
}

export const SHEET_COPY: Record<Lang, SheetWords> = { fr: FR, en: EN }
