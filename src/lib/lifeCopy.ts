import type { Lang } from '../i18n.ts'

// THE WORDS OF A LIFE BEYOND THE BUDGET — what a child costs until they leave, the work kept after the retirement age, the dated flows
// (an inheritance, a roof, a rent, a care reserve) and the slowing of spending with age. Outside the eager dictionaries: only the profile
// and assumptions pages read them.

export type FlowKindName = 'windfall' | 'expense' | 'income'

export interface LifeCopy {
  children: {
    cost: string
    costHint: string
    leaves: string
    leavesHint: string
    effect: (perChild: string, count: number, firstYear: string) => string
    none: string
  }
  partTime: {
    title: string
    hint: string
    on: string
    off: string
    share: string
    shareHint: string
    until: string
    untilHint: string
    summary: (share: string, retireAge: number, untilAge: number) => string
    nothing: (retireAge: number, untilAge: number) => string
  }
  flows: {
    title: string
    hint: string
    empty: string
    add: string
    full: (max: number) => string
    starters: { heritage: string; roof: string; car: string; rent: string; care: string }
    kind: Record<FlowKindName, string>
    kindHint: Record<FlowKindName, string>
    name: string
    amountOnce: string
    amountYearly: string
    amountHint: string
    from: string
    to: string
    once: string
    until: string
    owner: string
    taxable: string
    taxableHint: string
    remove: (name: string) => string
    removeConfirm: (name: string) => string
    unnamed: string
    /** « 2043 (63 / 60 ans) » arrives already built; the line says what the flow does in that year. */
    line: (kind: FlowKindName, amount: string, from: string, to: string | null) => string
  }
  /** The one line on Profil that says when a copy of the profile last left this device. */
  backup: {
    never: string
    last: (date: string) => string
    now: string
  }
  drift: {
    title: string
    hint: string
    level: string
    slows: (pct: string) => string
    custom: string
  }
}

const FR: LifeCopy = {
  children: {
    cost: 'Ce que coûte chaque enfant, par année',
    costHint: 'La part de votre budget qui sert un enfant (nourriture, activités, vêtements). Quand il quitte la maison, cette somme sort de vos dépenses. Laissez 0 si vous ne voulez pas en tenir compte.',
    leaves: 'Quitte la maison à (âge)',
    leavesHint: 'Souvent 22 à 25 ans.',
    effect: (perChild, count, firstYear) => `${count === 1 ? 'Votre enfant' : `Vos ${count} enfants`} ${count === 1 ? 'quitte' : 'quittent'} la maison à partir de ${firstYear} : ${perChild} de moins par année et par enfant dans vos dépenses de travail.`,
    none: 'Aucun enfant ne quitte plus la maison dans le plan.',
  },
  partTime: {
    title: 'Travail après la retraite',
    hint: 'Continuer de travailler à temps partiel après l’âge de retraite ci-dessus : une part de votre revenu de travail jusqu’à un âge choisi. Ce revenu est imposé et cotise comme tout revenu de travail ; l’épargne que vous faites « tant que vous travaillez » ne continue pas.',
    on: 'Je continue de travailler',
    off: 'Je m’arrête complètement',
    share: 'Part de mon revenu de travail',
    shareHint: '40 % veut dire deux jours par semaine, à peu près.',
    until: 'Jusqu’à (âge)',
    untilHint: 'L’âge où le travail s’arrête pour de bon.',
    summary: (share, retireAge, untilAge) => `De ${retireAge} à ${untilAge} ans : ${share} de votre revenu de travail.`,
    nothing: (retireAge, untilAge) => `Rien à calculer : ${untilAge} ans n’est pas après l’âge de retraite (${retireAge} ans).`,
  },
  flows: {
    title: 'Événements et revenus datés',
    hint: 'Ce qui n’est pas dans votre budget courant : un héritage, une rénovation, une voiture, un loyer reçu, des soins plus tard. Chacun a ses années.',
    empty: 'Aucun événement noté. Ajoutez-en un seulement s’il change vraiment votre plan.',
    add: 'Ajouter',
    full: (max) => `${max} événements, c’est le maximum : retirez-en un pour en ajouter un autre.`,
    starters: { heritage: 'Un héritage', roof: 'Une grosse dépense', car: 'Une voiture', rent: 'Un loyer reçu', care: 'Des soins plus tard' },
    kind: { windfall: 'Argent reçu une fois', expense: 'Dépense', income: 'Revenu' },
    kindHint: {
      windfall: 'Un héritage, un cadeau, la vente d’un bien : arrive d’un coup, sans impôt, dans vos placements non enregistrés.',
      expense: 'S’ajoute à votre budget, une année ou plusieurs.',
      income: 'Reçu chaque année : un loyer, un petit commerce.',
    },
    name: 'Nom',
    amountOnce: 'Montant',
    amountYearly: 'Montant par année',
    amountHint: 'En dollars d’aujourd’hui : il suit l’inflation.',
    from: 'À partir de (année)',
    to: 'Jusqu’en (année)',
    once: 'Une seule fois',
    until: 'Plusieurs années',
    owner: 'Reçu par',
    taxable: 'Imposable',
    taxableHint: 'Un loyer l’est. Un montant déjà imposé ou non imposable, non.',
    remove: (name) => `Retirer « ${name} »`,
    removeConfirm: (name) => `Retirer « ${name} » : il sort du calcul, et l’âge de retraite peut changer.`,
    unnamed: 'Sans nom',
    line: (kind, amount, from, to) =>
      kind === 'windfall'
        ? `${amount} reçus en ${from}`
        : kind === 'expense'
          ? to === null
            ? `${amount} dépensés en ${from}`
            : `${amount} par année de ${from} à ${to}`
          : to === null
            ? `${amount} reçus en ${from}`
            : `${amount} par année de ${from} à ${to}`,
  },
  backup: {
    never: 'Dernière copie de sauvegarde : jamais. Vos chiffres ne vivent que sur cet appareil.',
    last: (date) => `Dernière copie de sauvegarde : ${date}.`,
    now: 'Sauvegarder maintenant',
  },
  drift: {
    title: 'Les dépenses à la retraite avec l’âge',
    hint: 'Beaucoup de gens dépensent un peu moins chaque année en vieillissant (moins de voyages, d’activités). Si vous le pensez aussi, choisissez un rythme : il s’applique à vos dépenses de retraite à partir de 70 ans, en dollars d’aujourd’hui. C’est un choix, pas un chiffre officiel.',
    level: 'Au même niveau',
    slows: (pct) => `${pct} de moins par année`,
    custom: 'Un autre rythme',
  },
}

