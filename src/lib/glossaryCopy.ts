// The glossary: every abbreviation and every word of Horizon's own, said once, in plain language, with the official page
// to read next. It is the ONE place that spells an abbreviation out — the pages keep using the short form.
//
// It lives HERE and not in the eager dictionaries for the same reason resultsCopy.ts does: the French dictionary is paid by
// every page (check-bundle.mjs holds it to a budget), while this is fetched with the glossary page alone. The English copy is
// typed as the French one, so the two cannot drift apart; lib/glossaryCopy.test.ts holds the texts, the links and the
// agreement with the names the dictionaries already spell out (« Régime de rentes du Québec (RRQ) », …).
//
// A link is an OFFICIAL page already opened for the dictionaries' « Où trouver ce chiffre » notes (or its twin in the
// other language, engine/params/twins.ts) — never a page written from memory. A term without one says so by omission.
//
// Each language uses ITS OWN abbreviations (RRQ / QPP, PSV / OAS, REER / RRSP …), exactly as the app's two dictionaries do.

export interface GlossaryTerm {
  /** The same in both languages (QPP and RRQ are both `rrq`): the anchor a hint links to, and what ties the two editions together. */
  id: string
  /** The short form as the app writes it (« RRQ »), or the word itself for a word of Horizon's own (« nid »). */
  abbr: string
  /** What it stands for, in full — or a short label when `abbr` is already a whole word. */
  name: string
  /** One or two plain sentences: what it is, and why it matters to this plan. */
  plain: string
  /** An official page, or omitted when the figure lives on the person's own statements. */
  url?: string
  /** Who publishes the page (« Retraite Québec »), shown beside the link. */
  host?: string
}

/** A document a person has to find, the figures it holds in Profil, and how to get it. */
export interface GlossaryDoc {
  doc: string
  gives: string
  how: string
  url?: string
  host?: string
}

/** A place to check Horizon's answer against, or to ask a person. */
export interface GlossaryHelp {
  label: string
  plain: string
  url: string
  host: string
}

interface GlossaryGroup {
  id: string
  title: string
  hint: string
  terms: readonly GlossaryTerm[]
}

