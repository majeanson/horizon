// The words of « Quand commencer ma rente ? » (components/results/DeferralPanel.tsx), in both languages.
//
// It lives HERE and not in the i18n dictionaries on purpose: only the results page reads it, and ~3 KB of French in the
// eager dictionary would be paid by every page of the app (check-bundle.mjs holds that dictionary to a budget). The
// shape is the interface below, so the two languages cannot drift apart; lib/deferralCopy.test.ts holds them to
// non-empty and genuinely translated.

export interface DeferralCopy {
  title: string
  hint: string
  busy: string
  person: string
  rrqTitle: string
  oasTitle: string
  colStart: string
  colMonthly: string
  colVersus: string
  colBreakEven: string
  colPlan: string
  colEarliest: string
  colWorth85: string
  colWorth95: string
  age: (age: number) => string
  yours: string
  versusSame: string
  versusMore: (pct: string) => string
  versusLess: (pct: string) => string
  breakEvenLater: (age: number) => string
  breakEvenEarlier: (age: number) => string
  breakEvenNone: string
  breakEvenSelf: string
  works: string
  fails: (year: number) => string
  earliest: (age: number | null) => string
  noWorth: string
  whyTitle: string
  whyLead: (rrqMax: string, oasMax: string) => string
  why: string[]
  againstTitle: string
  against: string[]
  caveat: string
}

export const DEFERRAL_COPY: { fr: DeferralCopy; en: DeferralCopy } = {
  fr: {
      title: 'Quand commencer ma rente ?',
      hint: 'La rente du RRQ et la pension de la Sécurité de la vieillesse (PSV) durent toute la vie et suivent les prix : commencer plus tard donne un montant plus élevé, mais pendant moins d’années. Voici ce que donne chaque âge de début pour votre ménage, tout le reste du plan inchangé.',
      busy: 'Calcul en cours…',
      person: 'Pour',
      rrqTitle: 'Rente du Régime de rentes du Québec (RRQ)',
      oasTitle: 'Pension de la Sécurité de la vieillesse (PSV)',
      colStart: 'Début',
      colMonthly: 'Par mois',
      colVersus: 'Contre 65 ans',
      colBreakEven: 'Point d’équilibre',
      colPlan: 'Votre plan',
      colEarliest: 'Retraite au plus tôt',
      colWorth85: 'Valeur nette à 85 ans',
      colWorth95: 'Valeur nette à 95 ans',
      age: (age: number) => `${age} ans`,
      yours: 'votre plan actuel',
      versusSame: 'référence',
      versusMore: (pct: string) => `+${pct}`,
      versusLess: (pct: string) => `−${pct}`,
      breakEvenLater: (age: number) => `à ${age} ans`,
      breakEvenEarlier: (age: number) => `le départ à 65 ans rattrape à ${age} ans`,
      breakEvenNone: 'après l’horizon du plan',
      breakEvenSelf: '—',
      works: 'Tient',
      fails: (year: number) => `Manque dès ${year}`,
      earliest: (age: number | null) => (age === null ? 'aucun âge' : `${age} ans`),
      noWorth: '—',
      whyTitle: 'Pourquoi reporter peut avoir du sens',
      whyLead: (rrqMax: string, oasMax: string) =>
        `Un revenu à vie plus élevé, indexé aux prix : jusqu’à ${rrqMax} pour la rente du RRQ (à 72 ans) et ${oasMax} pour la PSV (à 70 ans). C’est une assurance contre la longévité : si vous vivez longtemps, c’est elle qui vous empêche de manquer d’argent.`,
      why: [
        'Moins de retraits tard dans la vie, au moment où une mauvaise année de marché fait le plus mal.',
        'Les années de « pont » sont payées par vos REER, CELI et placements : le tableau montre si le plan tient encore, et jusqu’à quel âge on peut partir.',
        'Une rente plus élevée s’ajoute à vos retraits de REER/FERR : au-delà du seuil de récupération de la PSV (voir « Paramètres utilisés »), une partie de la PSV est reprise en impôt.',
      ],
      againstTitle: 'Pourquoi ne pas reporter',
      against: [
        'La santé ou l’espérance de vie : le point d’équilibre est un pari sur la durée de la vie. Avant lui, commencer tôt a rapporté davantage.',
        'Le Supplément de revenu garanti (SRG) : il n’est payé qu’avec la PSV, donc reporter la PSV reporte aussi le SRG. Avec un revenu faible, reporter coûte souvent plus que ça ne rapporte.',
        'Les années sans rente se paient à même vos comptes, tôt et avec leurs rendements : si le plan ne tient plus, le tableau le dit.',
      ],
      caveat: 'Montants avant impôt, en dollars d’aujourd’hui, une seule rente modifiée à la fois. On suppose une vie aussi longue que l’horizon du plan. La rente de conjoint survivant n’est pas modélisée : elle peut jouer pour ou contre le report et n’est pas comptée ici.',
  },
  en: {
      title: 'When should I start my pension?',
      hint: 'The QPP pension and Old Age Security (OAS) are paid for life and follow prices: starting later gives a bigger amount, but for fewer years. Here is what each starting age gives your household, everything else in the plan unchanged.',
      busy: 'Calculating…',
      person: 'For',
      rrqTitle: 'Québec Pension Plan (QPP) pension',
      oasTitle: 'Old Age Security (OAS) pension',
      colStart: 'Start',
      colMonthly: 'Per month',
      colVersus: 'Against 65',
      colBreakEven: 'Break-even',
      colPlan: 'Your plan',
      colEarliest: 'Earliest retirement',
      colWorth85: 'Net worth at 85',
      colWorth95: 'Net worth at 95',
      age: (age: number) => `${age}`,
      yours: 'your current plan',
      versusSame: 'reference',
      versusMore: (pct: string) => `+${pct}`,
      versusLess: (pct: string) => `−${pct}`,
      breakEvenLater: (age: number) => `at ${age}`,
      breakEvenEarlier: (age: number) => `starting at 65 catches up at ${age}`,
      breakEvenNone: 'beyond the plan’s horizon',
      breakEvenSelf: '—',
      works: 'Holds',
      fails: (year: number) => `Runs short from ${year}`,
      earliest: (age: number | null) => (age === null ? 'no age' : `${age}`),
      noWorth: '—',
      whyTitle: 'Why deferring can make sense',
      whyLead: (rrqMax: string, oasMax: string) =>
        `A larger lifetime income, indexed to prices: up to ${rrqMax} more for the QPP pension (at 72) and ${oasMax} more for the OAS (at 70). It is longevity insurance: if you live long, it is what keeps you from running out of money.`,
      why: [
        'Fewer withdrawals late in life, when a bad market year hurts the most.',
        'The bridge years are paid by your RRSP, TFSA and investments: the table shows whether the plan still holds, and how early you can retire.',
        'A bigger pension adds to your RRSP/RRIF withdrawals: above the OAS recovery threshold (see “Parameters used”), part of the OAS is taken back as tax.',
      ],
      againstTitle: 'Why not defer',
      against: [
        'Health or life expectancy: the break-even is a bet on how long you live. Before it, starting early paid more.',
        'The Guaranteed Income Supplement (GIS): it is paid only with the OAS pension, so deferring the OAS defers the GIS too. On a low income, deferring often costs more than it earns.',
        'The years without a pension are paid out of your accounts, early and at the cost of their returns: if the plan no longer holds, the table says so.',
      ],
      caveat: 'Amounts before tax, in today’s dollars, one pension changed at a time. A life as long as the plan’s horizon is assumed. The survivor’s pension is not modelled: it can count for or against deferring and is not included here.',
  },
}
