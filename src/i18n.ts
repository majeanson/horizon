// Bilingual copy, FR-CA first. `typeof FR` is the compile-time parity contract: EN must
// have every key FR has, or tsc fails (src/i18n.en.ts). Register is Québécois, not France
// French (courriel, REER, CELI — and « retraite » is the one word nobody argues about).
//
// Amounts are formatted by lib/money.ts / lib/format.ts, never inline: this file holds
// WORDS. A copy function (`(n) => …`) is fine where a plural or a number rides in a sentence.
import { createContext, useContext, useEffect, useState } from 'react'

export type Lang = 'fr' | 'en'

/** One « where do I find this number » note. `label` is the document's own wording, verbatim, or '' when none is confirmed. */
export interface InfoEntry {
  where: string
  label: string
  /** The page, or '' when the figure lives on the person's own statements (see fieldInfoCopy.test.ts). */
  url: string
  /** True when the link is a professional body's reference, not a government page (the note says so). */
  reference?: boolean
  note: string
}

export const FR = {
  appName: 'Horizon',
  tagline: 'Quand pouvez-vous prendre votre retraite ?',

  next: {
    toAssumptions: 'Suivant : mes hypothèses',
    toResults: 'Voir mes résultats',
    toProfile: 'Compléter mon profil',
    toData: 'Garder une copie de mon profil',
    profileReady: 'Votre profil est assez complet. Reste à choisir ce que vous supposez de l’avenir.',
    assumptionsReady: 'Un scénario est choisi. Les résultats suivent chaque changement.',
    resultsHint: 'Votre profil ne quitte jamais cet appareil : exportez-le pour le garder ou le partager.',
  },

  common: {
    loading: 'Chargement…',
    cancel: 'Annuler',
    save: 'Enregistrer',
    close: 'Fermer',
    delete: 'Supprimer',
    confirmTitle: 'Confirmer',
    clear: 'Effacer le texte',
    whereToFind: 'Où trouver ce chiffre',
    openPage: 'Ouvrir la page officielle',
    projected: 'projeté',
    themeToNight: 'Passer au mode nuit',
    themeToDay: 'Passer au mode jour',
    lang: 'EN',
    langLabel: 'Passer à l’anglais',
    add: 'Ajouter',
    remove: 'Retirer',
    edit: 'Modifier',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    yes: 'oui',
    no: 'non',
  },

  subtabs: {
    prev: 'Défiler vers la gauche',
    next: 'Défiler vers la droite',
  },

  nav: {
    label: 'Navigation principale',
    skip: 'Aller au contenu',
    profile: 'Profil',
    assumptions: 'Hypothèses',
    results: 'Résultats',
    data: 'Données',
  },

  fields: {
    invalid: 'Valeur invalide.',
    range: (min: string, max: string) => `Entre ${min} et ${max}.`,
    years: 'ans',
    infoWhere: 'Où le trouver',
    infoLabel: 'Libellé exact',
    infoOpen: 'Ouvrir la page officielle',
    infoOpenReference: 'Ouvrir la référence (pas une page gouvernementale)',
    infoNoPage: 'Aucune page officielle : ce chiffre vient de vos propres relevés.',
  },

  profile: {
    title: 'Profil',
    subtitle: 'Vos chiffres, saisis à la main. Ils restent sur cet appareil.',
    welcome: {
      title: 'Pour commencer',
      body: 'Trois chiffres suffisent pour un premier verdict ; le reste précise le calcul. Chaque montant a un ⓘ qui dit où le trouver, et rien de ce que vous écrivez ne quitte cet appareil.',
      birth: 'Votre année de naissance',
      birthHint: 'Une valeur par défaut est déjà inscrite : remplacez-la par votre année.',
      salary: 'Votre revenu de travail par année',
      spending: 'Vos dépenses par année, une fois à la retraite',
      done: 'C’est tout ce qu’il faut pour un premier verdict. Le reste de la page le précisera.',
      example: 'Voir un exemple',
    },
    self: 'Moi',
    spouse: 'Conjoint·e',
    family: {
      title: 'Famille',
      spouseOn: 'Planifier avec un·e conjoint·e',
      addSpouse: 'Ajouter un·e conjoint·e',
      removeSpouse: 'Retirer le·la conjoint·e',
      removeSpouseConfirm: 'Retirer le·la conjoint·e ? Ses revenus, ses comptes et ses régimes seront effacés de ce profil.',
      livesAlone: 'Je vis seul·e',
      livesAloneHint:
        'Seul·e dans un logement distinct, toute l’année : c’est la condition du montant pour personne vivant seule (Revenu Québec). Décochez si vous partagez votre logement avec un·e colocataire ou un·e adulte.',
      children: 'Enfants',
      childrenHint: 'Année de naissance seulement. Cette version ne calcule pas de prestations pour enfants.',
      childYear: 'Année de naissance de l’enfant',
      addChild: 'Ajouter un enfant',
      removeChild: (year: number) => `Retirer l’enfant né en ${year}`,
      none: 'Aucun enfant noté.',
    },
    about: {
      title: 'À propos',
      name: 'Prénom (affiché seulement)',
      birthYear: 'Année de naissance',
      birthMonth: 'Mois de naissance (1 à 12)',
      birthHint: 'Le mois fixe la date de la première mensualité de chaque rente : le mois qui suit l’anniversaire.',
      retirementAge: 'Âge où le revenu de travail s’arrête',
      retirementHint: 'Votre plan de départ. Les résultats comparent aussi d’autres âges.',
      salary: 'Revenu de travail annuel actuel',
      salaryHint: 'Avant impôt, en dollars d’aujourd’hui. Il croît ensuite selon l’hypothèse de hausse des salaires.',
    },
    rrq: {
      title: 'Régime de rentes du Québec (RRQ)',
      startAge: 'Âge de début de la rente',
      startHint: 'De 60 à 72 ans. Plus tôt, la rente est réduite ; plus tard, elle est augmentée.',
      earnings: 'Revenus de travail admissibles par année',
      earningsCount: (n: number) => (n === 1 ? '1 année saisie' : `${n} années saisies`),
      earningsHint: 'Recopiez la liste de votre relevé. Une année laissée vide compte pour zéro.',
      earningsYear: (year: number) => `Revenus admissibles de ${year}`,
      fill: 'Estimer les années vides à partir du salaire actuel',
      fillHint: 'Une estimation à corriger : elle déflate votre salaire actuel et ne touche jamais une année déjà saisie.',
      filled: (n: number) => (n === 1 ? '1 année estimée' : `${n} années estimées`),
      nothingToFill: 'Aucune année à estimer : saisissez un salaire d’abord, ou toutes les années sont remplies.',
      statement65: 'Montant projeté du relevé, rente à 65 ans (par mois)',
      statement60: 'Montant projeté du relevé, rente à 60 ans (par mois)',
      statementHint: 'Facultatif. Sert seulement à vérifier le calcul d’Horizon ; il n’entre dans aucun résultat.',
      checkTitle: 'Vérification du calcul',
      checkHorizon: (age: number, amount: string) => `Horizon calcule, pour une rente à ${age} ans : ${amount} par mois.`,
      checkDiff: (amount: string, pct: string) => `Écart avec votre relevé : ${amount} (${pct}).`,
      checkSame: 'Cela rejoint votre relevé.',
      checkNote: 'Horizon suppose que votre salaire actuel reste le même jusqu’à l’âge de début. Un écart de quelques pour cent est normal.',
    },
    oas: {
      title: 'Pension de la Sécurité de la vieillesse (PSV)',
      residentSince: 'Résident du Canada depuis (année)',
      residentHint: 'L’année où vous avez commencé à vivre au Canada, après vos 18 ans. Quarante ans de résidence donnent la pension complète.',
      startAge: 'Âge de début de la PSV',
      startHint: 'De 65 à 70 ans. Chaque mois reporté augmente la pension de 0,6 %.',
    },
    accounts: {
      title: 'Comptes',
      rrsp: 'REER',
      tfsa: 'CELI',
      nonReg: 'Non enregistré',
      balance: 'Solde',
      room: 'Droits de cotisation inutilisés',
      contribution: 'Cotisation annuelle prévue',
      contributionHint: 'En dollars d’aujourd’hui, tant que le revenu de travail dure.',
      acb: 'Coût de base rajusté',
      acbHint: 'Ce que vous avez payé au total, rajusté. Sert à savoir quelle part d’un retrait est un gain imposable.',
    },
  },

  plans: {
    title: 'Régimes de retraite de l’employeur',
    subtitle: 'Les régimes à prestations déterminées : une formule, pas un solde.',
    empty: 'Aucun régime saisi.',
    addRregop: 'Ajouter le RREGOP',
    addOther: 'Ajouter un autre régime',
    addInPay: 'Ajouter une rente en cours',
    inPayAnnual: 'Rente versée en ce moment, par année',
    inPayHint: 'Le montant annuel de votre relevé ou de votre dernier talon, en dollars d’aujourd’hui, après toute réduction : l’outil ne le recalcule pas. Il augmente ensuite chaque janvier selon l’indexation ci-dessous. Si votre rente a commencé cette année, indiquez le mois plus bas : la première hausse est alors réduite au prorata des jours payés. Sans mois, elle est comptée en entier.',
    deferredNotice: (age: number) => `Vous quittez l’emploi à ${age} ans, avant le premier âge où une rente est possible. Cette rente RREGOP a été enregistrée sans la règle de la rente différée.`,
    deferredApply: 'Appliquer la rente différée',
    deferredConfirm: 'La rente sera réduite de 0,5 % par mois jusqu’à vos 65 ans, indexée en entier jusqu’à son début et coordonnée avec le RRQ dès qu’elle commence. Le montant de cette rente change dans vos résultats ; aucun autre champ n’est modifié.',
    deferredConfirmLabel: 'Appliquer',
    deferredDone: 'Rente différée appliquée',
    inPaySince: 'Mois de début de la rente, si c’était cette année (facultatif)',
    inPaySinceHint: 'De 1 (janvier) à 12 (décembre). Laissez vide si la rente a commencé avant cette année : elle a déjà reçu sa première hausse.',
    inPayAfter65: 'Rente versée à partir de 65 ans, par année (facultatif)',
    inPayAfter65Hint: 'Si votre régime est coordonné avec le RRQ, la rente baisse à 65 ans : inscrivez ici le montant annuel après la baisse, en dollars d’aujourd’hui. Laissez vide si elle ne change pas, ou si vous avez déjà passé 65 ans.',
    inPayRules: 'Indexation de la rente',
    inPaySummary: (annual: string) => `rente en cours · ${annual} par année`,
    label: 'Nom du régime',
    service: 'Années de service pour le calcul de la rente (celles de votre relevé, au 31 décembre)',
    serviceRate: 'Service crédité par année travaillée (1 = temps plein)',
    startAge: 'Âge de début de la rente',
    startHint: 'Si vous quittez l’emploi avant 55 ans et sans 35 années de service, c’est une rente différée : elle est réduite de 0,5 % par mois jusqu’à vos 65 ans, indexée en entier jusqu’à son début, et coordonnée avec le RRQ dès qu’elle commence.',
    rules: 'Règles du régime',
    rulesHint: 'Préremplies pour le RREGOP d’après Retraite Québec. Pour un autre régime, recopiez-les de votre livret.',
    accrual: 'Taux d’accumulation par année de service',
    maxService: 'Maximum d’années de service',
    maxServiceNone: 'Aucun maximum',
    averaging: 'Années du salaire moyen',
    earliestAge: 'Âge le plus tôt pour toucher la rente',
    unreducedAge: 'Âge de la rente sans réduction',
    unreducedService: 'Années de service donnant la rente sans réduction, à tout âge',
    factor: 'Facteur âge + service',
    factorMinAge: 'Âge minimal du facteur',
    factorTotal: 'Total à atteindre',
    earlyReduction: 'Réduction par année de départ anticipé',
    coordination: 'Coordination avec le RRQ',
    coordinationRate: 'Taux de coordination',
    coordinationFromAge: 'Début à (âge)',
    coordinationMaxYears: 'Années de service maximum',
    bridge: 'Rente temporaire (pont)',
    bridgeShare: 'Part de la rente',
    bridgeUntil: 'Jusqu’à (âge)',
    indexShare: 'Part de l’inflation accordée',
    indexMinus: 'Ou inflation moins',
    indexHint: 'La rente augmente chaque année du plus élevé des deux : cette part de l’inflation, ou l’inflation moins ce montant.',
    summary: (rate: string, service: string, age: number) => `${rate} par année × ${service} ans · dès ${age} ans`,
    unnamed: 'Régime sans nom',
    removeLabel: (name: string) => `Retirer ${name}`,
    removeConfirm: 'Retirer ce régime ? Sa rente disparaît de la projection ; le reste du profil ne change pas.',
    source: 'Règles du RREGOP : Retraite Québec',
    on: 'Appliquer',
  },

  assumptions: {
    title: 'Hypothèses',
    subtitle: 'Ce que vous supposez de l’avenir. Ce sont vos hypothèses, pas des chiffres officiels.',
    presets: {
      title: 'Scénario',
      hint: 'Un point de départ : inflation, salaires, rendements et horizon d’un coup. Si vous modifiez un chiffre, le scénario devient « Personnalisé ».',
      label: 'Choisir un scénario',
      prudent: 'Prudent',
      neutral: 'Neutre',
      bold: 'Audacieux',
      custom: 'Personnalisé',
      blurb: {
        prudent: 'Rendements plus bas, inflation plus haute, vie plus longue : un plan qui tient ici a de la marge.',
        neutral: 'Le milieu de la route : les hypothèses de projection 2026 de FP Canada et de l’Institut de planification financière.',
        bold: 'Rendements plus hauts, inflation à la cible, vie plus courte : le plan le plus favorable qu’on puisse raisonnablement poser.',
        custom: 'Vos propres chiffres. Choisissez un scénario pour revenir à un point de départ.',
      },
      summary: (inflation: string, wages: string, returns: string, horizon: number) =>
        `Inflation ${inflation} · salaires ${wages} · rendements ${returns} · jusqu’à ${horizon} ans`,
      links: [
        { label: 'Normes d’hypothèses de projection (Institut de planification financière)', url: 'https://institutpf.org/normes-hypotheses-projection' },
        { label: 'Cible d’inflation (Banque du Canada)', url: 'https://www.banqueducanada.ca/grandes-fonctions/politique-monetaire/ententes-relatives-cible-maitrise-inflation/' },
        { label: 'Espérance de vie (Statistique Canada)', url: 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1310011401' },
      ],
      sourceTitle: 'D’où viennent ces chiffres ?',
      source:
        'Neutre : inflation 2,1 %, actions canadiennes 6,3 %, américaines 6,4 %, revenu fixe 3,2 %, croissance du MGA 3,1 % (FP Canada et Institut de planification financière, normes 2026), soit environ 5,1 % pour un mélange 60 / 40, moins 0,6 point de frais estimés. Prudent et Audacieux déplacent ces chiffres d’une marge fixe. Ce sont des hypothèses, ni des chiffres officiels ni des prévisions.',
    },
    impact: {
      whyTitle: 'Pourquoi ça compte :',
      outside: 'Au-delà de ce que couvrent les trois scénarios.',
      level: { below: 'Très bas', low: 'Bas', typical: 'Typique', high: 'Élevé', above: 'Très élevé' },
      tilt: {
        cautious: 'Hypothèse prudente : le plan a de la marge',
        middle: 'Hypothèse centrale',
        optimistic: 'Hypothèse optimiste : le plan en dépend',
      },
      why: {
        inflation: {
          low: 'Les prix montent lentement : vos dépenses grossissent peu et votre épargne garde son pouvoir d’achat. C’est favorable, mais si l’inflation réelle est plus haute, le plan s’épuise plus tôt.',
          typical: 'Les prix suivent la cible de la Banque du Canada (1 à 3 %). Une inflation plus haute fait grossir vos dépenses sans que vos rendements changent.',
          high: 'Les prix montent vite : vos dépenses d’aujourd’hui coûteront bien plus cher plus tard, alors que vos rendements restent les mêmes. L’épargne perd du pouvoir d’achat chaque année.',
        },
        wageGrowth: {
          low: 'Votre salaire progresse peu : la rente du RRQ et celle d’un régime d’employeur, calculées sur vos gains, sont plus petites.',
          typical: 'Le salaire suit la croissance moyenne des gains : le plafond du RRQ a crû d’environ 3,1 % par année de 2016 à 2026.',
          high: 'Votre salaire grimpe vite : les rentes du RRQ et du régime d’employeur, calculées sur vos gains, sont plus grosses. Le plan compte sur des augmentations qui ne sont pas garanties.',
        },
        returns: {
          low: 'L’épargne croît lentement : les retraits entament le capital plus tôt. C’est le levier le plus puissant du plan : un petit écart, composé pendant des décennies, devient énorme.',
          typical: 'À peu près ce que donne un mélange 60 / 40 d’actions et d’obligations après frais. C’est le levier qui pèse le plus sur le plan : un petit écart, composé pendant des décennies, devient énorme.',
          high: 'L’épargne doit croître vite : cela suppose plus d’actions, donc plus de risque, et des frais bas. Le plan repose beaucoup sur cette hypothèse, et un mauvais marché le fait basculer en premier.',
        },
        horizonAge: {
          low: 'Le plan doit tenir moins longtemps : il est plus facile à satisfaire, mais si vous vivez plus vieux l’argent manquera à la fin. Ce choix ne change que la durée : les années d’avant restent identiques.',
          typical: 'Un âge de planification courant, assez loin pour qu’une longue vie ne vous prenne pas au dépourvu. Ce choix ne change que la durée : les années d’avant restent identiques.',
          high: 'Le plan doit durer plus longtemps : chaque année de plus est une année à financer. C’est prudent : mieux vaut un plan qui dure trop qu’un plan trop court. Les années d’avant restent identiques.',
        },
      },
    },
    spending: {
      title: 'Dépenses du ménage',
      working: 'Dépenses annuelles tant que quelqu’un travaille',
      retired: 'Dépenses annuelles une fois tout le monde à la retraite',
      hint: 'En dollars d’aujourd’hui, impôt non compris. Elles suivent ensuite l’inflation.',
    },
    economy: {
      title: 'L’économie',
      inflation: 'Inflation annuelle',
      inflationHint: 'Elle fait croître les dépenses, les rentes indexées et les barèmes fiscaux au-delà de la dernière année publiée.',
      wageGrowth: 'Hausse annuelle des salaires',
      wageHint: 'Elle fait croître votre salaire et les plafonds du RRQ.',
    },
    returns: {
      title: 'Rendement annuel',
      rrsp: 'REER',
      tfsa: 'CELI',
      nonReg: 'Non enregistré',
      hint: 'Avant l’inflation, après les frais. Le rendement du compte non enregistré est traité comme un gain différé.',
    },
    horizon: {
      title: 'Horizon',
      age: 'Le plan doit tenir jusqu’à l’âge de',
      hint: 'L’âge atteint par la personne la plus jeune.',
    },
    order: {
      title: 'Ordre des retraits',
      hint: 'Quand il faut puiser dans l’épargne, on prend d’abord le premier compte, puis le deuxième.',
      position: (n: number) => `${n}.`,
    },
    splitting: {
      title: 'Fractionnement du revenu de pension',
      on: 'Répartir au mieux entre conjoints',
      hint: 'Une personne de 65 ans ou plus peut attribuer jusqu’à la moitié de sa rente de régime d’employeur et de ses retraits de REER à l’autre.',
    },
  },

  results: {
    title: 'Résultats',
    gaps: {
      lead: 'Il manque des chiffres pour un résultat fiable :',
      income: 'aucun revenu, régime ni compte n’est saisi.',
      spending: 'les dépenses à la retraite ne sont pas saisies.',
      toProfile: 'Aller au profil',
      toAssumptions: 'Aller aux hypothèses',
    },
    verdict: {
      caveat: 'Selon ces hypothèses — une estimation, pas un conseil financier.',
      explain: (horizon: number) => `« Tient » : les dépenses sont couvertes chaque année, jusqu’aux ${horizon} ans de la personne la plus jeune.`,
      together: 'Toutes les personnes du ménage prennent leur retraite à cet âge.',
    },
    compare: {
      label: 'Comparer des âges de départ',
      plan: 'Mon plan',
      planHint: 'Chacun part à l’âge indiqué dans le profil.',
      age: (age: number) => `${age} ans`,
      max: 'Quatre comparaisons au plus : retirez-en une pour en ajouter une autre.',
      splitTitle: 'Chacun son âge',
      splitHint: 'Pour un couple : une personne part à un âge, l’autre à un autre. Une carte s’ajoute aux comparaisons ci-dessus.',
      splitFor: (name: string) => `Âge de départ de ${name}`,
      splitSame: 'Deux âges identiques : utilisez plutôt la puce de cet âge.',
      splitAdd: 'Ajouter cette comparaison',
      split: (a: string, ageA: number, b: string, ageB: number) => `${a} ${ageA} ans · ${b} ${ageB} ans`,
    },
    chart: {
      title: 'Votre horizon',
      metric: 'Afficher',
      netWorth: 'Valeur nette',
      income: 'Revenu garanti',
      incomeHint: 'Travail, rentes du régime, RRQ, PSV et SRG, avant impôt — sans puiser dans l’épargne.',
      netWorthHint: 'Tout ce que le ménage possède en fin d’année : REER, CELI et comptes non enregistrés.',
      dollars: 'Dollars',
      today: 'Dollars d’aujourd’hui',
      nominal: 'Dollars de l’année',
      todayHint: 'Chaque année est ramenée au pouvoir d’achat d’aujourd’hui : on voit ce que l’argent vaudra vraiment.',
      nominalHint: 'Les dollars de chaque année, sans correction pour l’inflation.',
      figure: (metric: string, from: number, to: number, names: string) => `${metric} de ${from} à ${to} pour : ${names}.`,
      tooltip: (year: number, ages: string) => `${year} · ${ages}`,
      loading: 'Chargement du graphique…',
    },
    scenario: {
      retireAt: (label: string) => `Départ : ${label}`,
      works: 'Tient jusqu’à l’horizon',
      fails: (year: number) => `Manque dès ${year}`,
      endWorth: (amount: string, unit: string) => `Valeur nette à l’horizon : ${amount} (${unit})`,
    },
    table: {
      title: 'Détail année par année',
      scenario: 'Scénario',
      year: 'Année',
      ages: 'Âges',
      income: 'Revenu brut',
      tax: 'Impôt',
      spending: 'Dépenses',
      shortfall: 'Manque',
      netWorth: 'Valeur nette',
    },
    sensitivity: {
      title: 'Et si l’avenir est un peu moins bon ?',
      hint: 'L’âge au plus tôt quand le rendement, l’inflation ou la longévité changent d’un point ou de cinq ans.',
      running: 'Calcul en cours…',
      returns: 'Rendement',
      inflation: 'Inflation',
      horizon: (age: number) => `Jusqu’à ${age} ans`,
      delta: (points: number) => (points === 0 ? 'prévu' : `${points > 0 ? '+' : '−'}${Math.abs(points)} pt`),
      none: '—',
      note: 'Chaque case est le plus bas âge de départ qui tient.',
    },
    params: {
      title: 'Paramètres utilisés',
      note: 'Chaque chiffre vient d’une page officielle. « Projeté » veut dire : estimé à partir de la dernière année publiée.',
      year: (y: number) => `Année ${y}`,
      source: 'Source',
      figure: 'Chiffre',
      value: 'Valeur',
      retrieved: (date: string) => `consulté le ${date}`,
      toVerify: 'à confirmer',
      count: (n: number) => (n === 1 ? '1 chiffre' : `${n} chiffres`),
      entries: (n: number) => `${n} valeurs`,
      // The page a French reader is sent to when the agency publishes no French edition of it (or the reverse).
      pageIn: (lang: 'fr' | 'en'): string => (lang === 'fr' ? 'page en français seulement' : 'page en anglais seulement'),
    },
  },

  data: {
    title: 'Données',
    privacy: 'Vos données ne quittent jamais cet appareil. Horizon n’a ni compte, ni serveur, ni suivi.',
    export: {
      title: 'Exporter',
      hint: 'Un fichier que vous gardez. Rien n’est envoyé nulle part.',
      button: 'Télécharger mon profil',
      done: 'Profil exporté',
    },
    import: {
      title: 'Importer',
      hint: 'Choisissez un fichier exporté depuis Horizon. Il remplace le profil de cet appareil.',
      button: 'Choisir un fichier',
      confirm: 'Importer ce fichier ? Le profil de cet appareil sera remplacé par celui du fichier ; sans export, l’ancien ne se récupère pas.',
      confirmLabel: 'Importer',
      done: 'Fichier importé',
      notJson: 'Ce fichier n’est pas un document JSON lisible.',
      newer: 'Ce fichier vient d’une version plus récente d’Horizon.',
      problems: 'Ce fichier semble incomplet ou modifié. Voici ce que l’application n’a pas pu lire (nom technique du champ — problème) :',
      problem: {
        missing: 'manquant',
        type: 'mauvais type de valeur',
        range: 'hors des limites permises',
        enum: 'valeur non permise',
        count: 'nombre non permis',
      },
    },
    example: {
      title: 'Exemple',
      hint: 'Charge un foyer fictif pour voir à quoi ressemble un résultat. Sept cas, pour comparer.',
      confirm: (name: string) => `Charger « ${name} » ? Le profil de cet appareil sera remplacé par un foyer fictif ; sans export, l’ancien ne se récupère pas.`,
      confirmLabel: 'Charger',
      done: 'Exemple chargé',
    },
    clear: {
      title: 'Effacer',
      hint: 'Retire le profil et les hypothèses de cet appareil.',
      button: 'Tout effacer',
      confirm: 'Tout effacer ? Le profil et les hypothèses seront retirés de cet appareil ; sans export, rien ne les ramène.',
      confirmLabel: 'Tout effacer',
      done: 'Données effacées',
    },
    issue: {
      unavailable: 'Ce navigateur ne conserve pas les données (navigation privée ?). Exportez votre profil avant de fermer la page.',
      unreadable: 'Le profil enregistré était illisible. Une copie en est gardée sur cet appareil (page Données : « Copie illisible »), et un profil vierge a été chargé.',
      newer: 'Le profil enregistré vient d’une version plus récente d’Horizon : il n’a pas pu être lu ici. Une copie en est gardée sur cet appareil (page Données : « Copie illisible »), et un profil vierge a été chargé.',
      unsaved: 'Un chiffre dépasse les limites permises : le profil n’a pas été enregistré. Corrigez le chiffre en cause.',
      conflict: 'Un autre onglet a enregistré pendant votre saisie : sa version a été reprise, et votre dernière modification n’a pas été conservée.',
    },
    rescue: {
      title: 'Copie illisible',
      hint: 'Le profil que cet appareil n’a pas pu lire est resté sur place. Téléchargez-le avant d’effacer quoi que ce soit : un fichier de cette sorte se répare souvent à la main.',
      button: 'Télécharger la copie illisible',
      older: 'Télécharger la copie illisible précédente',
    },
    display: {
      title: 'Affichage',
      hint: 'Réglé pour cet appareil seulement, comme le thème en haut de page. Au-delà de ces réglages, le zoom du navigateur fonctionne toujours.',
      contrast: 'Contraste',
      contrastNormal: 'Normal',
      contrastHigh: 'Renforcé',
      textSize: 'Taille du texte',
      textSizes: { normal: '100 %', large: '115 %', 'x-large': '130 %' },
    },
    build: (version: string) => `Version ${version}`,
    kit: 'Galerie des composants',
  },

  // « Où trouver ce chiffre » — every entry's wording was read on the official page it names (the research is
  // in STATE.md); `label` is the document's own wording, verbatim, or '' where none is confirmed.
  info: {
    earnings: {
      where: 'Retraite Québec ▸ Mon dossier ▸ Relevé de participation au Régime de rentes du Québec.',
      label: 'B – Revenus de travail admissibles',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/travail/emploi-et-regime-rentes-quebec/releve-participation-regime-rentes-quebec',
      note: 'Les années sous 3 500 $ y paraissent à 0 $, et les dernières années peuvent manquer : Revenu Québec les déclare avec du retard.',
    },
    rrqEstimate65: {
      where: 'Le même relevé, « Estimation des prestations » ▸ « Rente de retraite » : la ligne « 60 ans » ou « 65 ans », colonne « Montant projeté ». Le relevé n’écrit pas l’unité de ce tableau ; Horizon la lit comme un montant mensuel.',
      label: 'A – Estimation de votre rente de retraite (« Montant projeté »)',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/travail/emploi-et-regime-rentes-quebec/releve-participation-regime-rentes-quebec',
      note: 'Le relevé donne deux scénarios : « Montant actuel » (si vous cessiez de cotiser aujourd’hui) et « Montant projeté » (si vous continuiez avec des revenus semblables). Prenez le projeté. Attention : le relevé le dit lui-même, son estimation ne tient compte que du premier volet de la bonification (pas du deuxième, en vigueur depuis 2024), et il n’indique pas en dollars de quelle année sont ses montants : l’écart affiché est un ordre de grandeur, pas une erreur.',
    },
    rrqEstimate60: {
      where: 'Le même relevé, « Estimation des prestations » ▸ « Rente de retraite » : la ligne « 60 ans » ou « 65 ans », colonne « Montant projeté ». Le relevé n’écrit pas l’unité de ce tableau ; Horizon la lit comme un montant mensuel.',
      label: 'A – Estimation de votre rente de retraite (« Montant projeté »)',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/travail/emploi-et-regime-rentes-quebec/releve-participation-regime-rentes-quebec',
      note: 'Si le relevé ne montre pas l’âge de 60 ans, laissez ce champ vide : le chiffre de 65 ans suffit pour vérifier le calcul.',
    },
    rrqStartAge: {
      where: 'C’est votre choix : aucune pièce ne l’imprime. La page officielle montre l’effet de chaque mois plus tôt ou plus tard.',
      label: '',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/retraite-et-planification/demandez-rente-retraite/rente-retraite-regime-rentes-quebec/quel-age-devriez-vous-demander-rente-retraite',
      note: 'Avant 65 ans la rente est réduite de 0,5 % à 0,6 % par mois ; après 65 ans, elle augmente de 0,7 % par mois, jusqu’à 72 ans.',
    },
    oasResidence: {
      where: 'Le nombre d’années vécues au Canada depuis vos 18 ans : 40 ans donnent la pension complète, chaque année en vaut 1/40. L’Estimateur des prestations de la Sécurité de la vieillesse de Service Canada pose d’abord, à l’étape 4 (résidence), une question oui / non : avez-vous toujours vécu au Canada depuis vos 18 ans, vous et votre partenaire ? Comptez vos années vous-même.',
      label: '',
      url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/montant-prestation.html',
      note: 'Il faut au moins 10 ans de résidence (20 si vous vivez à l’étranger) pour toucher une pension.',
    },
    oasStartAge: {
      where: 'C’est votre choix, de 65 à 70 ans : aucune pièce ne l’imprime. La page officielle « Quand commencer à recevoir votre pension » explique le report.',
      label: '',
      url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/quand-debut.html',
      note: 'Chaque mois de report augmente la pension de 0,6 %, jusqu’à 36 % à 70 ans.',
    },
    salary: {
      where: 'Votre dernier talon de paie, ou le feuillet de revenus d’emploi de l’an dernier (T4 ou Relevé 1).',
      label: '',
      url: '',
      note: 'Le revenu avant impôt et avant toute déduction.',
    },
    rrspBalance: {
      where: 'Le relevé de votre institution financière, au dernier jour du mois.',
      label: '',
      url: '',
      note: 'Additionnez tous vos REER, y compris ceux de l’employeur que vous pouvez retirer.',
    },
    rrspRoom: {
      where: 'Votre dernier avis de cotisation de l’ARC (relevé du maximum déductible au titre des REER), ou votre compte de l’ARC.',
      label: 'Maximum déductible au titre des REER',
      url: 'https://www.canada.ca/fr/agence-revenu/services/formulaires-publications/publications/t4040/reer-autres-regimes-enregistres-retraite.html',
      note: 'Ce maximum est déjà réduit du facteur d’équivalence de votre régime d’employeur : ne le soustrayez pas une seconde fois. Ajoutez-y vos cotisations inutilisées déclarées lors d’une année passée.',
    },
    tfsaBalance: {
      where: 'Le relevé de votre institution financière, au dernier jour du mois.',
      label: '',
      url: '',
      note: 'Additionnez tous vos CELI.',
    },
    tfsaRoom: {
      where: 'Compte de l’ARC ▸ Régimes d’épargne et de pension ▸ Afficher les détails du CELI ▸ Droits de cotisation.',
      label: 'Droits de cotisation',
      url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/compte-epargne-libre-impot/cotiser/calculer-droits.html',
      note: 'L’ARC recommande de vérifier avec vos propres relevés : son compte n’est mis à jour qu’une fois par année. Le sommaire du compte écrit « Au 1er janvier » de l’année : les cotisations et retraits faits depuis n’y sont pas.',
    },
    nonRegBalance: {
      where: 'Le relevé de votre institution financière, au dernier jour du mois.',
      label: '',
      url: '',
      note: 'La valeur marchande de tous vos placements hors REER et CELI.',
    },
    nonRegAcb: {
      where: 'Les relevés de votre courtier (feuillet T5008, case 20 « Coût ou valeur comptable ») et son rapport de coût de base.',
      label: 'Prix de base rajusté (PBR)',
      url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-votre-declaration-revenus/declaration-revenus/remplir-declaration-revenus/revenu-personnel/ligne-12700-gains-capital/calculer-declarer-vos-gains-pertes-capital.html',
      note: 'L’ARC précise que la case 20 peut ne pas refléter le prix de base rajusté : au besoin, ajustez-la.',
    },
    dbService: {
      where: 'RREGOP : Retraite Québec ▸ Mon dossier ▸ Relevé de participation ▸ tableau « Années de service et cotisations », dernière ligne (le cumulatif).',
      label: 'Années de service pour le calcul de votre rente',
      url: 'https://www.retraitequebec.gouv.qc.ca/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/fr/services-en-ligne/exemple-releve-de-participation.pdf',
      note: 'Prenez la colonne du calcul de la rente, pas celle de l’admissibilité : les deux diffèrent. Autre régime : le relevé annuel de votre employeur.',
    },
    dbRules: {
      where: 'Le livret ou la page officielle de votre régime. Pour le RREGOP, la page « Le RREGOP » de Retraite Québec.',
      label: '',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/publications/regimes-retraite-secteur-public/rregop',
      note: 'Chaque régime écrit ses propres règles : recopiez-les du vôtre, ne devinez pas.',
    },
    dbCoordination: {
      where: 'Le livret de votre régime. Pour le RREGOP : « Le calcul de la diminution applicable à votre rente due à la coordination avec le RRQ ».',
      label: 'taux annuel de coordination de la rente avec le RRQ (0,7 %)',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/publications/regimes-retraite-secteur-public/rregop',
      note: 'La rente du régime baisse à partir de 65 ans, même si vous avez demandé la rente du RRQ plus tôt.',
    },
    spendingWorking: {
      where: 'Vos relevés de carte et de banque des 12 derniers mois, sans l’impôt ni l’épargne.',
      label: '',
      url: '',
      note: 'Logement, nourriture, transport, assurances, loisirs, dons : tout ce que le ménage dépense.',
    },
    spendingRetired: {
      where: 'Partez de vos dépenses actuelles, puis retranchez ce qui disparaît (épargne, transport au travail) et ajoutez ce qui arrive (santé, loisirs).',
      label: '',
      url: '',
      note: 'Sans l’impôt : Horizon le calcule.',
    },
    inflation: {
      where: 'La cible officielle de la Banque du Canada est de 2 %, au milieu d’une fourchette de 1 % à 3 %. Pour votre propre inflation, comparez vos dépenses d’une année à l’autre.',
      label: '',
      url: 'https://www.banqueducanada.ca/grandes-fonctions/politique-monetaire/ententes-relatives-cible-maitrise-inflation/',
      note: 'Le scénario Neutre retient 2,1 % (normes de projection 2026 de FP Canada et de l’Institut de planification financière), Prudent 2,5 % et Audacieux 2,0 %.',
    },
    wageGrowth: {
      where: 'Retraite Québec publie le maximum des gains admissibles (MGA) de chaque année, de 1966 à 2026 : 74 600 $ en 2026. Le rapport entre deux années donne la hausse des salaires.',
      label: '',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime-rentes-quebec/travail-et-cotisations/revenus-travail-admissibles-et-cotisations',
      note: 'De 2016 (54 900 $) à 2026 (74 600 $), le MGA a crû d’environ 3,1 % par année ; les normes 2026 retiennent 3,1 % aussi, et le scénario Neutre de même.',
    },
    returns: {
      where: 'Le rendement de chaque compte figure sur le relevé annuel de votre courtier ou de votre assureur (« rendement personnel » ou taux annualisé) ; leurs frais, sur le rapport annuel sur les frais.',
      label: '',
      url: 'https://institutpf.org/normes-hypotheses-projection',
      reference: true,
      note: 'Pour projeter, utilisez un rendement net des frais. Les normes 2026 donnent des rendements avant frais (actions canadiennes 6,3 %, américaines 6,4 %, revenu fixe 3,2 %) et demandent d’en soustraire les frais payés. L’Institut est un organisme professionnel, pas un ministère.',
    },
    horizonAge: {
      where: 'Aucun document ne l’imprime : c’est un choix prudent. Statistique Canada publie l’espérance de vie, par province et par sexe, dans sa table 13-10-0114-01.',
      label: '',
      url: 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1310011401',
      note: 'La table donne une moyenne : la moitié des gens vivent plus longtemps. D’où un horizon plus loin que la moyenne ; Prudent va jusqu’à 100 ans, Neutre 95, Audacieux 90.',
    },
  } satisfies Record<string, InfoEntry>,
}

export type InfoId = keyof typeof FR.info

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'fr',
  setLang: () => {},
})
export const useLang = () => useContext(LangContext)

// EN cache + a single in-flight promise so N concurrent useT() callers trigger exactly ONE
// dynamic import, not one per mount.
let cachedEN: typeof FR | null = null
let enPromise: Promise<typeof FR> | null = null
function loadEN(): Promise<typeof FR> {
  if (!enPromise) enPromise = import('./i18n.en').then((m) => (cachedEN = m.EN))
  return enPromise
}

export function useT(): typeof FR {
  const { lang } = useLang()
  // FR first (even if the saved lang is 'en' and EN has not resolved yet) — the first frame
  // is never blocked on a network/parse round trip.
  const [dict, setDict] = useState<typeof FR>(() => (lang === 'en' && cachedEN) || FR)
  useEffect(() => {
    if (lang !== 'en') {
      setDict(FR)
      return
    }
    if (cachedEN) {
      setDict(cachedEN)
      return
    }
    let alive = true
    loadEN().then((en) => {
      if (alive) setDict(en)
    })
    return () => {
      alive = false
    }
  }, [lang])
  return dict
}
