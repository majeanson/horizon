import type { Lang } from '../i18n.ts'

// THE WORDS OF « PRÉPARER L’AVENIR » — the care what-if and the two things the plan points at for this year. Outside the eager
// dictionaries: they arrive with the results page.

export interface FutureCopy {
  title: string
  care: {
    title: string
    hint: string
    amount: string
    fromAge: string
    years: string
    age: (n: number) => string
    yearsOf: (n: number) => string
    updating: string
    /** The earliest age with the care: never (up to `max`), the same as without, later, or « right now ». */
    none: (max: number) => string
    same: (age: number) => string
    sameNow: string
    later: (years: string, age: number, base: number | null) => string
    /** What is left at the horizon, with the care and without it (today's dollars). */
    leaves: (withCare: string, without: string) => string
    /** At the answer's own age the plan falls short in this year (already « 2051 (85 ans) »). */
    short: (age: number, yearAge: string) => string
    holds: (age: number) => string
    keep: string
    kept: string
    full: (max: number) => string
    /** « Le coût commencerait en 2051 (85 ans). » — the year arrives already built. */
    starts: (yearAge: string) => string
    /** A care already sits among the dated events: this trial adds to it. */
    already: string
    /** The reference chips under the amount: a public CHSLD's ceiling. */
    refTitle: string
    refs: { privateRoom: string; semiPrivate: string; ward: string }
    /** The name of the room and what it costs a year, already formatted. */
    refChip: (name: string, perYear: string) => string
    /** The ceiling is the government's, for the year it was read: what it says and what it leaves out (the figures arrive already formatted). */
    refNote: (year: number, monthlyPrivate: string) => string
    refSource: string
    caveat: string
  }
  year: {
    title: string
    hint: string
    leverTitle: string
    leverNone: string
    leverPending: string
    confirmTitle: string
    confirmNone: string
    confirmPending: string
    moreTitle: string
    pensions: string
  }
}

const FR: FutureCopy = {
  title: 'Préparer l’avenir',
  care: {
    title: 'Et si les dernières années coûtaient plus cher ?',
    hint: 'Une résidence avec soins, de l’aide à la maison : un coût de plus chaque année, à partir d’un âge. Glissez : le plan est refait avec ce coût. L’âge est celui de la personne la plus âgée. Le montant est le vôtre : il dépend du lieu et des soins. Rien n’est enregistré tant que vous ne l’ajoutez pas.',
    amount: 'Coût par année',
    fromAge: 'À partir de l’âge de',
    years: 'Pendant',
    age: (n) => `${n} ans`,
    yearsOf: (n) => `${n} ${n > 1 ? 'ans' : 'an'}`,
    updating: 'Mise à jour en cours…',
    none: (max) => `Avec ce coût, l’argent ne dure à aucun âge jusqu’à ${max} ans.`,
    same: (age) => `Votre âge de retraite ne change pas : ${age} ans.`,
    sameNow: 'Votre réponse ne change pas : dès maintenant.',
    later: (years, age, base) => `${years} plus tard : ${age} ans${base === null ? '' : ` au lieu de ${base} ans`}.`,
    leaves: (withCare, without) => `À l’horizon du plan, il resterait ${withCare} au lieu de ${without} (dollars d’aujourd’hui, REER avant impôt).`,
    short: (age, yearAge) => `Si vous arrêtez à ${age} ans, l’argent manquerait dès ${yearAge}.`,
    holds: (age) => `Si vous arrêtez à ${age} ans, l’argent dure jusqu’au bout.`,
    keep: 'L’ajouter à mes événements',
    kept: 'Ajouté à vos événements datés, sur Profil.',
    full: (max) => `Les ${max} événements sont utilisés : retirez-en un sur Profil pour en ajouter.`,
    starts: (yearAge) => `Le coût commencerait en ${yearAge}.`,
    already: 'Un coût de soins est déjà dans vos événements : cet essai s’y ajoute.',
    refTitle: 'Repère : un CHSLD public',
    refs: { privateRoom: 'Chambre privée', semiPrivate: 'Chambre semi-privée', ward: 'Salle' },
    refChip: (name, perYear) => `${name} : ${perYear} par année`,
    refNote: (year, monthlyPrivate) => `C’est le plafond fixé par le gouvernement pour ${year} (${monthlyPrivate} par mois en chambre privée) : la RAMQ établit ce que la personne paie d’après son revenu, souvent moins. Il ne couvre ni une résidence privée ni l’aide à domicile.`,
    refSource: 'Source :',
    caveat: 'Un essai, pas une prévision : les soins en CHSLD public se paient selon le revenu, le privé coûte plus et varie beaucoup d’un endroit à l’autre. Le coût suit les prix (dollars d’aujourd’hui).',
  },
  year: {
    title: 'À faire cette année',
    hint: 'Deux choses que votre plan désigne, pas des conseils : le changement qui avance le plus l’âge, et le chiffre à confirmer d’abord.',
    leverTitle: 'Le changement qui avance le plus',
    leverNone: 'Aucun des changements essayés n’avance l’âge de votre réponse.',
    leverPending: 'Calcul en cours…',
    confirmTitle: 'Le chiffre à confirmer d’abord',
    confirmNone: 'Aucun chiffre non confirmé ne déplace la réponse.',
    confirmPending: 'Calcul en cours…',
    moreTitle: 'Deux décisions à regarder',
    pensions: 'Quand commencer la RRQ et la PSV ?',
  },
}

