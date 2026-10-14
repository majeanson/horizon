// The words of « Égaliser les REER des conjoints » (Résultats › Décider). Like bracketFillCopy.ts, they live outside the eager dictionaries (a bundle-budget reason),
// so spouseBalanceCopy.test.ts does the parity job for them: every text in both languages, none empty, none left in the other language, and no cited rate, threshold or
// year-count typed into a sentence (every figure comes from the engine, formatted by the page). The French signs that bind to a word hold a narrow no-break space (U+202F),
// written as an escape here (frenchSpacing.test.ts).

export interface SpouseBalanceEffect {
  /** The tax difference over the whole plan, formatted; null when it is about the same. */
  tax: string | null
  /** Is the evened-out plan the one paying less tax? */
  less: boolean
}

export interface SpouseBalanceCopy {
  title: string
  hint: (age: number) => string
  /** The page's map chip. */
  nav: string
  /** Said when the two RRSPs are already level, or what could move is locked in. */
  level: string
  /** The sentence on the panel: what moving the money does, the years first when it gains any. */
  better: (moved: string, saved: string, balancedAge: number | null, ownAge: number | null) => string
  /** The answer's own sentence (« À faire cette année »). */
  nudge: (moved: string, saved: string, balancedAge: number | null, ownAge: number | null) => string
  /** What the evened-out plan does to the tax when it is not worth a nudge (or costs more). */
  effect: (e: SpouseBalanceEffect) => string
  /** The comparison table. */
  plan: string
  rows: { current: string; balanced: string }
  /** Column of one person's RRSP balance. */
  rrspOf: (name: string) => string
  earliest: string
  tax: string
  age: (n: number) => string
  updating: string
  /** Behind a fold: how to read the page. */
  howTitle: string
  how: string
  caveat: string
}

const FR: SpouseBalanceCopy = {
  title: 'Égaliser les REER des conjoints ?',
  hint: (age) =>
    `Votre plan, retraite à ${age} ans, refait avec une partie du plus gros REER dans celui de l’autre conjoint, jusqu’à ce que les deux soient à peu près égaux. Les retraits sont recalculés année par année avec l’impôt, le fractionnement du revenu de pension, la RRQ, la PSV et le SRG.`,
  nav: 'REER des conjoints',
  level: 'Les deux REER sont déjà de taille semblable, ou ce qui pourrait changer de main est immobilisé : égaliser n’y changerait presque rien.',
  better: (moved, saved, balancedAge, ownAge) => {
    const years = (n: number) => `${n} ${n > 1 ? 'ans' : 'an'}`
    const lead = `Avec ${moved} du plus gros REER dans celui de l’autre conjoint, `
    if (balancedAge !== null && (ownAge === null || balancedAge < ownAge)) {
      return `${lead}le ménage pourrait prendre sa retraite ${ownAge === null ? `à ${balancedAge} ans, alors que le partage actuel ne dure à aucun âge` : `${years(ownAge - balancedAge)} plus tôt`}.`
    }
    return `${lead}l’impôt sur tout le plan serait d’environ ${saved} de moins (en dollars d’aujourd’hui).`
  },
  nudge: (moved, saved, balancedAge, ownAge) => {
    const years = (n: number) => `${n} ${n > 1 ? 'ans' : 'an'}`
    if (balancedAge !== null && (ownAge === null || balancedAge < ownAge)) {
      return `Égaliser les REER des conjoints (${moved} à déplacer) permettrait de prendre sa retraite ${ownAge === null ? `à ${balancedAge} ans, alors que le plan actuel ne dure à aucun âge` : `${years(ownAge - balancedAge)} plus tôt`}.`
    }
    return `Égaliser les REER des conjoints (${moved} à déplacer) coûterait environ ${saved} d’impôt de moins sur tout le plan (en dollars d’aujourd’hui).`
  },
  effect: (e) => `Par rapport au partage actuel : ${e.tax === null ? 'à peu près le même impôt' : `${e.tax} d’impôt de ${e.less ? 'moins' : 'plus'}`} sur tout le plan. L’écart est trop petit pour valoir une démarche.`,
  plan: 'Partage des REER',
  rows: { current: 'Partage actuel', balanced: 'REER égalisés' },
  rrspOf: (name) => `REER de ${name}`,
  earliest: 'Retraite au plus tôt',
  tax: 'Impôt sur tout le plan',
  age: (n) => `${n} ans`,
  updating: 'Mise à jour…',
  howTitle: 'Comment lire cette page',
  how: 'Quand l’un des conjoints a un bien plus gros REER, ses retraits sont imposés à un taux plus haut que ceux de l’autre. Cette page refait le plan avec une partie de ce REER dans celui de l’autre conjoint et compare l’impôt sur tout le plan : c’est ce que ferait un REER de conjoint, alimenté par celui qui gagne le plus.',
  caveat:
    'C’est une approximation d’un REER de conjoint. Dans la réalité, c’est celui qui gagne le plus qui cotise, et il garde la déduction et ses droits de cotisation (ici, seuls les soldes changent de main). Un retrait fait dans les années civiles qui suivent une cotisation au REER de conjoint est imposé chez celui qui a cotisé, selon la règle d’attribution de l’Agence du revenu du Canada : l’avantage se joue donc surtout avant 65 ans, car le fractionnement du revenu de pension rapproche déjà les deux revenus ensuite. Un REER immobilisé ne peut pas changer de main.',
}