const FR_GLOSSARY = {
  title: 'Glossaire',
  subtitle: 'Les sigles et les mots d’Horizon, en langage clair — avec la page officielle pour aller plus loin.',
  intro: 'Les sigles viennent des documents officiels : on les retrouve tels quels sur vos relevés. Chaque terme dit ce que c’est, puis où le vérifier.',
  openLink: 'Page officielle',
  nav: 'Aller à un groupe',
  groups: [
    {
      id: 'publics',
      title: 'Ce que l’État vous verse',
      hint: 'Les rentes publiques : elles forment la base du revenu de retraite.',
      terms: [
        {
          id: 'rrq',
          abbr: 'RRQ',
          name: 'Régime de rentes du Québec',
          plain: 'La rente de retraite publique du Québec, calculée sur vos gains de travail et vos années de cotisation. Elle peut commencer de 60 à 72 ans : plus tôt, elle est réduite ; plus tard, elle est augmentée.',
          url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/retraite-et-planification/demandez-rente-retraite/rente-retraite-regime-rentes-quebec/quel-age-devriez-vous-demander-rente-retraite',
          host: 'Retraite Québec',
        },
        {
          id: 'psv',
          abbr: 'PSV',
          name: 'Pension de la Sécurité de la vieillesse',
          plain: 'La pension fédérale versée à partir de 65 ans, selon le nombre d’années vécues au Canada. Elle est réduite quand le revenu est élevé.',
          url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/montant-prestation.html',
          host: 'Service Canada',
        },
        {
          id: 'srg',
          abbr: 'SRG',
          name: 'Supplément de revenu garanti',
          plain: 'Un complément à la PSV pour les revenus modestes. Il baisse à mesure que les autres revenus montent, et disparaît au-delà d’un certain seuil.',
          url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/supplement-revenu-garanti.html',
          host: 'Service Canada',
        },
        {
          id: 'indexation',
          abbr: 'Indexation',
          name: 'Le rajustement au coût de la vie',
          plain: 'Le rajustement annuel d’un montant selon la hausse des prix. Les rentes publiques sont indexées ; une rente d’employeur l’est en tout, en partie ou pas du tout, selon le régime.',
        },
        {
          id: 'recuperation',
          abbr: 'Récupération',
          name: 'Le remboursement d’une partie de la PSV',
          plain: 'Quand le revenu net dépasse un seuil, une partie de la PSV doit être remboursée, par l’impôt. Plus le revenu est élevé, plus la part remboursée est grande.',
          url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/remboursement.html',
          host: 'Service Canada',
        },
        {
          id: 'releve',
          abbr: 'Relevé de participation',
          name: 'Le relevé de Retraite Québec',
          plain: 'Le document qui liste, année par année, vos gains et ce que le RRQ en retient. C’est lui que vous recopiez dans Profil.',
          url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/travail/emploi-et-regime-rentes-quebec/releve-participation-regime-rentes-quebec',
          host: 'Retraite Québec',
        },
        {
          id: 'mga',
          abbr: 'MGA',
          name: 'Maximum des gains admissibles',
          plain: 'Le plafond annuel des gains que le RRQ prend en compte. Ce qui dépasse ne fait pas grossir la rente. Il augmente chaque année, ce qui sert aussi de repère à la hausse des salaires.',
          url: 'https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime-rentes-quebec/travail-et-cotisations/revenus-travail-admissibles-et-cotisations',
          host: 'Retraite Québec',
        },
      ],
    },
    {
      id: 'comptes',
      title: 'Vos comptes d’épargne',
      hint: 'Là où l’argent attend la retraite. Les trois ne sont pas imposés de la même façon.',
      terms: [
        {
          id: 'reer',
          abbr: 'REER',
          name: 'Régime enregistré d’épargne-retraite',
          plain: 'Un compte où les cotisations réduisent votre impôt aujourd’hui. L’argent croît à l’abri de l’impôt, et chaque retrait est imposé comme un revenu.',
          url: 'https://www.canada.ca/fr/agence-revenu/services/formulaires-publications/publications/t4040/reer-autres-regimes-enregistres-retraite.html',
          host: 'Agence du revenu du Canada',
        },
        {
          id: 'celi',
          abbr: 'CELI',
          name: 'Compte d’épargne libre d’impôt',
          plain: 'Un compte où les cotisations ne réduisent pas l’impôt, mais où la croissance et les retraits ne sont jamais imposés.',
          url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/compte-epargne-libre-impot/cotiser/calculer-droits.html',
          host: 'Agence du revenu du Canada',
        },
        {
          id: 'ferr',
          abbr: 'FERR',
          name: 'Fonds enregistré de revenu de retraite',
          plain: 'Ce que devient le REER quand on commence à en tirer un revenu (au plus tard l’année des 71 ans). Un retrait minimum est exigé chaque année.',
          url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/reer-regimes-connexes/options-vos-reer-lorsque-vous-atteignez-71-ans.html',
          host: 'Agence du revenu du Canada',
        },
        {
          id: 'droits',
          abbr: 'Droits de cotisation',
          name: 'Ce que vous pouvez encore verser',
          plain: 'Le montant que vous pouvez encore verser, cette année, dans un REER ou un CELI. Il se trouve dans votre compte de l’ARC ; verser plus peut entraîner un impôt de pénalité.',
          url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/reer-regimes-connexes/cotiser-a-reer-a-rpac-a/effet-vos-cotisations-maximum-deductible-votre-reer-rpac.html',
          host: 'Agence du revenu du Canada',
        },
        {
          id: 'tranche',
          abbr: 'Tranche d’imposition',
          name: 'Un palier de revenu, un taux',
          plain: 'Le taux d’impôt monte par paliers : chaque tranche de revenu est imposée à son propre taux. Le taux de la dernière tranche atteinte s’appelle le taux marginal.',
          url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/taux-imposition-tranches-revenu/annee-en-cours.html',
          host: 'Agence du revenu du Canada',
        },
        {
          id: 'non-enregistre',
          abbr: 'Non enregistré',
          name: 'Compte non enregistré',
          plain: 'Les placements hors REER et CELI : aucun abri fiscal. Seul le gain réalisé à la vente est imposé, en partie.',
        },
        {
          id: 'pbr',
          abbr: 'PBR',
          name: 'Prix de base rajusté',
          plain: 'Ce que vous avez payé pour un placement non enregistré, ajusté au fil du temps. Le gain imposable à la vente, c’est le prix de vente moins le PBR.',
          url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-votre-declaration-revenus/declaration-revenus/remplir-declaration-revenus/revenu-personnel/ligne-12700-gains-capital/calculer-declarer-vos-gains-pertes-capital.html',
          host: 'Agence du revenu du Canada',
        },
        {
          id: 'arc',
          abbr: 'ARC',
          name: 'Agence du revenu du Canada',
          plain: 'L’organisme fédéral des impôts. Votre avis de cotisation et votre compte en ligne indiquent vos droits de cotisation REER et CELI.',
          url: 'https://www.canada.ca/fr/agence-revenu.html',
          host: 'Agence du revenu du Canada',
        },
      ],
    },
    {
      id: 'employeur',
      title: 'Le régime de votre employeur',
      hint: 'Une rente ou un compte lié à un emploi. Une partie est parfois bloquée jusqu’à la retraite.',
      terms: [
        {
          id: 'rente-employeur',
          abbr: 'Rente d’employeur',
          name: 'Régime de retraite à prestations déterminées',
          plain: 'Une rente à vie, calculée sur vos années de service et votre salaire. Son montant est connu d’avance : il se lit sur le livret ou le relevé du régime.',
        },
        {
          id: 'rente-viagere',
          abbr: 'Rente viagère',
          name: 'Une rente versée à vie',
          plain: 'Une rente qui dure toute la vie, quelle qu’en soit la durée. Le RRQ, la PSV et la plupart des rentes d’employeur le sont.',
        },
        {
          id: 'rregop',
          abbr: 'RREGOP',
          name: 'Régime de retraite des employés du gouvernement et des organismes publics',
          plain: 'Le régime de retraite de la fonction publique du Québec, de l’éducation et de la santé. Horizon préremplit ses règles d’après Retraite Québec.',
          url: 'https://www.retraitequebec.gouv.qc.ca/fr/publications/regimes-retraite-secteur-public/rregop',
          host: 'Retraite Québec',
        },
        {
          id: 'rver',
          abbr: 'RVER',
          name: 'Régime volontaire d’épargne-retraite',
          plain: 'Un compte d’épargne-retraite offert par l’employeur au Québec. Les cotisations de l’employeur y sont bloquées jusqu’à la retraite.',
          url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/travail/regime-volontaire-epargne-retraite-rver-et-instruments-transfert-et-decaissement/regime-volontaire-epargne-retraite-rver/travailleur-et-rver',
          host: 'Retraite Québec',
        },
        {
          id: 'rpac',
          abbr: 'RPAC',
          name: 'Régime de pension agréé collectif',
          plain: 'Le pendant fédéral du RVER. Dans Horizon, il se compte avec vos REER : mêmes impôts.',
        },
        {
          id: 'cri',
          abbr: 'CRI',
          name: 'Compte de retraite immobilisé',
          plain: 'Là où va l’argent d’un régime d’employeur quand on le quitte. Il est « immobilisé » : on ne peut pas le retirer librement avant la retraite.',
        },
        {
          id: 'frv',
          abbr: 'FRV',
          name: 'Fonds de revenu viager',
          plain: 'Le CRI converti en revenu de retraite. Un maximum de retrait annuel s’applique, plus strict avant 55 ans.',
        },
      ],
    },
    {
      id: 'horizon',
      title: 'Les mots d’Horizon',
      hint: 'Ce que veulent dire, dans l’application, quelques mots qui reviennent partout.',
      terms: [
        {
          id: 'reponse',
          abbr: 'Réponse',
          name: 'La phrase en haut de Résultats',
          plain: 'Le plus tôt où l’argent dure jusqu’à la fin du plan, avec vos chiffres et vos hypothèses.',
        },
        {
          id: 'nid',
          abbr: 'Nid',
          name: 'Vos économies',
          plain: 'L’ensemble de vos REER, CELI et comptes non enregistrés. « Tiré du nid », sur le graphique, c’est ce que vous retirez de vos économies cette année-là.',
        },
        {
          id: 'scenario',
          abbr: 'Scénario',
          name: 'Prudent · Neutre · Audacieux',
          plain: 'Trois jeux d’hypothèses prêts à l’emploi sur l’avenir (inflation, rendement, hausse des salaires). Neutre suit les normes de projection de FP Canada et de l’Institut de planification financière.',
          url: 'https://institutpf.org/normes-hypotheses-projection',
          host: 'Institut de planification financière',
        },
        {
          id: 'depart',
          abbr: 'Départ',
          name: 'Un âge de retraite comparé',
          plain: '« Départ à 62 ans » : la même vie, avec la retraite qui commence à cet âge. Comparer des départs, c’est voir l’argent année par année pour chacun.',
        },
        {
          id: 'fin-plan',
          abbr: 'Fin du plan',
          name: 'L’âge jusqu’où le plan vit',
          plain: 'L’âge que vous choisissez dans Hypothèses. L’argent « dure » s’il reste de quoi vivre jusque-là.',
        },
        {
          id: 'dollars-aujourdhui',
          abbr: 'Dollars d’aujourd’hui',
          name: 'Montants sans l’inflation',
          plain: 'Les chiffres sont donnés en pouvoir d’achat actuel, pour qu’un montant dans vingt ans se compare à ce qu’il vaut aujourd’hui.',
        },
        {
          id: 'rendement',
          abbr: 'Rendement réel et nominal',
          name: 'Avec ou sans l’inflation',
          plain: 'Le rendement nominal est celui d’un relevé ; le rendement réel est ce qui reste une fois l’inflation retirée. Un placement qui rapporte 5 % quand les prix montent de 2 % gagne environ 3 % en pouvoir d’achat.',
        },
        {
          id: 'inflation',
          abbr: 'Inflation',
          name: 'La hausse des prix',
          plain: 'Elle réduit le pouvoir d’achat d’une somme fixe. Les rentes publiques suivent l’inflation ; beaucoup de rentes d’employeur la suivent en partie seulement.',
          url: 'https://www.banqueducanada.ca/grandes-fonctions/politique-monetaire/ententes-relatives-cible-maitrise-inflation/',
          host: 'Banque du Canada',
        },
      ],
    },
  ] as readonly GlossaryGroup[],
  docs: {
    id: 'documents',
    title: 'Où trouver vos documents',
    hint: 'Les chiffres de Profil viennent de quelques documents. Rassemblez-les avant de commencer : vous les saisirez plus vite.',
    items: [
      {
        doc: 'Relevé de participation (RRQ)',
        gives: 'Vos gains année par année : la section RRQ de Profil.',
        how: 'Dans Mon dossier, sur le site de Retraite Québec.',
        url: 'https://www.retraitequebec.gouv.qc.ca/fr/services-en-ligne-outils/Pages/releve-de-participation.aspx',
        host: 'Retraite Québec',
      },
      {
        doc: 'Compte de l’ARC et avis de cotisation',
        gives: 'Votre maximum déductible au titre des REER et vos droits de cotisation au CELI.',
        how: 'Dans votre compte de l’ARC, ou sur l’avis reçu après votre déclaration de revenus.',
        url: 'https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-particuliers/dossier-particuliers.html',
        host: 'Agence du revenu du Canada',
      },
      {
        doc: 'Relevé du régime de retraite de l’employeur',
        gives: 'La rente prévue, vos années de service et la coordination avec le RRQ.',
        how: 'Auprès de votre employeur ou de l’administrateur du régime. Pour le RREGOP, auprès de Retraite Québec.',
        url: 'https://www.retraitequebec.gouv.qc.ca/fr/nous-joindre/Pages/nous-joindre.aspx',
        host: 'Retraite Québec',
      },
      {
        doc: 'Relevés de vos comptes',
        gives: 'Le solde de vos REER, CELI et comptes non enregistrés, et le PBR de ces derniers.',
        how: 'Auprès de votre institution financière, en ligne ou par la poste.',
      },
      {
        doc: 'Relevé d’un RVER, d’un CRI ou d’un FRV',
        gives: 'La part immobilisée de votre épargne.',
        how: 'Auprès de l’institution ou de l’administrateur du régime.',
      },
    ] as readonly GlossaryDoc[],
  },
  help: {
    id: 'aller-plus-loin',
    title: 'Aller plus loin',
    hint: 'Pour vérifier la réponse d’Horizon auprès des outils officiels, ou poser une question à une personne.',
    items: [
      {
        label: 'Les outils de Retraite Québec',
        plain: 'Le site réunit les outils de simulation de la rente et des revenus à la retraite, et l’accès à Mon dossier. Comparez leur résultat avec celui d’Horizon.',
        url: 'https://www.retraitequebec.gouv.qc.ca/fr/services-en-ligne-outils/Pages/services-en-ligne-outils.aspx',
        host: 'Retraite Québec',
      },
      {
        label: 'Combien vous pourriez recevoir de la PSV',
        plain: 'La page de Service Canada qui explique le calcul de la PSV et du SRG. Elle sert de repère pour ces deux montants.',
        url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/montant-prestation.html',
        host: 'Service Canada',
      },
      {
        label: 'Joindre Retraite Québec',
        plain: 'Les numéros et les heures d’ouverture, selon que votre question touche le RRQ, un régime public ou un RVER.',
        url: 'https://www.retraitequebec.gouv.qc.ca/fr/nous-joindre/Pages/nous-joindre.aspx',
        host: 'Retraite Québec',
      },
    ] as readonly GlossaryHelp[],
    advice: 'Horizon donne une estimation, pas un avis. Pour un conseil sur votre situation, adressez-vous à un planificateur financier ou à une planificatrice financière.',
  },
}