const EN: LifeCopy = {
  children: {
    cost: 'What each child costs, a year',
    costHint: 'The part of your budget that serves a child (food, activities, clothes). When they leave home, that amount comes out of your spending. Leave 0 to ignore it.',
    leaves: 'Leaves home at (age)',
    leavesHint: 'Often 22 to 25.',
    effect: (perChild, count, firstYear) => `${count === 1 ? 'Your child leaves' : `Your ${count} children leave`} home from ${firstYear}: ${perChild} less a year per child in your working-years spending.`,
    none: 'No child leaves home any more within the plan.',
  },
  partTime: {
    title: 'Work after retirement',
    hint: 'Keep working part-time after the retirement age above: a share of your work income until an age you choose. It is taxed and pays contributions like any work income; the saving you make “while you work” does not continue.',
    on: 'I keep working',
    off: 'I stop completely',
    share: 'Share of my work income',
    shareHint: '40% means about two days a week.',
    until: 'Until (age)',
    untilHint: 'The age at which work stops for good.',
    summary: (share, retireAge, untilAge) => `From ${retireAge} to ${untilAge}: ${share} of your work income.`,
    nothing: (retireAge, untilAge) => `Nothing to work out: ${untilAge} is not after the retirement age (${retireAge}).`,
  },
  flows: {
    title: 'Dated events and income',
    hint: 'What is not in your regular budget: an inheritance, a renovation, a car, rent you receive, care later on. Each has its own years.',
    empty: 'No event noted. Add one only if it really changes your plan.',
    add: 'Add',
    full: (max) => `${max} events is the most: remove one to add another.`,
    starters: { heritage: 'An inheritance', roof: 'A big expense', car: 'A car', rent: 'Rent received', care: 'Care later on' },
    kind: { windfall: 'Money received once', expense: 'Expense', income: 'Income' },
    kindHint: {
      windfall: 'An inheritance, a gift, the sale of an asset: arrives at once, untaxed, in your non-registered savings.',
      expense: 'Added to your budget, for one year or several.',
      income: 'Received every year: rent, a small business.',
    },
    name: 'Name',
    amountOnce: 'Amount',
    amountYearly: 'Amount a year',
    amountHint: 'In today’s dollars: it follows inflation.',
    from: 'From (year)',
    to: 'Until (year)',
    once: 'Just once',
    until: 'Several years',
    owner: 'Received by',
    taxable: 'Taxable',
    taxableHint: 'Rent is. An amount already taxed or not taxable, no.',
    remove: (name) => `Remove “${name}”`,
    removeConfirm: (name) => `Remove “${name}”: it leaves the calculation, and the retirement age may change.`,
    unnamed: 'Unnamed',
    line: (kind, amount, from, to) =>
      kind === 'windfall'
        ? `${amount} received in ${from}`
        : kind === 'expense'
          ? to === null
            ? `${amount} spent in ${from}`
            : `${amount} a year from ${from} to ${to}`
          : to === null
            ? `${amount} received in ${from}`
            : `${amount} a year from ${from} to ${to}`,
  },
  backup: {
    never: 'Last saved copy: never. Your figures live only on this device.',
    last: (date) => `Last saved copy: ${date}.`,
    now: 'Save a copy now',
  },
  drift: {
    title: 'Retirement spending with age',
    hint: 'Many people spend a little less each year as they age (fewer trips, fewer activities). If you expect that too, pick a pace: it applies to your retirement spending from age 70, in today’s dollars. It is a choice, not an official figure.',
    level: 'Level',
    slows: (pct) => `${pct} less a year`,
    custom: 'Another pace',
  },
}

export const LIFE_COPY: Record<Lang, LifeCopy> = { fr: FR, en: EN }
