import type { Lang } from '../i18n.ts'
import type { AchievementId, HeroClass, SlotKind, StatId } from './sheetModel.ts'

// THE WORDS OF THE CHARACTER SHEET (/fiche), serious skin — and the SHAPE of the words both skins share. The « Aventure » skin has its own words
// (lib/rpgCopy.ts) in the very same shape: the two are tested to carry the same keys, the same arguments and the same figures, so a skin can change
// every word and never a number. Outside the eager dictionaries: only the sheet page reads them. The words are given the figures already formatted
// (lib/sheetView.ts): nothing here types a number or a rate.

export interface SheetWords {
  title: string
  intro: string
  solo: string
  couple: string
  heroClass: Record<HeroClass, string>
  /** « 38 ans · retraite prévue à 58 ans » (the planned age is the profile's own). */
  heroLine: (age: string, planned: string) => string
  level: { label: string; value: (n: string) => string; none: string; hint: string }
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
  slots: { title: string; empty: string; kind: Record<SlotKind, string>; confirmed: string; estimated: string; household: string }
  quests: { title: string; intro: string; complete: string; confirm: (n: number) => string; room: (account: string, amount: string) => string; plan: string; none: string; account: { rrsp: string; tfsa: string } }
  achievements: { title: string; earned: string; locked: string; names: Record<AchievementId, string>; hints: Record<AchievementId, string> }
  accuracy: (confirmed: number, total: number) => string
  scenarioNames: { prudent: string; neutral: string; bold: string }
  /** The sentence under the title when nothing can be said yet. */
  empty: string
  toProfile: string
  toResults: string
}

export interface ModeWords {
  label: string
  hint: string
  serious: string
  adventure: string
}

/** The names of the two modes — the same in the sheet's own switch and on the settings page, whichever skin is in force. */
export const MODE_COPY: Record<Lang, ModeWords> = {
  fr: { label: 'Affichage de la fiche', hint: 'Les mêmes chiffres, présentés autrement. Seule la fiche en profite pour l’instant.', serious: 'Sérieux', adventure: 'Aventure' },
  en: { label: 'How the sheet is shown', hint: 'The same figures, shown another way. Only the sheet uses it for now.', serious: 'Serious', adventure: 'Adventure' },
}

const FR: SheetWords = {
  title: 'Ma fiche',
  intro: 'Votre situation en cinq mesures, ce que vous avez, ce qu’il reste à faire et ce qui est déjà acquis. Tout vient du même calcul que la réponse.',
  solo: 'Une personne',
  couple: 'Un couple',
  heroClass: { retired: 'À la retraite', pensioned: 'Avec une rente d’employeur', saver: 'En train d’épargner' },
  heroLine: (age, planned) => `${age} · retraite prévue à ${planned}`,
  level: { label: 'Marge', value: (n) => `${n} ans`, none: 'pas encore de marge à montrer', hint: 'Les années entre l’âge le plus tôt où l’argent dure et l’âge de retraite que vous prévoyez.' },
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
  slots: { title: 'Ce que vous avez', empty: 'Aucun compte ni aucune rente saisis pour l’instant.', kind: { rrsp: 'REER', tfsa: 'CELI', nonReg: 'Non enregistré', pension: 'Rente d’employeur', home: 'Maison, valeur nette' }, confirmed: 'lu sur un document', estimated: 'non confirmé', household: 'Le ménage' },
  quests: {
    title: 'Ce qu’il reste à faire',
    intro: 'Trois façons de rendre la fiche plus juste ou le plan plus solide. Ce sont des pistes, pas des conseils.',
    complete: 'Entrez un revenu et vos dépenses à la retraite pour que la fiche ait quelque chose à dire.',
    confirm: (n) => `Confirmer ${n} ${n > 1 ? 'chiffres' : 'chiffre'} sur un document.`,
    room: (account, amount) => `Il reste ${amount} de droits de cotisation ${account}.`,
    plan: 'Voir ce que votre plan désigne pour cette année.',
    none: 'Rien de plus à faire pour l’instant.',
    account: { rrsp: 'au REER', tfsa: 'au CELI' },
  },
  achievements: {
    title: 'Ce qui est déjà acquis',
    earned: 'Acquis',
    locked: 'Pas encore',
    names: { holds: 'Plan solide', confirmed: 'Chiffres confirmés', debtFree: 'Sans hypothèque à la retraite', diversified: 'Trois comptes', margin: 'Deux ans de marge' },
    hints: {
      holds: 'Le plan tient sous les trois scénarios.',
      confirmed: 'Chaque chiffre est lu sur un document.',
      debtFree: 'L’hypothèque est payée avant le départ à la retraite.',
      diversified: 'De l’argent au REER, au CELI et hors compte enregistré.',
      margin: 'L’âge prévu est au moins deux ans après l’âge le plus tôt.',
    },
  },
  accuracy: (confirmed, total) => `${confirmed} chiffres sur ${total} sont lus sur un document.`,
  scenarioNames: { prudent: 'Prudent', neutral: 'Neutre', bold: 'Audacieux' },
  empty: 'Entrez un revenu et vos dépenses à la retraite : la fiche se remplit avec le calcul.',
  toProfile: 'Aller au profil',
  toResults: 'Voir la réponse',
}

