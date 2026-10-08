import type { InfoId, Lang } from '../i18n.ts'
import type { DocId, FactKind } from './facts.ts'

// THE WORDS OF « RENDRE MON PROFIL EXACT »: the mark beside each figure, the meter, the checklist of documents and the
// step-by-step guide. Outside the eager dictionaries on purpose (the first screen never needs them); it arrives with the guide
// and with the mark beside the first field. Where a figure is, and in which words the document prints it, is NOT repeated here:
// the ⓘ entries (`info.<id>` in the dictionary) already say it, are held to official hosts by fieldInfoCopy.test.ts, and the
// guide reads them. What is here is what the ⓘ cannot say: which DOCUMENT to open, what it settles, and how to move through.

export interface DocCopy {
  name: string
  /** What it settles, in a sentence. */
  what: string
  /** How to get it, in a sentence. */
  how: string
  /** The ⓘ entry whose official link opens this document's page (null: the document is the person's own, no page). */
  link: InfoId | null
}

export interface GuideCopy {
  fact: {
    confirmed: (label: string) => string
    estimated: (label: string) => string
    confirmedShort: string
    estimatedShort: string
  }
  kind: Record<FactKind, string>
  /** For the figures whose ⓘ does not exist (the home): where it is. */
  where: Partial<Record<FactKind, string>>
  panel: {
    title: string
    lead: string
    count: (confirmed: number, total: number) => string
    none: string
    allDone: string
    quickTitle: string
    quick: string
    exactTitle: string
    exact: string
    legendConfirmed: string
    legendEstimated: string
    nothingHere: string
    figures: (n: number) => string
    fills: string
    openPage: string
    guideMe: string
    guideAll: string
    show: string
    estimatedNote: (estimated: number) => string
    estimate: string
    quickDoes: string
    estimateDone: (years: number, rooms: number) => string
    estimateNothing: string
  }
  docs: Record<DocId, DocCopy>
  guide: {
    label: string
    step: (n: number, of: number) => string
    document: string
    whereIs: string
    wording: string
    confirm: string
    confirmed: string
    skip: string
    back: string
    next: string
    close: string
    finished: string
    finishedNote: (confirmed: number, total: number) => string
    owner: (name: string) => string
    householdOwner: string
  }
}