const EN: FutureCopy = {
  title: 'Prepare for the future',
  care: {
    title: 'What if the last years cost more?',
    hint: 'A residence with care, help at home: one more cost every year, from an age. Drag: the plan is rerun with that cost. The age is the oldest person’s. The amount is yours: it depends on the place and the care. Nothing is saved until you add it.',
    amount: 'Cost per year',
    fromAge: 'From age',
    years: 'For',
    age: (n) => `${n}`,
    yearsOf: (n) => `${n} year${n > 1 ? 's' : ''}`,
    updating: 'Updating…',
    none: (max) => `With this cost, the money lasts at no age up to ${max}.`,
    same: (age) => `Your retirement age does not change: ${age}.`,
    sameNow: 'Your answer does not change: right now.',
    later: (years, age, base) => `${years} later: ${age}${base === null ? '' : ` instead of ${base}`}.`,
    leaves: (withCare, without) => `At the plan’s horizon there would be ${withCare} left instead of ${without} (today’s dollars, RRSP before tax).`,
    short: (age, yearAge) => `If you stop at ${age}, the money would run short from ${yearAge}.`,
    holds: (age) => `If you stop at ${age}, the money lasts to the end.`,
    keep: 'Add it to my events',
    kept: 'Added to your dated events, on Profile.',
    full: (max) => `All ${max} events are used: remove one on Profile to add this.`,
    starts: (yearAge) => `The cost would start in ${yearAge}.`,
    already: 'A care cost is already among your events: this trial adds to it.',
    refTitle: 'Reference: a public CHSLD',
    refs: { privateRoom: 'Private room', semiPrivate: 'Semi-private room', ward: 'Ward' },
    refChip: (name, perYear) => `${name}: ${perYear} a year`,
    refNote: (year, monthlyPrivate) => `This is the ceiling the government sets for ${year} (${monthlyPrivate} a month for a private room): the RAMQ sets what a person pays from their income, often less. It covers neither a private residence nor help at home.`,
    refSource: 'Source:',
    caveat: 'A trial, not a forecast: care in a public CHSLD is paid by income, a private one costs more and varies a lot from place to place. The cost follows prices (today’s dollars).',
  },
  year: {
    title: 'To do this year',
    hint: 'Two things your plan points at, not advice: the change that brings the age forward most, and the figure to confirm first.',
    leverTitle: 'The change that brings the age forward most',
    leverNone: 'None of the changes tried brings your answer’s age forward.',
    leverPending: 'Working it out…',
    confirmTitle: 'The figure to confirm first',
    confirmNone: 'No unconfirmed figure moves the answer.',
    confirmPending: 'Working it out…',
    moreTitle: 'Two decisions to look at',
    pensions: 'When should I start the QPP and the OAS?',
  },
}

export const FUTURE_COPY: Record<Lang, FutureCopy> = { fr: FR, en: EN }
