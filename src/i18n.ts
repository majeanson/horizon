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
  tagline: 'Quand pouvez-vous prendre votre retraite ?',

  next: {
    toResults: 'Voir mon résultat',
    toProfile: 'Compléter mon profil',
    adjustAssumptions: 'Ajuster mes hypothèses',
    profileReady: 'Votre profil est assez complet pour une réponse. Vous pourrez le préciser ensuite, document par document.',
    assumptionsReady: 'Un scénario est choisi. La réponse suit chaque changement.',
    resultsHint: 'Changez de scénario ou un chiffre : la réponse suit.',
  },

  common: {
    loading: 'Chargement…',
    cancel: 'Annuler',
    save: 'Enregistrer',
    close: 'Fermer',
    less: 'Moins',
    more: 'Plus',
    delete: 'Supprimer',
    confirmTitle: 'Confirmer',
    clear: 'Effacer le texte',
    whereToFind: 'Où trouver ce chiffre',
    openPage: 'Ouvrir la page officielle',
    projected: 'projeté',
    themeToNight: 'Passer au mode nuit',
    themeToDay: 'Passer au mode jour',
    updateReady: 'Une nouvelle version d’Horizon est prête.',
    updateReload: 'Recharger',
    lang: 'EN',
    langLabel: 'Passer à l’anglais',
    add: 'Ajouter',
    remove: 'Retirer',
    edit: 'Modifier',
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
    data: 'Sauvegarde et réglages',
  },

  fields: {
    invalid: 'Entrez un nombre.',
    range: (min: string, max: string) => `Entre ${min} et ${max}.`,
    years: 'ans',
    infoWhere: 'Où le trouver',
    infoLabel: 'Libellé exact',
    infoOpen: 'Ouvrir la page officielle',
    infoOpenReference: 'Ouvrir la référence (pas une page gouvernementale)',
    infoNoPage: 'Aucune page officielle : ce chiffre vient de vos propres relevés.',
  },

  profile: {
    title: 'Profil',
    subtitle: 'Vos chiffres, saisis à la main. Ils restent sur cet appareil.',
    welcome: { title: 'Pour commencer' },
    self: 'Moi',
    spouse: 'Partenaire',
    budget: {
      title: 'Budget',
      working: 'Dépenses par année, tant que quelqu’un travaille',
      retired: 'Dépenses par année, une fois tout le monde à la retraite',
      hint: 'En dollars d’aujourd’hui, impôt non compris. Elles suivent ensuite l’inflation.',
    },
    home: {
      title: 'Résidence principale',
      hint: 'La maison est une richesse hors de vos comptes ; l’hypothèque, une dépense qui prend fin. Saisies ici, elles n’alourdissent pas vos dépenses à la retraite.',
      none: 'Aucune résidence n’est comptée.',
      own: 'Je possède ma résidence principale',
      value: 'Valeur de la maison aujourd’hui',
      valueHint: 'Ce qu’elle se vendrait. Elle garde ensuite sa valeur réelle (elle suit l’inflation) : ce n’est pas une prévision.',
      balance: 'Solde de l’hypothèque',
      rate: 'Taux de l’hypothèque (annuel)',
      rateHint: 'Le taux inscrit à votre contrat d’hypothèque.',
      payment: 'Paiement mensuel',
      years: (n: number) => (n === 1 ? 'un an' : `${n} ans`),
      payoff: (year: string, years: string) => `Hypothèque payée en ${year}, dans ${years} : ce paiement cesse alors.`,
      noPayoff: 'À ce paiement, l’hypothèque ne se rembourse jamais : il ne couvre pas les intérêts.',
      paidOff: 'Aucune hypothèque : la maison est payée.',
      equity: (amount: string) => `Valeur nette aujourd’hui : ${amount}. Comptée à part, jamais tirée, sauf vente.`,
      sell: 'Vendre ou réduire à un certain âge',
      sellAge: 'Âge de la vente (première personne)',
      sellHint: 'La maison est vendue : l’hypothèque est remboursée, un logement plus petit est acheté (ou vous louez) et le reste va dans le compte non enregistré.',
      replacement: 'Coût du logement de remplacement (aujourd’hui)',
      replacementHint: '0 $ si vous louez. S’il dépasse ce que la vente libère, la différence est payée par les dépenses de cette année-là.',
      remove: 'Retirer la résidence',
      removeConfirm: 'Retirer la résidence ? La valeur, l’hypothèque et la vente prévue seront effacées.',
    },
    family: {
      title: 'Famille',
      addSpouse: 'Ajouter mon ou ma partenaire',
      removeSpouse: 'Retirer mon ou ma partenaire',
      removeSpouseConfirm: 'Retirer votre partenaire ? Ses revenus, ses comptes et ses régimes seront effacés de ce profil.',
      livesAlone: 'Je vis seul ou seule',
      livesAloneHint: 'Seul ou seule dans un logement à vous, toute l’année : cela donne droit à un crédit d’impôt du Québec. Décochez si vous partagez votre logement avec un autre adulte.',
      children: 'Enfants',
      childrenHint: 'Année de naissance seulement. Dites plus bas ce que coûte un enfant : quand il quitte la maison, vos dépenses baissent.',
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
      birthHint: 'Le mois fixe la date de la première mensualité de chaque rente : le mois qui suit l’anniversaire.',
      retirementAge: 'Âge de retraite visé',
      retirementHint: 'L’âge où votre revenu de travail s’arrête. La réponse compare aussi d’autres âges.',
      salary: 'Revenu de travail par année',
      salaryHint: 'Avant impôt, en dollars d’aujourd’hui. Il suit ensuite la hausse des salaires de vos hypothèses.',
    },
    rrq: {
      title: 'Régime de rentes du Québec (RRQ)',
      startAge: 'Âge de début de la rente',
      startHint: 'De 60 à 72 ans. Plus tôt, la rente est réduite ; plus tard, elle est augmentée.',
      earnings: 'Revenus de travail admissibles par année',
      earningsCount: (n: number, total: number) => (n === 1 ? `1 année saisie sur ${total}` : `${n} années saisies sur ${total}`),
      colYear: 'Année',
      colAmount: 'Revenus ($)',
      earningsHint: 'Recopiez la liste de votre relevé de participation (Retraite Québec). Une année laissée vide compte pour zéro.',
      earningsYear: (year: number) => `Revenus admissibles de ${year}`,
      fill: 'Estimer les années vides à partir du salaire actuel',
      fillHint: 'Une estimation à corriger : on part de votre salaire actuel, ramené aux années passées, sans toucher une année déjà saisie. Le RRQ ne compte chaque année que jusqu’à un maximum, indiqué en face.',
      capped: (amount: string) => `compte jusqu’à ${amount}`,
      filled: (n: number) => (n === 1 ? '1 année estimée' : `${n} années estimées`),
      fillUndo: 'Retirer les années estimées',
      nothingToFill: 'Aucune année à estimer : saisissez un salaire d’abord, ou toutes les années sont remplies.',
    },
    oas: {
      title: 'Pension de la Sécurité de la vieillesse (PSV)',
      residentSince: 'Au Canada depuis (année)',
      sinceBirth: 'Depuis la naissance',
      residentHint: 'Né ou née ici : touchez « Depuis la naissance ». Sinon, l’année de votre arrivée. Quarante ans de résidence après 18 ans donnent la pension complète.',
      startAge: 'Âge de début de la PSV',
      startHint: 'De 65 à 70 ans. Chaque mois reporté augmente la pension de 0,6 %.',
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
      acb: 'Prix de base rajusté (PBR)',
      acbHint: 'Ce que vous avez payé au total, rajusté. Sert à savoir quelle part d’un retrait est un gain imposable.',
      lockedToggle: 'Une partie est immobilisée (bloquée jusqu’à la retraite : RVER d’employeur, CRI, FRV)',
      locked: 'Dont immobilisé',
      lockedHint: 'Compris dans le solde ci-dessus. Avant 55 ans, cette part ne sort qu’en petits montants.',
      employerContribution: 'Cotisation de l’employeur par année',
      employerHint: 'RVER : ce que l’employeur verse, en dollars d’aujourd’hui. Immobilisé, sans sortir de votre poche, pris sur vos droits REER.',
    },
  },

  plans: {
    title: 'Régimes de retraite de l’employeur',
    subtitle: 'Les régimes à prestations déterminées : une formule, pas un solde.',
    empty: 'Aucun régime saisi.',
    addRregop: 'Ajouter le RREGOP',
    addOther: 'Ajouter un autre régime',
    addInPay: 'Ajouter une rente en cours',
    inPayAnnual: 'Rente versée en ce moment, par année',
    inPayHint: 'Le montant annuel de votre relevé ou de votre dernier talon, en dollars d’aujourd’hui, après toute réduction : l’outil ne le recalcule pas. Il augmente ensuite chaque janvier selon l’indexation ci-dessous.',
    deferredNotice: (age: number) => `Vous quittez l’emploi à ${age} ans, avant le premier âge où une rente est possible : la règle de la rente différée du RREGOP s’applique, mais elle n’est pas encore appliquée à cette rente.`,
    deferredApply: 'Appliquer la rente différée',
    deferredConfirm: 'La rente sera réduite de 0,5 % par mois jusqu’à vos 65 ans, indexée en entier jusqu’à son début et coordonnée avec le RRQ dès qu’elle commence. Seul le montant de cette rente change dans votre réponse.',
    deferredConfirmLabel: 'Appliquer cette règle',
    deferredDone: 'Rente différée appliquée',
    inPayRules: 'Indexation de la rente',
    inPaySummary: (annual: string) => `rente en cours · ${annual} par année`,
    label: 'Nom du régime',
    service: 'Années de service pour le calcul de la rente (celles de votre relevé, au 31 décembre)',
    serviceRate: 'Service crédité par année travaillée (1 = temps plein)',
    startAge: 'Âge de début de la rente',
    startHint: 'Si vous quittez l’emploi avant 55 ans et sans 35 années de service, c’est une rente différée : elle est réduite de 0,5 % par mois jusqu’à vos 65 ans, indexée en entier jusqu’à son début, et coordonnée avec le RRQ dès qu’elle commence.',
    rules: 'Règles du régime',
    rulesHint: 'Préremplies pour le RREGOP d’après Retraite Québec. Pour un autre régime, recopiez-les de votre livret.',
    accrual: 'Taux d’accumulation par année de service',
    accrualHint: 'Le pourcentage de la formule de rente de votre livret — souvent la ligne « taux d’accumulation ».',
    maxService: 'Maximum d’années de service',
    maxServiceNone: 'Aucun maximum',
    averaging: 'Années du salaire moyen',
    averagingHint: 'Le nombre d’années du « salaire moyen » de la formule (les meilleures années).',
    earliestAge: 'Âge le plus tôt pour toucher la rente',
    earliestAgeHint: 'L’âge le plus tôt où votre livret permet de commencer la rente, même réduite.',
    unreducedAge: 'Âge de la rente sans réduction',
    unreducedAgeHint: 'L’âge « sans réduction » (ou « sans pénalité ») de votre livret.',
    unreducedService: 'Années de service donnant la rente sans réduction, à tout âge',
    unreducedServiceHint: 'Si le livret offre cette voie, le nombre d’années qui l’ouvre ; sinon, laissez vide.',
    factor: 'Facteur âge + service',
    factorMinAge: 'Âge minimal du facteur',
    factorTotal: 'Total à atteindre',
    earlyReduction: 'Réduction par année de départ anticipé',
    earlyReductionHint: 'Souvent écrite PAR MOIS dans le livret : multipliez par 12 pour l’année.',
    coordination: 'Coordination avec le RRQ',
    coordinationRate: 'Taux de coordination',
    coordinationFromAge: 'Début à (âge)',
    coordinationMaxYears: 'Années de service maximum',
    bridge: 'Rente temporaire (pont)',
    bridgeShare: 'Part de la rente',
    bridgeUntil: 'Jusqu’à (âge)',
    indexShare: 'Part de l’inflation accordée',
    indexMinus: 'Ou inflation moins',
    survivorShare: 'Part versée au conjoint survivant',
    survivorShareHint: 'À votre décès, la part de votre rente que le régime verse à votre conjoint, sa vie durant. RREGOP : 50 %, ou 60 % contre une rente réduite de 2 %.',
    indexHint: 'La rente augmente chaque année du plus élevé des deux : cette part de l’inflation, ou l’inflation moins ce montant.',
    summary: (rate: string, service: string, age: number) => `${rate} par année × ${service} ans · dès ${age} ans`,
    unnamed: 'Régime sans nom',
    removeLabel: (name: string) => `Retirer ${name}`,
    removeConfirm: 'Retirer ce régime ? Sa rente ne sera plus comptée dans votre réponse ; le reste du profil ne change pas.',
    source: 'Règles du RREGOP : Retraite Québec',
    on: 'Appliquer ces règles',
  },

  assumptions: {
    title: 'Hypothèses',
    subtitle: 'Ce que vous supposez de l’avenir. Le scénario Neutre est déjà en place : rien à changer ici pour une première réponse.',
    presets: {
      title: 'Scénario',
      hint: 'Un point de départ pour l’inflation, les salaires, les rendements et l’âge de fin du plan. Changez un chiffre et le scénario devient « Personnalisé ».',
      label: 'Choisir un scénario',
      prudent: 'Prudent',
      neutral: 'Neutre',
      bold: 'Audacieux',
      custom: 'Personnalisé',
      confirmReplace: (name: string) => `Un scénario Personnalisé est déjà gardé de côté. Garder plutôt vos valeurs actuelles — inflation, salaires, rendements, horizon — avant de passer au scénario ${name} ? L’ancien Personnalisé sera remplacé.`,
      kept: 'Vos valeurs personnalisées sont gardées : touchez « Personnalisé » pour y revenir.',
      keptSummary: (summary: string) => `Personnalisé gardé : ${summary}`,
      confirmLabel: 'Remplacer',
      blurb: {
        prudent: 'Rendements plus bas, inflation plus haute, vie plus longue : un plan qui tient ici a de la marge.',
        neutral: 'Le milieu de la route : les hypothèses de projection 2026 de FP Canada et de l’Institut de planification financière.',
        bold: 'Rendements plus hauts, inflation à la cible, vie plus courte : le plan le plus favorable qu’on puisse raisonnablement poser.',
        custom: 'Vos propres chiffres. Choisissez un scénario pour revenir à un point de départ.',
      },
      summary: (inflation: string, wages: string, returns: string, horizon: number) =>
        `Inflation ${inflation} · salaires ${wages} · rendements ${returns} · jusqu’à ${horizon} ans`,
      links: [
        { label: 'Normes d’hypothèses de projection (Institut de planification financière)', url: 'https://institutpf.org/normes-hypotheses-projection' },
        { label: 'Cible d’inflation (Banque du Canada)', url: 'https://www.banqueducanada.ca/grandes-fonctions/politique-monetaire/ententes-relatives-cible-maitrise-inflation/' },
        { label: 'Espérance de vie (Statistique Canada)', url: 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1310011401' },
      ],
      sourceTitle: 'D’où viennent ces chiffres ?',
      source:
        'Neutre : inflation 2,1 %, actions canadiennes 6,3 %, américaines 6,4 %, revenu fixe 3,2 %, croissance du MGA 3,1 % (FP Canada et Institut de planification financière, normes 2026), soit environ 5,1 % pour un mélange 60 / 40, moins 0,6 point de frais estimés. Prudent et Audacieux déplacent ces chiffres d’une marge fixe. Ce sont des hypothèses, ni des chiffres officiels ni des prévisions.',
    },
    impact: {
      whyTitle: 'Pourquoi ça compte :',
      outside: 'Au-delà de ce que couvrent les trois scénarios.',
      level: { below: 'Très bas', low: 'Bas', typical: 'Typique', high: 'Élevé', above: 'Très élevé' },
      tilt: {
        cautious: 'Hypothèse prudente : le plan a de la marge',
        middle: 'Hypothèse centrale',
        optimistic: 'Hypothèse optimiste : le plan en dépend',
      },
      why: {
        inflation: {
          low: 'Les prix montent lentement : vos dépenses grossissent peu et votre épargne garde son pouvoir d’achat. C’est favorable, mais si l’inflation réelle est plus haute, le plan s’épuise plus tôt.',
          typical: 'Les prix suivent la cible de la Banque du Canada (1 à 3 %). Une inflation plus haute fait grossir vos dépenses sans que vos rendements changent.',
          high: 'Les prix montent vite : vos dépenses d’aujourd’hui coûteront bien plus cher plus tard, alors que vos rendements restent les mêmes. L’épargne perd du pouvoir d’achat chaque année.',
        },
        wageGrowth: {
          low: 'Votre salaire progresse peu : la rente du RRQ et celle d’un régime d’employeur, calculées sur vos gains, sont plus petites.',
          typical: 'Le salaire suit la croissance moyenne des gains : le plafond du RRQ a crû d’environ 3,1 % par année de 2016 à 2026.',
          high: 'Votre salaire grimpe vite : les rentes du RRQ et du régime d’employeur, calculées sur vos gains, sont plus grosses. Le plan compte sur des augmentations qui ne sont pas garanties.',
        },
        returns: {
          low: 'L’épargne croît lentement : les retraits entament le capital plus tôt. C’est le levier le plus puissant du plan : un petit écart, composé pendant des décennies, devient énorme.',
          typical: 'À peu près ce que donne un mélange 60 / 40 d’actions et d’obligations après frais. C’est le levier qui pèse le plus sur le plan : un petit écart, composé pendant des décennies, devient énorme.',
          high: 'L’épargne doit croître vite : cela suppose plus d’actions, donc plus de risque, et des frais bas. Le plan repose beaucoup sur cette hypothèse, et un mauvais marché le fait basculer en premier.',
        },
        horizonAge: {
          low: 'Le plan doit tenir moins longtemps : il est plus facile à satisfaire, mais si vous vivez plus vieux l’argent manquera à la fin. Ce choix ne change que la durée : les années d’avant restent identiques.',
          typical: 'Un âge de planification courant, assez loin pour qu’une longue vie ne vous prenne pas au dépourvu. Ce choix ne change que la durée : les années d’avant restent identiques.',
          high: 'Le plan doit durer plus longtemps : chaque année de plus est une année à financer. C’est prudent : mieux vaut un plan qui dure trop qu’un plan trop court. Les années d’avant restent identiques.',
        },
      },
    },
    economy: {
      title: 'Hausse des prix et des salaires',
      inflation: 'Hausse des prix (inflation), par année',
      inflationHint: 'Elle fait monter vos dépenses, les rentes indexées et les tranches d’impôt.',
      wageGrowth: 'Hausse des salaires, par année',
      wageHint: 'Elle fait croître votre salaire et les plafonds du RRQ.',
    },
    returns: {
      title: 'Ce que rapportent vos placements',
      all: 'Rendement annuel, tous les comptes',
      perAccount: 'Un taux par compte',
      rrsp: 'REER',
      tfsa: 'CELI',
      nonReg: 'Non enregistré',
      hint: 'Avant l’inflation, après les frais.',
    },
    horizon: {
      title: 'Jusqu’à quel âge planifier',
      age: 'L’argent doit durer jusqu’à l’âge de',
      person: (name: string) => `${name} vit jusqu’à l’âge de`,
      hint: 'Chacun son âge. Le plan dure jusqu’au dernier ; dans un couple, le premier décès fait passer la maison aux règles de la personne qui reste. Mieux vaut un plan qui dure trop longtemps qu’un plan trop court.',
      follow: (age: number) => `Comme le scénario (${age} ans)`,
      followHint: 'Sans âge à soi, la personne suit celui du scénario.',
      survivor: 'Dépenses de la personne qui reste',
      survivorHint: 'Après le premier décès, la part des dépenses du ménage que garde la personne qui reste.',
    },
    options: { title: 'Options' },
    splitting: {
      on: 'Partager les rentes entre conjoints',
      hint: 'À partir de 65 ans, une personne peut attribuer jusqu’à la moitié de sa rente d’employeur et de ses retraits de REER à l’autre : l’impôt du couple baisse.',
    },
  },

  results: {
    title: 'Résultats',
    gaps: {
      lead: 'Il manque des chiffres pour un résultat fiable :',
      income: 'aucun revenu, régime ni compte n’est saisi.',
      spending: 'les dépenses à la retraite ne sont pas saisies.',
      toProfile: 'Aller au profil',
      toAssumptions: 'Aller aux hypothèses',
    },
    verdict: {
      caveat: 'Selon ces hypothèses — une estimation, pas un conseil financier.',
    },
    compare: {
      label: 'Comparer des âges de départ',
      planAt: (ages: string) => `Mon plan (${ages} ans)`,
      planHint: 'Chacun part à l’âge indiqué dans le profil.',
      age: (age: number) => `${age} ans`,
      otherAge: 'Autre âge',
      max: 'Quatre comparaisons au plus : retirez-en une pour en ajouter une autre.',
      split: (a: string, ageA: number, b: string, ageB: number) => `${a} ${ageA} ans · ${b} ${ageB} ans`,
    },
    chart: {
      title: 'Votre plan, année par année',
      metric: 'Afficher',
      netWorth: 'Valeur nette',
      income: 'Revenus hors épargne',
      incomeHint: 'Travail, rente d’employeur, RRQ, PSV et Supplément de revenu garanti (SRG), avant impôt — sans puiser dans l’épargne.',
      netWorthHint: 'Tout ce que le ménage possède en fin d’année : REER, CELI et comptes non enregistrés.',
      today: 'Dollars d’aujourd’hui',
      nominal: 'Dollars de l’année',
      todayHint: 'Tous les montants sont en dollars d’aujourd’hui : chaque année est ramenée au pouvoir d’achat actuel.',
      nominalHint: 'Tous les montants sont dans les dollars de chaque année, sans correction pour l’inflation.',
      markersHint: 'Les traits pointillés : l’année du départ de chaque option.',
      figure: (metric: string, from: number, to: number, names: string) => `${metric} de ${from} à ${to} pour : ${names}.`,
      tooltip: (year: number, ages: string) => `${year} · ${ages}`,
      detail: 'Détail',
      detailHint: 'D’où vient l’argent chaque année, et ce que contiennent les comptes.',
      who: 'Pour qui',
      everyone: 'Les deux',
      scenarioPick: 'Départ',
      sourcesTitle: 'D’où vient l’argent, année par année',
      sourcesHint: 'Chaque barre est une année, par source de revenu.',
      needHint: 'La ligne pointillée est ce qu’il faut (dépenses + impôt) : les barres qui l’atteignent couvrent l’année.',
      source: { work: 'Travail', workOther: 'Travail et autres revenus', db: 'Rente d’employeur', rrq: 'RRQ', oas: 'PSV et suppléments', nest: 'Tiré du nid' },
      need: 'Dépenses + impôt',
      balancesTitle: 'Ce que contiennent les comptes',
      balancesHint: 'Les soldes de fin d’année. Ce qui reste d’une année est épargné : CELI d’abord, puis non enregistré.',
      balance: { rrsp: 'REER', tfsa: 'CELI', nonReg: 'Non enregistré', home: 'Maison (valeur nette)', rrspLocked: 'REER immobilisé' },
      sourcesFigure: (from: number, to: number) => `Sources du revenu de ${from} à ${to}.`,
      balancesFigure: (from: number, to: number) => `Soldes des comptes de ${from} à ${to}.`,
    },
    scenario: {
      retireAt: (label: string) => `Départ : ${label}`,
      works: (horizon: number) => `L’argent dure jusqu’à ${horizon} ans`,
      /** `year` is the LAST year the money lasts, with its ages. */
      lastsUntil: (year: string) => `L’argent dure jusqu’en ${year}`,
      endWorth: (amount: string) => `Valeur nette à la fin du plan : ${amount}`,
    },
    table: {
      title: 'Détail année par année',
      scenario: 'Départ',
      year: 'Année',
      ages: 'Âges',
      income: 'Revenu brut',
      tax: 'Impôt',
      spending: 'Dépenses',
      shortfall: 'À combler',
      netWorth: 'Valeur nette',
      mortgage: 'Hypothèque payée',
      homeEquity: 'Maison, valeur nette',
      rrspLocked: 'REER immobilisé',
    },
    sensitivity: {
      title: 'Et si l’avenir était un peu moins favorable ?',
      hint: 'L’âge au plus tôt quand le rendement, l’inflation ou l’âge de fin du plan changent d’un point ou de cinq ans.',
      running: 'Calcul en cours…',
      axes: 'Rendement (lignes) · inflation (colonnes)',
      horizon: (age: number) => `Jusqu’à ${age} ans`,
      delta: (points: number) => (points === 0 ? 'prévu' : `${points > 0 ? '+' : '−'}${Math.abs(points)} pt`),
      none: '—',
      note: 'Chaque case est le plus bas âge de départ où l’argent dure. Une case teintée : plus tard que votre scénario ; une case foncée : aucun âge.',
      /** The one sentence over the grid: what one point less of returns, and one point more of inflation, do to the age. */
      soWhat: (returns: string, inflation: string) => `Un point de rendement de moins : ${returns}. Un point d’inflation de plus : ${inflation}.`,
      sameAge: 'le même âge',
      laterBy: (years: number) => (years === 1 ? 'un an plus tard' : `${years} ans plus tard`),
      noAge: 'aucun âge ne dure',
    },
    params: {
      title: 'Paramètres utilisés',
      note: 'Chaque chiffre vient d’une page officielle. « Projeté » veut dire : estimé à partir de la dernière année publiée.',
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
    title: 'Sauvegarde et réglages',
    privacy: 'Vos chiffres ne quittent jamais cet appareil. Horizon n’a ni compte, ni serveur, ni suivi.',
    export: {
      title: 'Sauvegarder une copie',
      hint: 'Un fichier sur votre appareil, que vous gardez. Rien n’est envoyé nulle part.',
      button: 'Télécharger mon profil',
      done: 'Profil exporté',
    },
    import: {
      title: 'Restaurer une copie',
      hint: 'Choisissez un fichier sauvegardé depuis Horizon. Il remplace le profil de cet appareil.',
      button: 'Choisir un fichier',
      confirm: 'Restaurer ce fichier ? Le profil de cet appareil sera remplacé par celui du fichier. Vous pourrez rétablir l’ancien tout de suite après ; sans copie sauvegardée, il ne se récupère plus ensuite.',
      confirmLabel: 'Restaurer',
      done: 'Fichier restauré',
      notJson: 'Ce fichier ne vient pas d’Horizon, ou il est abîmé.',
      newer: 'Ce fichier vient d’une version plus récente d’Horizon.',
      problems: 'Ce fichier semble incomplet ou modifié. Voici ce qui n’a pas pu être lu :',
      problem: {
        missing: 'manquant',
        type: 'mauvais type de valeur',
        range: 'hors des limites permises',
        enum: 'valeur non permise',
        count: 'nombre non permis',
      },
    },
    example: {
      title: 'Voir un exemple',
      hint: 'Chargez un ménage fictif pour voir à quoi ressemble une réponse. Neuf exemples à comparer.',
      confirm: (name: string) => `Charger « ${name} » ? Le profil de cet appareil sera remplacé par un ménage fictif. Vous pourrez rétablir l’ancien tout de suite après ; sans copie sauvegardée, il ne se récupère plus ensuite.`,
      confirmLabel: 'Charger',
      done: 'Exemple chargé',
    },
    clear: {
      title: 'Effacer',
      hint: 'Retire le profil et les hypothèses de cet appareil.',
      button: 'Tout effacer',
      confirm: 'Tout effacer ? Le profil et les hypothèses seront retirés de cet appareil. Vous pourrez les rétablir tout de suite après ; sans copie sauvegardée, rien ne les ramène ensuite.',
      confirmLabel: 'Tout effacer',
      done: 'Données effacées',
    },
    issue: {
      unavailable: 'Ce navigateur ne conserve pas les données (navigation privée ?). Exportez votre profil avant de fermer la page.',
      unreadable: 'Le profil enregistré était illisible. Une copie en est gardée sur cet appareil (page Données : « Copie illisible »), et un profil vierge a été chargé.',
      newer: 'Le profil enregistré vient d’une version plus récente d’Horizon : il n’a pas pu être lu ici. Une copie en est gardée sur cet appareil (page Données : « Copie illisible »), et un profil vierge a été chargé.',
      unsaved: 'Un chiffre dépasse les limites permises : le profil n’a pas été enregistré. Corrigez le chiffre en cause.',
      conflict: 'Un autre onglet a enregistré pendant votre saisie : sa version a été reprise, et votre dernière modification n’a pas été conservée.',
    },
    backup: {
      due: 'Dernière copie de sauvegarde : il y a plus d’un mois. Vos chiffres ne vivent que sur cet appareil.',
      button: 'Sauvegarder une copie',
      later: 'Plus tard',
    },
    rescue: {
      title: 'Copie illisible',
      hint: 'Le profil que cet appareil n’a pas pu lire est resté sur place. Téléchargez-le avant d’effacer quoi que ce soit : un fichier de cette sorte se répare souvent à la main.',
      button: 'Télécharger la copie illisible',
      older: 'Télécharger la copie illisible précédente',
      /** One name per copy: three downloads used to collide on « -precedent ». */
      fileName: (i: number) => (i === 0 ? 'horizon-illisible.json' : `horizon-illisible-${i}.json`),
    },
    undo: {
      offer: 'L’ancien profil est encore récupérable, le temps de cette visite.',
      button: 'Rétablir l’ancien profil',
      done: 'Ancien profil rétabli',
    },
    display: {
      title: 'Affichage',
      hint: 'Réglé pour cet appareil seulement. Au-delà de ces réglages, le zoom du navigateur fonctionne toujours.',
      theme: 'Thème',
      themeDay: 'Jour',
      themeNight: 'Nuit',
      contrast: 'Contraste',
      contrastNormal: 'Normal',
      contrastHigh: 'Renforcé',
      textSize: 'Taille du texte',
      textSizes: { normal: '100 %', large: '115 %', 'x-large': '130 %' },
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
      note: 'Les années sous 3 500 $ y paraissent à 0 $, et les dernières années peuvent manquer : Revenu Québec les déclare avec du retard.',
    },
    rrqStartAge: {
      where: 'C’est votre choix : aucune pièce ne l’imprime. La page officielle montre l’effet de chaque mois plus tôt ou plus tard.',
      label: '',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/retraite-et-planification/demandez-rente-retraite/rente-retraite-regime-rentes-quebec/quel-age-devriez-vous-demander-rente-retraite',
      note: 'Chaque mois avant 65 ans réduit la rente de 0,5 % à 0,6 %. Chaque mois après 65 ans l’augmente de 0,7 %, jusqu’à 72 ans.',
    },
    oasResidence: {
      where: 'Comptez les années vécues au Canada depuis vos 18 ans : 40 ans donnent la pension complète, chaque année en vaut 1/40.',
      label: '',
      url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/montant-prestation.html',
      note: 'Il faut au moins 10 ans de résidence (20 si vous vivez à l’étranger) pour toucher une pension.',
    },
    oasStartAge: {
      where: 'C’est votre choix, de 65 à 70 ans : aucune pièce ne l’imprime. La page officielle « Quand commencer à recevoir votre pension » explique le report.',
      label: '',
      url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/quand-debut.html',
      note: 'Chaque mois de report augmente la pension de 0,6 %, jusqu’à 36 % à 70 ans.',
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
      note: 'Additionnez tous vos REER. Un RVER ou un RPAC s’y ajoute : mêmes impôts.',
    },
    rrspLocked: {
      where: 'Le relevé de votre RVER, CRI ou FRV : la part « immobilisée ». Dans un RVER, ce sont les cotisations de l’employeur ; dans un CRI ou un FRV, tout le solde.',
      label: 'immobilisé',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/travail/regime-volontaire-epargne-retraite-rver-et-instruments-transfert-et-decaissement/regime-volontaire-epargne-retraite-rver/travailleur-et-rver',
      note: 'Avant 55 ans, un FRV du Québec laisse sortir au plus 6,25 % du solde par année (taux 2026). Dès 55 ans, tout peut sortir. À 65 ans, un petit solde se libère d’un coup : jusqu’à 40 % du maximum des gains admissibles. Un FRV fédéral suit d’autres règles : entrez-le ici quand même.',
    },
    rrspRoom: {
      where: 'Votre dernier avis de cotisation de l’ARC (relevé du maximum déductible au titre des REER), ou votre compte de l’ARC.',
      label: 'Maximum déductible au titre des REER',
      url: 'https://www.canada.ca/fr/agence-revenu/services/formulaires-publications/publications/t4040/reer-autres-regimes-enregistres-retraite.html',
      note: 'Ce maximum tient déjà compte de votre régime d’employeur (le « facteur d’équivalence ») : ne le soustrayez pas une seconde fois. Si l’avis montre des cotisations inutilisées d’années passées, ajoutez-les.',
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
      note: 'Le chiffre de l’ARC date du 1er janvier : ce que vous avez cotisé ou retiré depuis n’y est pas. L’ARC elle-même recommande de vérifier avec vos relevés.',
    },
    nonRegBalance: {
      where: 'Le relevé de votre institution financière, au dernier jour du mois.',
      label: '',
      url: '',
      note: 'La valeur marchande de tous vos placements hors REER et CELI.',
    },
    nonRegAcb: {
      where: 'Les relevés de votre courtier (feuillet T5008, case 20 « Coût ou valeur comptable ») et son rapport de coût de base.',
      label: 'Prix de base rajusté (PBR)',
      url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-votre-declaration-revenus/declaration-revenus/remplir-declaration-revenus/revenu-personnel/ligne-12700-gains-capital/calculer-declarer-vos-gains-pertes-capital.html',
      note: 'L’ARC précise que la case 20 peut ne pas refléter le prix de base rajusté : au besoin, ajustez-la.',
    },
    dbService: {
      where: 'RREGOP : Retraite Québec ▸ Mon dossier ▸ Relevé de participation ▸ tableau « Années de service et cotisations », dernière ligne (le cumulatif).',
      label: 'Années de service pour le calcul de votre rente',
      url: 'https://www.retraitequebec.gouv.qc.ca/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/fr/services-en-ligne/exemple-releve-de-participation.pdf',
      note: 'Prenez la colonne du calcul de la rente, pas celle de l’admissibilité : les deux diffèrent. Autre régime : le relevé annuel de votre employeur.',
    },
    dbRules: {
      where: 'Le livret ou la page officielle de votre régime. Pour le RREGOP, la page « Le RREGOP » de Retraite Québec.',
      label: '',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/publications/regimes-retraite-secteur-public/rregop',
      note: 'Chaque régime écrit ses propres règles : recopiez-les du vôtre, ne devinez pas.',
    },
    dbCoordination: {
      where: 'Le livret de votre régime. Pour le RREGOP : « Le calcul de la diminution applicable à votre rente due à la coordination avec le RRQ ».',
      label: 'taux annuel de coordination de la rente avec le RRQ (0,7 %)',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/publications/regimes-retraite-secteur-public/rregop',
      note: 'La rente du régime baisse à partir de 65 ans, même si vous avez demandé la rente du RRQ plus tôt.',
    },
    spendingWorking: {
      where: 'Vos relevés de carte et de banque des 12 derniers mois, sans l’impôt ni l’épargne.',
      label: '',
      url: '',
      note: 'Logement, nourriture, transport, assurances, loisirs, dons : tout ce que le ménage dépense.',
    },
    spendingRetired: {
      where: 'Partez de vos dépenses actuelles, puis retranchez ce qui disparaît (épargne, transport au travail) et ajoutez ce qui arrive (santé, loisirs).',
      label: '',
      url: '',
      note: 'Sans l’impôt : Horizon le calcule.',
    },
    inflation: {
      where: 'La cible officielle de la Banque du Canada est de 2 %, au milieu d’une fourchette de 1 % à 3 %. Pour votre propre inflation, comparez vos dépenses d’une année à l’autre.',
      label: '',
      url: 'https://www.banqueducanada.ca/grandes-fonctions/politique-monetaire/ententes-relatives-cible-maitrise-inflation/',
      note: 'Le scénario Neutre retient 2,1 %, Prudent 2,5 % et Audacieux 2,0 %. Le 2,1 % vient des normes de projection 2026 de FP Canada et de l’Institut de planification financière.',
    },
    wageGrowth: {
      where: 'Retraite Québec publie le maximum des gains admissibles (MGA) de chaque année depuis 1966 : 74 600 $ en 2026. Comparer deux années donne la hausse des salaires.',
      label: '',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime-rentes-quebec/travail-et-cotisations/revenus-travail-admissibles-et-cotisations',
      note: 'Le MGA est passé de 54 900 $ en 2016 à 74 600 $ en 2026 : environ 3,1 % par année. Les normes 2026 et le scénario Neutre retiennent 3,1 % aussi.',
    },
    returns: {
      where: 'Le relevé annuel de votre courtier ou de votre assureur donne le rendement de chaque compte (« rendement personnel »). Vos frais sont sur son rapport annuel sur les frais.',
      label: '',
      url: 'https://institutpf.org/normes-hypotheses-projection',
      reference: true,
      note: 'Entrez un rendement une fois vos frais retirés. Les normes 2026 donnent des rendements avant frais : actions canadiennes 6,3 %, américaines 6,4 %, revenu fixe 3,2 %. Soustrayez-en vos frais. L’Institut est un ordre professionnel, pas un ministère.',
    },
    horizonAge: {
      where: 'Aucun document ne l’imprime : c’est un choix prudent. Statistique Canada publie l’espérance de vie, par province et par sexe, dans sa table 13-10-0114-01.',
      label: '',
      url: 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1310011401',
      note: 'La table donne une moyenne, et la moitié des gens vivent plus longtemps. Planifiez donc plus loin : Prudent va jusqu’à 100 ans, Neutre 95, Audacieux 90.',
    },
    survivorSpending: {
      where: 'Aucun document ne l’imprime : c’est un choix. Une personne seule dépense moins qu’un couple, mais pas la moitié : le logement reste.',
      label: '',
      url: '',
      note: 'À ce décès, Horizon verse à la personne qui reste la rente de conjoint survivant du RRQ, la part prévue de la rente d’employeur et, de 60 à 64 ans, l’Allocation au survivant. Les comptes de la personne décédée lui passent sans impôt.',
    },
    dbSurvivorShare: {
      where: 'Le livret ou la page de votre régime. Pour le RREGOP, la page « En cas de décès, qu’est-ce que le RREGOP prévoit pour vos proches ? » de Retraite Québec.',
      label: '50 % de votre rente',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/savoir-faire-pousser-ble/fonction-publique-sante-et-services-sociaux-et-education/cas-deces-est-que-rregop-prevoit-proches',
      note: 'Au RREGOP, la part est de 50 %, ou de 60 % si vous acceptez une rente réduite de 2 %. Un décès avant 65 ans : la réduction prévue à 65 ans s’applique quand même au conjoint.',
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