const EN_GLOSSARY: typeof FR_GLOSSARY = {
  title: 'Glossary',
  subtitle: 'Horizon’s abbreviations and its own words, in plain language — with the official page to read next.',
  intro: 'The abbreviations come from the official documents: you will see them as written on your statements. Each term says what it is, then where to check it.',
  openLink: 'Official page',
  nav: 'Jump to a group',
  groups: [
    {
      id: 'publics',
      title: 'What the government pays you',
      hint: 'The public pensions: they are the base of retirement income.',
      terms: [
        {
          id: 'rrq',
          abbr: 'QPP',
          name: 'Québec Pension Plan',
          plain: 'Québec’s public retirement pension, worked out from your earnings and the years you contributed. It can start from 60 to 72: earlier, it is reduced; later, it is increased.',
          url: 'https://www.retraitequebec.gouv.qc.ca/en/citizens/retirement-planning/applying-your-retirement-pension/retirement-pension-quebec-pension-plan/what-age-should-you-apply-your-retirement-pension',
          host: 'Retraite Québec',
        },
        {
          id: 'psv',
          abbr: 'OAS',
          name: 'Old Age Security',
          plain: 'The federal pension paid from 65, according to the number of years lived in Canada. It is reduced when income is high.',
          url: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/benefit-amount.html',
          host: 'Service Canada',
        },
        {
          id: 'srg',
          abbr: 'GIS',
          name: 'Guaranteed Income Supplement',
          plain: 'A top-up to the OAS for modest incomes. It falls as other income rises, and stops above a certain threshold.',
          url: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/guaranteed-income-supplement.html',
          host: 'Service Canada',
        },
        {
          id: 'indexation',
          abbr: 'Indexation',
          name: 'Adjustment to the cost of living',
          plain: 'The yearly adjustment of an amount to the rise in prices. Public pensions are indexed; an employer pension is indexed fully, partly or not at all, depending on the plan.',
        },
        {
          id: 'recuperation',
          abbr: 'Clawback',
          name: 'Paying back part of the OAS',
          plain: 'When net income goes above a threshold, part of the OAS has to be paid back, through tax. The higher the income, the larger the share paid back.',
          url: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/repayment.html',
          host: 'Service Canada',
        },
        {
          id: 'releve',
          abbr: 'Statement of participation',
          name: 'The Retraite Québec statement',
          plain: 'The document that lists, year by year, your earnings and what the QPP counts of them. It is the one you copy into Profile.',
          url: 'https://www.retraitequebec.gouv.qc.ca/en/citizens/retirement-planning/planning-your-retirement/statement-participation',
          host: 'Retraite Québec',
        },
        {
          id: 'mga',
          abbr: 'YMPE',
          name: 'Year’s Maximum Pensionable Earnings',
          plain: 'The yearly ceiling on the earnings the QPP counts. Anything above it does not grow the pension. It rises every year, which also serves as a yardstick for wage growth.',
          url: 'https://www.retraitequebec.gouv.qc.ca/en/programs/quebec-pension-plan/work-contributions/pensionable-earnings-contributions',
          host: 'Retraite Québec',
        },
      ],
    },
    {
      id: 'comptes',
      title: 'Your savings accounts',
      hint: 'Where the money waits for retirement. The three are not taxed the same way.',
      terms: [
        {
          id: 'reer',
          abbr: 'RRSP',
          name: 'Registered Retirement Savings Plan',
          plain: 'An account where contributions lower your tax today. The money grows tax-sheltered, and every withdrawal is taxed as income.',
          url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4040/rrsps-other-registered-plans-retirement.html',
          host: 'Canada Revenue Agency',
        },
        {
          id: 'celi',
          abbr: 'TFSA',
          name: 'Tax-Free Savings Account',
          plain: 'An account where contributions do not lower your tax, but growth and withdrawals are never taxed.',
          url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html',
          host: 'Canada Revenue Agency',
        },
        {
          id: 'ferr',
          abbr: 'RRIF',
          name: 'Registered Retirement Income Fund',
          plain: 'What an RRSP becomes when you start drawing income from it (by the year you turn 71 at the latest). A minimum withdrawal is required every year.',
          url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/rrsp-options-when-you-turn-71.html',
          host: 'Canada Revenue Agency',
        },
        {
          id: 'droits',
          abbr: 'Contribution room',
          name: 'What you can still put in',
          plain: 'The amount you can still put into an RRSP or a TFSA this year. It is in your CRA account; contributing more can mean a penalty tax.',
          url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html',
          host: 'Canada Revenue Agency',
        },
        {
          id: 'tranche',
          abbr: 'Tax bracket',
          name: 'A band of income, a rate',
          plain: 'The tax rate rises in steps: each band of income is taxed at its own rate. The rate of the last band you reach is called the marginal rate.',
          url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html',
          host: 'Canada Revenue Agency',
        },
        {
          id: 'non-enregistre',
          abbr: 'Non-registered',
          name: 'Non-registered account',
          plain: 'Investments outside the RRSP and TFSA: no tax shelter. Only the gain made when you sell is taxed, and only in part.',
        },
        {
          id: 'pbr',
          abbr: 'ACB',
          name: 'Adjusted cost base',
          plain: 'What you paid for a non-registered investment, adjusted over time. The taxable gain on a sale is the sale price minus the ACB.',
          url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains/calculating-reporting-your-capital-gains-losses.html',
          host: 'Canada Revenue Agency',
        },
        {
          id: 'arc',
          abbr: 'CRA',
          name: 'Canada Revenue Agency',
          plain: 'The federal tax agency. Your notice of assessment and your online account show your RRSP and TFSA contribution room.',
          url: 'https://www.canada.ca/en/revenue-agency.html',
          host: 'Canada Revenue Agency',
        },
      ],
    },
    {
      id: 'employeur',
      title: 'Your employer’s plan',
      hint: 'A pension or an account tied to a job. Part of it is sometimes locked in until retirement.',
      terms: [
        {
          id: 'rente-employeur',
          abbr: 'Employer pension',
          name: 'Defined-benefit pension plan',
          plain: 'A lifetime pension worked out from your years of service and your salary. Its amount is known in advance: it is on the plan’s booklet or statement.',
        },
        {
          id: 'rente-viagere',
          abbr: 'Lifetime pension',
          name: 'A pension paid for life',
          plain: 'A pension that lasts as long as you live, however long that is. The QPP, the OAS and most employer pensions are.',
        },
        {
          id: 'rregop',
          abbr: 'RREGOP',
          name: 'Government and Public Employees Retirement Plan',
          plain: 'The pension plan of Québec’s public service, education and health sectors. Horizon pre-fills its rules from Retraite Québec.',
          url: 'https://www.retraitequebec.gouv.qc.ca/en/publications/public-sector-pension-plans/rregop',
          host: 'Retraite Québec',
        },
        {
          id: 'rver',
          abbr: 'VRSP',
          name: 'Voluntary Retirement Savings Plan',
          plain: 'A retirement savings account offered by employers in Québec. The employer’s contributions are locked in until retirement.',
          url: 'https://www.retraitequebec.gouv.qc.ca/en/citizens/work/voluntary-retirement-savings-plans-vrsps-transfer-withdrawal-instruments/voluntary-retirement-savings-plans-vrsps/workers-vrsps',
          host: 'Retraite Québec',
        },
        {
          id: 'rpac',
          abbr: 'PRPP',
          name: 'Pooled Registered Pension Plan',
          plain: 'The federal counterpart of the VRSP. In Horizon it counts with your RRSPs: same taxes.',
        },
        {
          id: 'cri',
          abbr: 'LIRA',
          name: 'Locked-in Retirement Account',
          plain: 'Where the money from an employer plan goes when you leave it. It is “locked in”: you cannot withdraw it freely before retirement.',
        },
        {
          id: 'frv',
          abbr: 'LIF',
          name: 'Life Income Fund',
          plain: 'The LIRA converted into retirement income. A yearly withdrawal maximum applies, stricter before 55.',
        },
      ],
    },
    {
      id: 'horizon',
      title: 'Horizon’s own words',
      hint: 'What a few words that come up everywhere mean in the app.',
      terms: [
        {
          id: 'reponse',
          abbr: 'Answer',
          name: 'The sentence at the top of Results',
          plain: 'The earliest age at which the money lasts until the end of the plan, with your numbers and your assumptions.',
        },
        {
          id: 'nid',
          abbr: 'Nest egg',
          name: 'Your savings',
          plain: 'All your RRSPs, TFSAs and non-registered accounts. “Drawn from the nest egg”, on the chart, is what you take out of your savings that year.',
        },
        {
          id: 'scenario',
          abbr: 'Scenario',
          name: 'Conservative · Neutral · Aggressive',
          plain: 'Three ready-made sets of assumptions about the future (inflation, returns, wage growth). Neutral follows the projection guidelines of FP Canada and the Institute of Financial Planning.',
          url: 'https://institutpf.org/en/projection-assumption-guidelines',
          host: 'Institute of Financial Planning',
        },
        {
          id: 'depart',
          abbr: 'Retire at 62',
          name: 'A retirement age being compared',
          plain: '“Retire at 62”: the same life, with retirement starting at that age. Comparing ages shows the money year by year for each.',
        },
        {
          id: 'fin-plan',
          abbr: 'End of the plan',
          name: 'The age the plan runs to',
          plain: 'The age you choose in Assumptions. The money “lasts” if there is enough to live on up to it.',
        },
        {
          id: 'dollars-aujourdhui',
          abbr: 'Today’s dollars',
          name: 'Amounts without inflation',
          plain: 'Figures are given in current purchasing power, so an amount twenty years from now compares with what it is worth today.',
        },
        {
          id: 'rendement',
          abbr: 'Real and nominal return',
          name: 'With or without inflation',
          plain: 'The nominal return is the one on a statement; the real return is what is left once inflation is taken out. An investment that earns 5% while prices rise 2% gains about 3% in buying power.',
        },
        {
          id: 'inflation',
          abbr: 'Inflation',
          name: 'The rise in prices',
          plain: 'It shrinks the buying power of a fixed sum. Public pensions follow inflation; many employer pensions follow it only in part.',
          url: 'https://www.bankofcanada.ca/core-functions/monetary-policy/inflation-control-target/',
          host: 'Bank of Canada',
        },
      ],
    },
  ],
  docs: {
    id: 'documents',
    title: 'Where to find your documents',
    hint: 'The figures in Profile come from a handful of documents. Gather them before you start: you will enter them faster.',
    items: [
      {
        doc: 'Statement of participation (QPP)',
        gives: 'Your earnings year by year: the QPP section of Profile.',
        how: 'In My Account (Mon dossier), on the Retraite Québec site.',
        url: 'https://www.retraitequebec.gouv.qc.ca/en/online-services-tools/consulting-statements-participation',
        host: 'Retraite Québec',
      },
      {
        doc: 'CRA account and notice of assessment',
        gives: 'Your RRSP deduction limit and your TFSA contribution room.',
        how: 'In your CRA account, or on the notice you receive after filing your tax return.',
        url: 'https://www.canada.ca/en/revenue-agency/services/e-services/e-services-individuals/account-individuals.html',
        host: 'Canada Revenue Agency',
      },
      {
        doc: 'Employer pension plan statement',
        gives: 'The pension it promises, your years of service and the coordination with the QPP.',
        how: 'From your employer or the plan administrator. For the RREGOP, from Retraite Québec.',
        url: 'https://www.retraitequebec.gouv.qc.ca/en/how-reach-us',
        host: 'Retraite Québec',
      },
      {
        doc: 'Your account statements',
        gives: 'The balance of your RRSPs, TFSAs and non-registered accounts, and the ACB of the latter.',
        how: 'From your financial institution, online or by mail.',
      },
      {
        doc: 'Statement of a VRSP, a LIRA or a LIF',
        gives: 'The locked-in part of your savings.',
        how: 'From the institution or the plan administrator.',
      },
    ] as readonly GlossaryDoc[],
  },
  help: {
    id: 'aller-plus-loin',
    title: 'Going further',
    hint: 'To check Horizon’s answer against the official tools, or to ask a person.',
    items: [
      {
        label: 'Retraite Québec’s tools',
        plain: 'The site gathers the tools that simulate the pension and retirement income, and the way into My Account. Compare their result with Horizon’s.',
        url: 'https://www.retraitequebec.gouv.qc.ca/en/online-services-tools',
        host: 'Retraite Québec',
      },
      {
        label: 'How much OAS you could receive',
        plain: 'The Service Canada page that explains how the OAS and the GIS are worked out. A yardstick for those two amounts.',
        url: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/benefit-amount.html',
        host: 'Service Canada',
      },
      {
        label: 'Reaching Retraite Québec',
        plain: 'Phone numbers and opening hours, depending on whether your question is about the QPP, a public plan or a VRSP.',
        url: 'https://www.retraitequebec.gouv.qc.ca/en/how-reach-us',
        host: 'Retraite Québec',
      },
    ] as readonly GlossaryHelp[],
    advice: 'Horizon gives an estimate, not advice. For advice on your own situation, speak with a financial planner.',
  },
}

export const GLOSSARY_COPY = { fr: FR_GLOSSARY, en: EN_GLOSSARY }
