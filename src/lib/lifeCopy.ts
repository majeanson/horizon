import type { Lang } from '../i18n.ts'
import type { StarterId, Tenure } from './plannedExpenses.ts'

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
    /** The children at this cost take most of a stated budget: what is left for the adults, and a way to say it is less. */
    heavy: (count: number, total: string, share: string, budget: string, left: string) => string
    heavyFix: (perChild: string) => string
    /** Where the children are: inside the annual budget already, or added on top of it by the cost below. */
    where: string
    inside: string
    insideHint: string
    onTop: string
    onTopHint: string
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
    /** The name an event is added under, one per starting point (lib/plannedExpenses.ts). */
    starters: Record<StarterId, string>
    /** « Dépenses à prévoir »: the starting points that rest on a statistic or a rule, offered apart from the plain ones. */
    planned: {
      title: string
      hint: string
      doubleCount: string
      /** The group of households a Statistics Canada average is for. */
      tenure: Record<Tenure, string>
      upkeep: (tenure: string, figure: string) => string
      vehicle: (tenure: string, figure: string) => string
      /** The rule of thumb, built on the upkeep statistic: its share, the home's value, and the upkeep already counted. */
      renovation: (share: string, homeValue: string, upkeep: string) => string
      /** No statistic exists: a round number to be replaced. */
      placeholder: string
    }
    /** What an event that is still an estimate says about itself, and the way to keep it. */
    estimate: {
      /** The word beside the figure, and its accessible name. */
      mark: string
      label: string
      /** « D'où vient ce montant ? » — the title of the note that says what the figure rests on. */
      basisTitle: string
      sourceTitle: string
      confirm: string
    }
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
    costHint: 'Ce que coûte un enfant à la maison (nourriture, activités, vêtements). Laissez 0 si vous ne voulez pas en tenir compte.',
    leaves: 'Quitte la maison à (âge)',
    leavesHint: 'Souvent 22 à 25 ans.',
    effect: (perChild, count, firstYear) => `${count === 1 ? 'Votre enfant' : `Vos ${count} enfants`} ${count === 1 ? 'quitte' : 'quittent'} la maison à partir de ${firstYear} : ${perChild} de moins par année et par enfant dans vos dépenses de travail.`,
    none: 'Aucun enfant ne quitte plus la maison dans le plan.',
    heavy: (count, total, share, budget, left) => `${count === 1 ? 'Cet enfant' : `Ces ${count} enfants`} représente${count === 1 ? '' : 'nt'} ${total} par année, soit ${share} de votre budget de ${budget} : il en reste ${left} pour le reste de la maison. Si ce budget vient de vos dépenses réelles, c’est sans doute plus que ce que vous payez vraiment pour eux.`,
    heavyFix: (perChild) => `Mettre ${perChild} par enfant`,
    where: 'Où sont les enfants dans vos dépenses ?',
    inside: 'Déjà dans mon budget annuel',
    insideHint: 'Votre budget de dépenses compte déjà ce que coûtent les enfants : quand l’un d’eux quitte la maison, sa part en sort.',
    onTop: 'En plus, ajoutés ici',
    onTopHint: 'Votre budget de dépenses est celui des adultes : le coût de chaque enfant à la maison s’y ajoute, jusqu’à son départ.',
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
    starters: {
      upkeep: 'Entretien et réparations de la maison',
      renovation: 'Réserve de rénovations',
      vehicle: 'Remplacement des voitures',
      heritage: 'Un héritage',
      roof: 'Une grosse dépense',
      car: 'Une voiture',
      rent: 'Un loyer reçu',
      care: 'Des soins plus tard',
      project: 'Un projet',
    },
    planned: {
      title: 'Dépenses à prévoir',
      hint: 'Ce qu’un budget mensuel ne voit pas venir. Chaque montant dit sur quoi il repose : une statistique de Statistique Canada ou une règle courante, nommée comme telle. C’est un estimé tant que vous ne l’avez pas confirmé ou remplacé par votre propre chiffre.',
      doubleCount: 'Si votre budget annuel compte déjà ces dépenses, n’ajoutez pas celles-ci : elles seraient comptées deux fois.',
      tenure: { ownerWithMortgage: 'propriétaires avec hypothèque', ownerWithoutMortgage: 'propriétaires sans hypothèque', renter: 'locataires' },
      upkeep: (tenure, figure) =>
        `Moyenne annuelle des ${tenure} au Canada (2023) : ${figure} par année en entretien et en réparations. Les rénovations n’y sont pas comptées : Statistique Canada les traite comme un achat de bien, non comme une dépense courante.`,
      vehicle: (tenure, figure) =>
        `Moyenne annuelle des ${tenure} au Canada (2023) : ${figure} par année pour l’achat d’autos, de camionnettes et de VUS. C’est une moyenne de tous les ménages, y compris ceux qui n’ont rien acheté cette année-là : ce qui en fait une provision par année. Elle est comptée jusqu’à vos 80 ans ; changez l’année de fin au besoin.`,
      renovation: (share, homeValue, upkeep) =>
        `Règle courante, pas un chiffre officiel : ${share} de la valeur de la maison (${homeValue}) par année pour l’entretien et les rénovations ensemble, moins les ${upkeep} déjà comptés à l’entretien ci-dessus.`,
      placeholder: 'Un point de départ, pas une statistique : aucune source officielle ne fonde ce montant. Remplacez-le par le vôtre.',
    },
    estimate: {
      mark: 'estimé',
      label: 'Estimé — à confirmer',
      basisTitle: 'D’où vient ce montant ?',
      sourceTitle: 'Source',
      confirm: 'Confirmer ce montant',
    },
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
    costHint: 'What a child at home costs (food, activities, clothes). Leave 0 if you do not want to count it.',
    leaves: 'Leaves home at (age)',
    leavesHint: 'Often 22 to 25.',
    effect: (perChild, count, firstYear) => `${count === 1 ? 'Your child leaves' : `Your ${count} children leave`} home from ${firstYear}: ${perChild} less a year per child in your working-years spending.`,
    none: 'No child leaves home any more within the plan.',
    heavy: (count, total, share, budget, left) => `${count === 1 ? 'This child' : `These ${count} children`} account${count === 1 ? 's' : ''} for ${total} a year, ${share} of your ${budget} budget — ${left} is left for the rest of the household. If that budget comes from what you actually spend, this is probably more than you really pay for them.`,
    heavyFix: (perChild) => `Use ${perChild} per child`,
    where: 'Where are the children in your spending?',
    inside: 'Already in my annual budget',
    insideHint: 'Your spending budget already counts what the children cost: when one leaves home, their share comes out.',
    onTop: 'On top, added here',
    onTopHint: 'Your spending budget is the adults’: each child at home costs this much more, until they leave.',
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
    starters: {
      upkeep: 'House upkeep and repairs',
      renovation: 'Renovation reserve',
      vehicle: 'Replacing vehicles',
      heritage: 'An inheritance',
      roof: 'A big expense',
      car: 'A car',
      rent: 'Rent received',
      care: 'Care later on',
      project: 'A project',
    },
    planned: {
      title: 'Expenses to plan for',
      hint: 'What a monthly budget does not see coming. Each amount says what it rests on: a Statistics Canada figure or a common rule, named as such. It is an estimate until you confirm it or replace it with your own figure.',
      doubleCount: 'If your annual budget already counts these expenses, do not add these: they would be counted twice.',
      tenure: { ownerWithMortgage: 'homeowners with a mortgage', ownerWithoutMortgage: 'homeowners without a mortgage', renter: 'renters' },
      upkeep: (tenure, figure) =>
        `Yearly average of ${tenure} in Canada (2023): ${figure} a year on upkeep and repairs. Renovations are not counted in it: Statistics Canada treats them as buying an asset, not as a running expense.`,
      vehicle: (tenure, figure) =>
        `Yearly average of ${tenure} in Canada (2023): ${figure} a year buying cars, vans and SUVs. It is an average of all households, those that bought nothing that year included: that is what makes it a yearly allowance. It is counted until you are 80; change the end year if you like.`,
      renovation: (share, homeValue, upkeep) =>
        `A common rule, not an official figure: ${share} of the home’s value (${homeValue}) a year for upkeep and renovations together, less the ${upkeep} already counted under upkeep above.`,
      placeholder: 'A starting point, not a statistic: no official source backs this amount. Replace it with your own.',
    },
    estimate: {
      mark: 'estimate',
      label: 'Estimate — to confirm',
      basisTitle: 'Where does this amount come from?',
      sourceTitle: 'Source',
      confirm: 'Confirm this amount',
    },
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