const FR: GuideCopy = {
  fact: {
    confirmed: (label) => `Confirmé : ${label}. Touchez pour le marquer comme estimé.`,
    estimated: (label) => `Estimé : ${label}. Touchez quand vous l’avez lu sur votre document.`,
    confirmedShort: 'Lu sur un document',
    estimatedShort: 'De mémoire ou estimé',
  },
  kind: {
    salary: 'Revenu de travail',
    earnings: 'Historique de revenus',
    residence: 'Années de résidence',
    rrspBalance: 'Solde du REER',
    rrspRoom: 'Droits de cotisation REER',
    tfsaBalance: 'Solde du CELI',
    tfsaRoom: 'Droits de cotisation CELI',
    nonRegBalance: 'Solde non enregistré',
    nonRegAcb: 'Prix de base du non enregistré',
    pension: 'Régime de retraite de l’employeur',
    spendingWorking: 'Dépenses pendant le travail',
    spendingRetired: 'Dépenses à la retraite',
    homeValue: 'Valeur de la maison',
    mortgage: 'Hypothèque',
  },
  where: {
    homeValue: 'L’évaluation municipale (compte de taxes), ou l’estimation récente d’un courtier ou d’un évaluateur.',
    mortgage: 'Le relevé annuel de votre hypothèque : le solde, le taux et le paiement mensuel.',
  },
  panel: {
    title: 'Rendre mon profil exact',
    lead: 'Chaque chiffre est soit lu sur un document (confirmé), soit une estimation. Voici les documents qui contiennent les vrais chiffres.',
    count: (c, t) => `${c} sur ${t} chiffres confirmés`,
    none: 'Aucun chiffre n’est encore confirmé : le résultat repose sur des estimations.',
    allDone: 'Tout est confirmé : votre profil repose sur vos documents.',
    quickTitle: 'Rapide',
    quick: 'Quelques chiffres, le reste estimé : en une minute vous avez une première réponse. Les chiffres estimés sont marqués.',
    exactTitle: 'Exact',
    exact: 'Vos documents en main : chaque chiffre est lu, puis confirmé. Le résultat devient le vôtre.',
    legendConfirmed: 'Confirmé',
    legendEstimated: 'Estimé',
    nothingHere: 'Rien à confirmer ici pour l’instant.',
    figures: (n) => (n === 1 ? '1 chiffre' : `${n} chiffres`),
    fills: 'Confirme :',
    openPage: 'Ouvrir la page officielle',
    guideMe: 'Me guider',
    guideAll: 'Tout confirmer pas à pas',
    show: 'Aller aux champs',
    estimatedNote: (n) => (n === 1 ? 'Un chiffre du profil est encore une estimation.' : `${n} chiffres du profil sont encore des estimations.`),
    estimate: 'Estimer ce qui manque',
    quickDoes: 'Ce qu’il estime : votre historique de revenus (à partir de votre salaire) et vos droits de CELI (à partir de votre âge et de votre solde). Il ne touche jamais un chiffre déjà saisi.',
    estimateDone: (years, rooms) => `${years === 1 ? '1 année de revenus estimée' : `${years} années de revenus estimées`}, ${rooms === 1 ? '1 droit de CELI estimé' : `${rooms} droits de CELI estimés`}. Rien n’est confirmé : à vérifier sur vos documents.`,
    estimateNothing: 'Rien à estimer : tout est déjà rempli.',
  },
  docs: {
    rrq: {
      name: 'Relevé de participation au RRQ',
      what: 'Vos revenus de travail admissibles, année par année : ils fixent votre rente du RRQ.',
      how: 'Sur Retraite Québec, Mon dossier, « Relevé de participation ».',
      link: 'earnings',
    },
    tax: {
      name: 'Avis de cotisation et compte de l’ARC',
      what: 'Votre revenu, et vos droits de cotisation inutilisés au REER et au CELI.',
      how: 'Votre dernier avis de cotisation, et Mon dossier de l’ARC (REER, CELI).',
      link: 'rrspRoom',
    },
    bank: {
      name: 'Relevés de vos comptes',
      what: 'Ce que contiennent vos REER, CELI et comptes non enregistrés, et le prix de base de ces derniers.',
      how: 'Le relevé de votre institution financière : un seul total par type de compte.',
      link: null,
    },
    employer: {
      name: 'Relevé de votre régime de retraite',
      what: 'Les années de service et la formule de la rente de votre employeur.',
      how: 'Le relevé annuel du régime, ou la brochure du régime (RREGOP : Retraite Québec).',
      link: 'dbService',
    },
    home: {
      name: 'Hypothèque et évaluation de la maison',
      what: 'Ce que vaut la maison, ce que vous devez encore, à quel taux et pour quel paiement.',
      how: 'Le compte de taxes (évaluation municipale) et le relevé annuel de l’hypothèque.',
      link: null,
    },
    budget: {
      name: 'Vos dépenses des 12 derniers mois',
      what: 'Ce que le ménage dépense vraiment, en travaillant et à la retraite.',
      how: 'Vos relevés de carte et de banque, sans l’impôt ni l’épargne.',
      link: null,
    },
    residence: {
      name: 'Preuve de vos années au Canada',
      what: 'Depuis quand vous résidez au Canada : 40 ans donnent la pleine PSV.',
      how: 'Vos documents d’immigration ou de citoyenneté, ou simplement votre histoire si vous êtes né ici.',
      link: 'oasResidence',
    },
  },
  guide: {
    label: 'Guide pour confirmer vos chiffres',
    step: (n, of) => `Chiffre ${n} sur ${of}`,
    document: 'Document',
    whereIs: 'Où le trouver',
    wording: 'Le document écrit',
    confirm: 'C’est confirmé',
    confirmed: 'Confirmé',
    skip: 'Plus tard',
    back: 'Précédent',
    next: 'Suivant',
    close: 'Fermer le guide',
    finished: 'Guide terminé',
    finishedNote: (c, t) => `${c} sur ${t} chiffres confirmés.`,
    owner: (name) => `Pour ${name}`,
    householdOwner: 'Pour le ménage',
  },
}

