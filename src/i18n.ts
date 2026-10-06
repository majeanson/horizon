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
  /** The official page, or '' when the figure lives on the person's own statements (see fieldInfoCopy.test.ts). */
  url: string
  note: string
}

export const FR = {
  appName: 'Horizon',
  tagline: 'Quand pouvez-vous prendre votre retraite ?',

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
    theme: 'Jour / Nuit',
    lang: 'EN',
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
    infoNoPage: 'Aucune page officielle : ce chiffre vient de vos propres relevés.',
  },

  profile: {
    title: 'Profil',
    subtitle: 'Vos chiffres, saisis à la main. Ils restent sur cet appareil.',
    welcome: {
      title: 'Pour commencer',
      body: 'Entrez votre année de naissance et votre revenu de travail ; le reste peut attendre. Chaque chiffre à saisir a un ⓘ qui dit où le trouver, et rien de ce que vous écrivez ne quitte cet appareil.',
      example: 'Voir un exemple',
    },
    persons: 'Personne',
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
    label: 'Nom du régime',
    service: 'Années de service pour le calcul de la rente',
    serviceRate: 'Service crédité par année travaillée (1 = temps plein)',
    startAge: 'Âge de début de la rente',
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
      ok: (age: number) => `Au plus tôt : ${age} ans`,
      none: 'Aucun âge de 50 à 70 ans ne tient jusqu’à l’horizon.',
      explain: (horizon: number) => `« Tient » veut dire : les dépenses sont couvertes chaque année, jusqu’à ce que la personne la plus jeune ait ${horizon} ans.`,
      together: 'Toutes les personnes du ménage prennent leur retraite à cet âge.',
    },
    compare: {
      label: 'Comparer des âges de départ',
      plan: 'Mon plan',
      planHint: 'Chacun part à l’âge indiqué dans le profil.',
      age: (age: number) => `${age} ans`,
      max: 'Quatre comparaisons au plus : retirez-en une pour en ajouter une autre.',
    },
    chart: {
      title: 'Votre horizon',
      metric: 'Afficher',
      netWorth: 'Valeur nette',
      income: 'Revenu garanti',
      incomeHint: 'Travail, rentes du régime, RRQ, PSV et SRG, avant impôt — sans puiser dans l’épargne.',
      netWorthHint: 'Tout ce que le ménage possède en fin d’année : REER, CELI et comptes non enregistrés.',
      dollars: 'Dollars',
      today: 'd’aujourd’hui',
      nominal: 'de l’année',
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
      endWorth: (amount: string) => `Valeur nette à l’horizon : ${amount}`,
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
      run: 'Calculer',
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
      problems: 'Problèmes trouvés dans le fichier :',
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
      hint: 'Charge un couple fictif pour voir à quoi ressemble un résultat.',
      button: 'Charger l’exemple',
      confirm: 'Charger l’exemple ? Le profil de cet appareil sera remplacé par un couple fictif ; sans export, l’ancien ne se récupère pas.',
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
      unreadable: 'Le profil enregistré était illisible. Une copie en est gardée sur cet appareil, et un profil vierge a été chargé.',
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
      where: 'Le même relevé, section A : l’estimation de la rente de retraite, par mois, selon l’âge où vous la demandez.',
      label: 'A – Estimation de votre rente de retraite (« Montant projeté »)',
      url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/travail/emploi-et-regime-rentes-quebec/releve-participation-regime-rentes-quebec',
      note: 'Le relevé donne deux scénarios : « Montant actuel » (si vous cessiez de cotiser aujourd’hui) et « Montant projeté » (si vous continuiez avec des revenus semblables). Prenez le projeté.',
    },
    rrqEstimate60: {
      where: 'Le même relevé, section A : l’estimation de la rente de retraite, par mois, selon l’âge où vous la demandez.',
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
      where: 'Le nombre d’années vécues au Canada depuis vos 18 ans : 40 ans donnent la pension complète, chaque année en vaut 1/40. L’Estimateur des prestations de la Sécurité de la vieillesse de Service Canada vous le demande sous « historique de résidence ».',
      label: '',
      url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/montant-prestation.html',
      note: 'Il faut au moins 10 ans de résidence (20 si vous vivez à l’étranger) pour toucher une pension.',
    },
    oasStartAge: {
      where: 'C’est votre choix, de 65 à 70 ans : aucune pièce ne l’imprime. La page officielle explique la pension et le report.',
      label: '',
      url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/montant-prestation.html',
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
      note: 'L’ARC recommande de vérifier avec vos propres relevés : son compte n’est mis à jour qu’une fois par année.',
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