const EN: SheetWords = {
  title: 'My sheet',
  intro: 'Your situation in five measures, what you hold, what is left to do and what is already done. All of it comes from the same calculation as the answer.',
  solo: 'One person',
  couple: 'A couple',
  heroClass: { retired: 'Retired', pensioned: 'With an employer pension', saver: 'Saving up' },
  heroLine: (age, planned) => `${age} · planning to retire at ${planned}`,
  level: { label: 'Margin', value: (n) => `${n} years`, none: 'no margin to show yet', hint: 'The years between the earliest age at which the money lasts and the retirement age you plan.' },
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
  slots: { title: 'What you hold', empty: 'No account or pension entered yet.', kind: { rrsp: 'RRSP', tfsa: 'TFSA', nonReg: 'Non-registered', pension: 'Employer pension', home: 'Home, net equity' }, confirmed: 'read off a document', estimated: 'unconfirmed', household: 'The household' },
  quests: {
    title: 'What is left to do',
    intro: 'Three ways to make the sheet more accurate or the plan sturdier. They are leads, not advice.',
    complete: 'Enter an income and your retirement spending so the sheet has something to say.',
    confirm: (n) => `Confirm ${n} ${n > 1 ? 'figures' : 'figure'} on a document.`,
    room: (account, amount) => `${amount} of ${account} contribution room is left.`,
    plan: 'See what your plan points at for this year.',
    none: 'Nothing more to do for now.',
    account: { rrsp: 'RRSP', tfsa: 'TFSA' },
  },
  achievements: {
    title: 'What is already done',
    earned: 'Done',
    locked: 'Not yet',
    names: { holds: 'Sturdy plan', confirmed: 'Figures confirmed', debtFree: 'No mortgage in retirement', diversified: 'Three accounts', margin: 'Two years of margin' },
    hints: {
      holds: 'The plan holds under all three scenarios.',
      confirmed: 'Every figure is read off a document.',
      debtFree: 'The mortgage is paid off before retirement.',
      diversified: 'Money in the RRSP, the TFSA and outside a registered account.',
      margin: 'The planned age is at least two years after the earliest age.',
    },
  },
  accuracy: (confirmed, total) => `${confirmed} of ${total} figures are read off a document.`,
  scenarioNames: { prudent: 'Prudent', neutral: 'Neutral', bold: 'Bold' },
  empty: 'Enter an income and your retirement spending: the sheet fills in with the calculation.',
  toProfile: 'Go to the profile',
  toResults: 'See the answer',
}

export const SHEET_COPY: Record<Lang, SheetWords> = { fr: FR, en: EN }