const EN: GuideCopy = {
  fact: {
    confirmed: (label) => `Confirmed: ${label}. Tap to mark it as an estimate.`,
    estimated: (label) => `Estimated: ${label}. Tap once you have read it on your document.`,
    confirmedShort: 'Read on a document',
    estimatedShort: 'From memory or estimated',
  },
  kind: {
    salary: 'Work income',
    earnings: 'Earnings history',
    residence: 'Years of residence',
    rrspBalance: 'RRSP balance',
    rrspRoom: 'RRSP contribution room',
    tfsaBalance: 'TFSA balance',
    tfsaRoom: 'TFSA contribution room',
    nonRegBalance: 'Non-registered balance',
    nonRegAcb: 'Non-registered cost base',
    pension: 'Employer pension plan',
    spendingWorking: 'Spending while working',
    spendingRetired: 'Spending in retirement',
    homeValue: 'Value of the home',
    mortgage: 'Mortgage',
  },
  where: {
    homeValue: 'The municipal assessment (tax bill), or a recent estimate from an agent or an appraiser.',
    mortgage: 'Your mortgage’s annual statement: the balance, the rate and the monthly payment.',
  },
  panel: {
    title: 'Make my profile exact',
    lead: 'Each figure is either read off a document (confirmed) or an estimate. These are the documents that hold the real numbers.',
    count: (c, t) => `${c} of ${t} figures confirmed`,
    none: 'No figure is confirmed yet: the result rests on estimates.',
    allDone: 'Everything is confirmed: your profile rests on your documents.',
    quickTitle: 'Quick',
    quick: 'A few figures, the rest estimated: a first answer in a minute. The estimated figures are marked.',
    exactTitle: 'Exact',
    exact: 'Your documents at hand: each figure is read, then confirmed. The result becomes yours.',
    legendConfirmed: 'Confirmed',
    legendEstimated: 'Estimated',
    nothingHere: 'Nothing to confirm here for now.',
    figures: (n) => (n === 1 ? '1 figure' : `${n} figures`),
    fills: 'Confirms:',
    openPage: 'Open the official page',
    guideMe: 'Guide me',
    guideAll: 'Confirm everything, step by step',
    show: 'Go to the fields',
    estimatedNote: (n) => (n === 1 ? 'One figure in the profile is still an estimate.' : `${n} figures in the profile are still estimates.`),
    estimate: 'Estimate what is missing',
    quickDoes: 'What it estimates: your earnings history (from your salary) and your TFSA room (from your age and balance). It never touches a figure you already typed.',
    estimateDone: (years, rooms) => `${years === 1 ? '1 year of earnings estimated' : `${years} years of earnings estimated`}, ${rooms === 1 ? '1 TFSA room estimated' : `${rooms} TFSA rooms estimated`}. Nothing is confirmed: check it against your documents.`,
    estimateNothing: 'Nothing to estimate: everything is already filled in.',
  },
  docs: {
    rrq: {
      name: 'QPP statement of participation',
      what: 'Your pensionable earnings, year by year: they set your QPP pension.',
      how: 'On Retraite Québec, My file, « Statement of participation ».',
      link: 'earnings',
    },
    tax: {
      name: 'Notice of assessment and CRA account',
      what: 'Your income, and your unused RRSP and TFSA contribution room.',
      how: 'Your latest notice of assessment, and your CRA My Account (RRSP, TFSA).',
      link: 'rrspRoom',
    },
    bank: {
      name: 'Your account statements',
      what: 'What your RRSPs, TFSAs and non-registered accounts hold, and the cost base of the latter.',
      how: 'Your financial institution’s statement: one total per kind of account.',
      link: null,
    },
    employer: {
      name: 'Your pension plan statement',
      what: 'The years of service and the pension formula of your employer’s plan.',
      how: 'The plan’s annual statement, or its booklet (RREGOP: Retraite Québec).',
      link: 'dbService',
    },
    home: {
      name: 'Mortgage and home valuation',
      what: 'What the home is worth, what you still owe, at what rate and for what payment.',
      how: 'The tax bill (municipal assessment) and the mortgage’s annual statement.',
      link: null,
    },
    budget: {
      name: 'Your spending over the last 12 months',
      what: 'What the household really spends, while working and in retirement.',
      how: 'Your card and bank statements, leaving out tax and savings.',
      link: null,
    },
    residence: {
      name: 'Proof of your years in Canada',
      what: 'Since when you have lived in Canada: 40 years earn the full OAS.',
      how: 'Your immigration or citizenship documents, or simply your own history if you were born here.',
      link: 'oasResidence',
    },
  },
  guide: {
    label: 'Guide to confirm your figures',
    step: (n, of) => `Figure ${n} of ${of}`,
    document: 'Document',
    whereIs: 'Where to find it',
    wording: 'The document says',
    confirm: 'It is confirmed',
    confirmed: 'Confirmed',
    skip: 'Later',
    back: 'Previous',
    next: 'Next',
    close: 'Close the guide',
    finished: 'Guide finished',
    finishedNote: (c, t) => `${c} of ${t} figures confirmed.`,
    owner: (name) => `For ${name}`,
    householdOwner: 'For the household',
  },
}

export const GUIDE_COPY: Record<Lang, GuideCopy> = { fr: FR, en: EN }