const EN: SpouseBalanceCopy = {
  title: 'Even out the spouses’ RRSPs?',
  hint: (age) =>
    `Your plan (retiring at ${age}), run again with part of the larger RRSP held in the other spouse’s, until the two are about equal. Everything is recalculated year by year with tax, pension income splitting, the QPP, OAS and GIS.`,
  nav: 'Spouses’ RRSPs',
  level: 'The two RRSPs are already about the same size, or what could change hands is locked in: evening out would change almost nothing.',
  better: (moved, saved, balancedAge, ownAge) => {
    const years = (n: number) => `${n} ${n > 1 ? 'years' : 'year'}`
    const lead = `With ${moved} of the larger RRSP held in the other spouse’s, `
    if (balancedAge !== null && (ownAge === null || balancedAge < ownAge)) {
      return `${lead}the household could retire ${ownAge === null ? `at ${balancedAge}, where the current split never lasts` : `${years(ownAge - balancedAge)} earlier`}.`
    }
    return `${lead}the tax over the whole plan would be about ${saved} less (in today’s dollars).`
  },
  nudge: (moved, saved, balancedAge, ownAge) => {
    const years = (n: number) => `${n} ${n > 1 ? 'years' : 'year'}`
    if (balancedAge !== null && (ownAge === null || balancedAge < ownAge)) {
      return `Evening out the spouses’ RRSPs (${moved} to move) would let you retire ${ownAge === null ? `at ${balancedAge}, where the current plan never lasts` : `${years(ownAge - balancedAge)} earlier`}.`
    }
    return `Evening out the spouses’ RRSPs (${moved} to move) would cost about ${saved} less tax over the whole plan (in today’s dollars).`
  },
  effect: (e) => `Compared with the current split: ${e.tax === null ? 'about the same tax' : `${e.tax} ${e.less ? 'less' : 'more'} tax`} over the whole plan. The gap is too small to be worth the trouble.`,
  plan: 'Split of the RRSPs',
  rows: { current: 'Current split', balanced: 'RRSPs evened out' },
  rrspOf: (name) => `${name}’s RRSP`,
  earliest: 'Earliest retirement',
  tax: 'Tax over the whole plan',
  age: (n) => `${n}`,
  updating: 'Updating…',
  howTitle: 'How to read this page',
  how: 'When one spouse has a much larger RRSP, their withdrawals are taxed at a higher rate than the other’s. This page runs the plan again with part of that RRSP held in the other spouse’s and compares the tax over the whole plan: it is what a spousal RRSP, funded by the higher earner, would do.',
  caveat:
    'This is an approximation of a spousal RRSP. In real life the higher earner contributes and keeps the deduction and the contribution room (here, only the balances change hands). A withdrawal made within the calendar years that follow a spousal contribution is taxed back to the contributor, under the Canada Revenue Agency’s attribution rule: the benefit is mostly before 65, since pension income splitting already brings the two incomes closer afterwards. A locked-in RRSP cannot change hands.',
}

export const SPOUSE_BALANCE_COPY = { fr: FR, en: EN }
