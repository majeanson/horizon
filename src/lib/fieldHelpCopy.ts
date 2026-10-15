import type { Lang } from '../i18n.ts'

// THE WORDS OF « À PROPOS DE CE CHAMP » (components/FieldHelp.tsx): the ⓘ of every field that is not a figure printed on an official document — an age
// the person chooses, a rule of their pension plan, an amount they estimate. A figure that IS on a document has the other ⓘ, « Où trouver ce chiffre »
// (`info.<id>` in the eager dictionary, held to official links by fieldInfoCopy.test.ts). Every FieldRow carries one or the other (fieldHelp.test.ts).
//
// Outside the eager dictionaries on purpose: fetched the first time one of these notes is opened.
//
// Each entry:
//   what   — what the field is, in plain words (one or two sentences);
//   effect — what it changes in the plan (optional when « what » already says it);
//   where  — where the person finds or decides the number when it is not a choice (a mortgage statement, the plan's booklet…), optional.
// No figure of the law or a rate is retyped here: those live in engine/params as Cited values and would silently go stale in a sentence.

export interface FieldHelpEntry {
  what: string
  effect?: string
  where?: string
}

const FR = {
  name: {
    what: 'Le prénom sert seulement à nommer chaque personne dans les écrans et les tableaux.',
    effect: 'Aucun : le calcul ne le lit pas.',
  },
  birthYear: {
    what: 'Votre année de naissance donne votre âge à chaque année du plan.',
    effect: 'Tout ce qui dépend de l’âge en découle : la fin du revenu de travail, le début de la rente du RRQ et de la PSV, le passage du REER au FERR et la fin du plan.',
  },
  birthMonth: {
    what: 'Le mois de votre anniversaire, pour placer chaque rente au bon mois.',
    effect: 'Une rente commence le mois qui suit l’anniversaire choisi : plus ce mois est tard dans l’année, moins la première année compte de mois payés.',
  },
  retirementAge: {
    what: 'L’âge où vous cessez de travailler à temps plein. C’est votre point de départ ; la réponse essaie aussi d’autres âges pour trouver le plus tôt possible.',
    effect: 'À cet âge, le salaire s’arrête, comme les cotisations prévues à vos comptes et le service accumulé dans un régime d’employeur. Vos dépenses sont ensuite payées par les rentes et le nid.',
  },
  childCost: {
    what: 'Ce qu’un enfant à la maison coûte au ménage en une année, en dollars d’aujourd’hui.',
    effect: 'Selon votre choix, ce montant est déjà compris dans votre budget (il en sort quand l’enfant part) ou s’y ajoute jusqu’à son départ.',
  },
  childLeaves: {
    what: 'L’âge auquel vous pensez que vos enfants quitteront la maison. C’est votre propre estimation, pas l’âge où les allocations s’arrêtent.',
    effect: 'À cet âge, le coût de l’enfant cesse de compter dans vos dépenses.',
  },
  childCostByAge: {
    what: 'Le coût par année d’un enfant prévu, pour chaque tranche d’âge : un enfant coûte plus cher en grandissant.',
    effect: 'De sa naissance à son départ, le coût de sa tranche d’âge s’ajoute à votre budget, avant comme pendant la retraite.',
    where: 'Le bouton qui reprend les estimations de Statistique Canada remplit ces cases ; remplacez-les par vos propres montants au besoin.',
  },
  parentalLeaveWeeks: {
    what: 'Combien des semaines parentales à partager chacun prend, pour un enfant à venir. Les semaines de maternité et de paternité sont comptées en plus.',
    effect: 'Le salaire de ces semaines n’est pas versé ; les prestations du RQAP le remplacent en partie, sont imposables et ne comptent pas pour la rente du RRQ.',
  },
  homeValue: {
    what: 'Le prix auquel la maison se vendrait aujourd’hui, pas ce que vous l’avez payée.',
    effect: 'Elle est montrée à côté de votre nid, sans jamais payer vos dépenses, sauf si vous prévoyez la vendre.',
  },
  mortgageBalance: {
    what: 'Ce qu’il reste à rembourser sur l’hypothèque aujourd’hui.',
    effect: 'Avec le taux et le paiement, il fixe l’année où le prêt est payé et où ce paiement sort de vos dépenses.',
    where: 'Votre dernier relevé hypothécaire ou le site de votre prêteur.',
  },
  mortgageRate: {
    what: 'Le taux d’intérêt annuel de votre terme actuel.',
    effect: 'Il fixe la part de chaque paiement qui va aux intérêts, donc la date où le prêt est payé.',
    where: 'Votre contrat ou votre relevé hypothécaire.',
  },
  homeSellAge: {
    what: 'L’âge de la première personne du profil quand vous comptez vendre ou passer à plus petit.',
    effect: 'Cette année-là, l’hypothèque est remboursée, le logement de remplacement est payé et le reste va, sans impôt, dans le compte non enregistré : il rejoint le nid.',
  },
  homeReplacement: {
    what: 'Le prix du logement que vous achèteriez après la vente, en dollars d’aujourd’hui.',
    effect: 'Plus il est bas, plus la vente ajoute au nid. Un loyer n’est pas compté ici : prévoyez-le dans vos dépenses à la retraite.',
  },
  mortgagePayment: {
    what: 'Ce que vous versez à chaque paiement, capital et intérêts compris, sans les taxes foncières que le prêteur percevrait avec lui : celles-là vont dans votre budget.',
    effect: 'Il s’ajoute à vos dépenses, au même montant en dollars, jusqu’à ce que le prêt soit payé ; il disparaît ensuite.',
    where: 'Votre relevé hypothécaire, ou le prélèvement sur votre relevé de compte.',
  },
  renewalYear: {
    what: 'L’année où votre terme prend fin et où le taux sera renégocié.',
    effect: 'Dès cette année, votre paiement change ou la date de fin du prêt bouge, selon votre choix.',
    where: 'La date d’échéance du terme, sur votre contrat ou votre relevé hypothécaire.',
  },
  renewalRate: {
    what: 'Le taux que vous pensez obtenir au renouvellement : une hypothèse, pas une promesse.',
    effect: 'Plus haut, il augmente le paiement ou allonge le prêt ; plus bas, l’inverse.',
  },
  eventName: {
    what: 'Un nom pour vous y retrouver dans la liste et dans les tableaux.',
    effect: 'Aucun : le calcul ne le lit pas.',
  },
  eventAmount: {
    what: 'Le montant de l’événement, en dollars d’aujourd’hui : une seule fois ou chaque année, selon le cas.',
    effect: 'Une somme reçue une fois arrive sans impôt dans le compte non enregistré. Une dépense s’ajoute à vos dépenses de ces années ; un revenu, à vos revenus, imposé si vous le dites.',
  },
  eventFrom: {
    what: 'L’année où l’événement commence, ou l’année où il arrive s’il n’arrive qu’une fois.',
    effect: 'Plus tôt dans le plan, une dépense pèse plus longtemps sur l’épargne, et une somme reçue a plus d’années pour fructifier.',
  },
  eventTo: {
    what: 'La dernière année où le montant revient, incluse.',
    effect: 'De la première à la dernière année, le montant compte chaque année.',
  },
  lumpSum: {
    what: 'Un calcul à part : un montant que vous verseriez d’un coup sur le solde de l’hypothèque.',
    effect: 'Le plan n’en tient compte que si vous l’appliquez : le solde baisse alors de ce montant. Pensez à baisser aussi le compte d’où l’argent est sorti.',
  },
  employerContribution: {
    what: 'Ce que votre employeur verse chaque année dans votre RVER, en plus de vos propres cotisations.',
    effect: 'Tant que vous travaillez, il s’ajoute à la partie immobilisée de votre REER. Il passe avant votre propre cotisation dans vos droits REER.',
  },
  annualContribution: {
    what: 'Ce que vous comptez mettre dans ce compte chaque année, en dollars d’aujourd’hui, tant que vous travaillez.',
    effect: 'Ce montant sort de votre revenu et grossit le nid jusqu’à la retraite. Au REER et au CELI, il est limité par vos droits de cotisation.',
  },
  partTimeShare: {
    what: 'La part de votre revenu de travail que vous gagneriez encore, à temps partiel, après l’âge de retraite.',
    effect: 'Ce revenu est imposé et cotise comme un salaire, mais n’ajoute rien à votre rente du RRQ, et l’épargne prévue « tant que vous travaillez » ne continue pas.',
  },
  partTimeUntil: {
    what: 'Le dernier âge où vous gagnez ce revenu à temps partiel.',
    effect: 'Ensuite, vos dépenses sont payées par les rentes et le nid seulement.',
  },
  dbAccrual: {
    what: 'La part de votre salaire moyen que chaque année de service vous donne en rente.',
    effect: 'C’est le cœur de la formule : la rente vaut ce taux, fois vos années de service, fois votre salaire moyen.',
    where: 'Le livret ou le sommaire de votre régime ; le relevé annuel le rappelle souvent.',
  },
  dbMaxService: {
    what: 'Le nombre d’années de service au-delà duquel la rente n’augmente plus, si votre régime en fixe un.',
    effect: 'Le service compté dans la formule s’arrête à ce maximum, même si vous travaillez plus longtemps.',
    where: 'Le livret de votre régime ; laissez vide s’il n’en dit rien.',
  },
  dbAveraging: {
    what: 'Le nombre d’années de salaire dont le régime fait la moyenne, souvent les mieux payées.',
    effect: 'Horizon prend les dernières années avant votre départ : pour un salaire qui ne baisse pas, cela revient au même.',
    where: 'Le livret de votre régime, à la formule de la rente.',
  },
  dbEarliestAge: {
    what: 'Le premier âge où le régime vous permet de toucher votre rente.',
    effect: 'Avant cet âge, aucune rente n’est versée ; entre cet âge et la rente sans réduction, elle est réduite.',
    where: 'Le livret de votre régime, à la retraite anticipée.',
  },
  dbUnreducedAge: {
    what: 'L’âge où la rente est payée en entier, peu importe vos années de service.',
    effect: 'Commencer plus tôt, sans avoir atteint une autre voie sans réduction, coûte une réduction permanente comptée par année d’avance.',
    where: 'Le livret de votre régime.',
  },
  dbUnreducedService: {
    what: 'Certains régimes paient la rente sans réduction dès qu’un nombre d’années de service est atteint, à tout âge.',
    effect: 'Si vous les atteignez avant l’âge sans réduction, la rente peut commencer plus tôt sans pénalité.',
    where: 'Le livret de votre régime ; laissez vide s’il n’offre pas cette voie.',
  },
  dbFactorMinAge: {
    what: 'Dans un régime à facteur, l’âge en deçà duquel la somme de l’âge et du service ne donne pas droit à la rente sans réduction.',
    effect: 'La rente est sans réduction quand vous avez au moins cet âge et que votre âge plus votre service atteint le total.',
    where: 'Le livret de votre régime.',
  },
  dbFactorTotal: {
    what: 'Le total que votre âge et vos années de service doivent atteindre ensemble pour une rente sans réduction.',
    effect: 'Dès qu’il est atteint, à partir de l’âge minimal, la réduction pour départ anticipé ne s’applique plus.',
    where: 'Le livret de votre régime.',
  },
  dbEarlyReduction: {
    what: 'Ce que la rente perd pour chaque année où elle commence avant d’être sans réduction.',
    effect: 'La réduction est permanente : elle s’applique à vie, comptée sur les années qui manquent jusqu’à la première date sans réduction.',
    where: 'Le livret de votre régime, à la retraite anticipée.',
  },
  dbCoordinationRate: {
    what: 'Le taux qui fixe de combien la rente baisse quand elle se coordonne avec le RRQ.',
    effect: 'Dès l’âge de coordination, la rente baisse de ce taux, fois vos années de service (jusqu’au maximum), fois le moindre de votre salaire moyen et du maximum des gains admissibles (MGA) moyen.',
    where: 'Le livret de votre régime, à la coordination avec le RRQ.',
  },
  dbCoordinationFrom: {
    what: 'L’âge où la baisse liée au RRQ commence.',
    effect: 'Elle s’applique dès le mois qui suit cet anniversaire, même si votre rente du RRQ commence à un autre âge.',
    where: 'Le livret de votre régime, à la coordination avec le RRQ.',
  },
  dbCoordinationYears: {
    what: 'Le plafond d’années de service sur lequel la coordination est calculée.',
    effect: 'Au-delà, des années de service de plus n’augmentent plus la baisse.',
    where: 'Le livret de votre régime, à la coordination avec le RRQ.',
  },
  dbBridgeShare: {
    what: 'Une rente temporaire que certains régimes ajoutent pour faire le pont jusqu’aux rentes de l’État, exprimée en part de votre rente.',
    effect: 'Elle s’ajoute à votre rente dès son début, jusqu’à l’âge de fin du pont.',
    where: 'Le livret de votre régime ; s’il n’en parle pas, laissez cette règle de côté.',
  },
  dbBridgeUntil: {
    what: 'L’âge où la rente temporaire cesse.',
    effect: 'Après cet âge, il reste la rente de base ; le RRQ et la PSV prennent souvent le relais.',
    where: 'Le livret de votre régime.',
  },
  dbIndexShare: {
    what: 'La part de la hausse des prix que le régime ajoute à votre rente chaque année.',
    effect: 'Plus elle est basse, plus la rente perd de pouvoir d’achat, année après année.',
    where: 'Le livret de votre régime, à l’indexation.',
  },
  dbIndexMinus: {
    what: 'L’autre formule d’indexation : la hausse des prix moins un écart fixe.',
    effect: 'Chaque année, la rente augmente selon la plus généreuse des deux formules : un écart nul veut donc dire une pleine indexation.',
    where: 'Le livret de votre régime, à l’indexation.',
  },
  pensionName: {
    what: 'Un nom pour reconnaître ce régime dans les écrans, comme celui de votre employeur.',
    effect: 'Aucun : le calcul ne le lit pas.',
  },
  dbInPay: {
    what: 'Le montant annuel de la rente que vous recevez déjà, avant impôt.',
    effect: 'Le plan la verse en entier dès cette année et l’indexe ensuite chaque janvier ; il ne refait pas la formule du régime.',
    where: 'Votre relevé de rente annuel, ou votre dernier talon multiplié par le nombre de versements de l’année.',
  },
  dbServiceRate: {
    what: 'Le service que chaque année de travail ajoute d’ici votre départ : un pour une année à temps plein, moins à temps partiel.',
    effect: 'Il fixe combien d’années s’ajoutent à celles de votre relevé, donc la taille de la rente.',
    where: 'Votre relevé annuel : le service crédité pour la dernière année complète.',
  },
  pensionStartAge: {
    what: 'L’âge où vous demanderez la rente du régime ; il peut différer de votre âge de retraite.',
    effect: 'Avant les règles sans réduction, la rente est réduite pour de bon. Entre votre départ et cet âge, vos dépenses sont payées par vos autres revenus et le nid.',
  },
  checkNetPay: {
    what: 'Ce qui arrive vraiment dans votre compte de banque en un an, après impôt et retenues.',
    effect: 'Aucun : c’est un contrôle. Horizon le compare à ce que donne son calcul, sans jamais s’en servir dans le plan.',
    where: 'Vos relevés bancaires : additionnez les dépôts de paie des douze derniers mois.',
  },
  checkDeposits: {
    what: 'Tout ce que vous avez versé dans ce compte, moins ce que vous en avez retiré.',
    effect: 'Aucun : le calcul ne s’en sert pas. À côté du solde, il montre ce que vos placements ont vraiment rapporté.',
    where: 'Le relevé de votre institution, souvent à la ligne des cotisations ou des dépôts nets.',
  },
  tfsaDepositedThisYear: {
    what: 'La somme de vos dépôts dans tous vos CELI depuis le premier janvier.',
    effect: 'Retranchés des droits du premier janvier, ils donnent ce qu’il vous reste à verser cette année.',
    where: 'Les relevés de vos CELI, ou l’historique des opérations de chaque institution.',
  },
  saveTargetAge: {
    what: 'L’âge de départ que vous voulez rendre possible.',
    effect: 'Horizon cherche le plus petit montant à épargner de plus chaque année d’ici là pour que l’argent dure jusqu’à la fin du plan.',
  },
  marketYear: {
    what: 'Le rendement d’une année de retraite dans votre propre parcours des marchés, positif ou négatif.',
    effect: 'Il remplace le rendement moyen cette année-là, pour tous les comptes.',
  },
} satisfies Record<string, FieldHelpEntry>

export type HelpId = keyof typeof FR

const EN: Record<HelpId, FieldHelpEntry> = {
  name: {
    what: 'The first name only labels each person on the screens and in the tables.',
    effect: 'None: the calculation does not read it.',
  },
  birthYear: {
    what: 'Your year of birth gives your age in every year of the plan.',
    effect: 'Everything that depends on age follows from it: the end of work income, the start of the QPP pension and OAS, the move from RRSP to RRIF, and the end of the plan.',
  },
  birthMonth: {
    what: 'The month of your birthday, to place each pension in the right month.',
    effect: 'A pension starts the month after the chosen birthday: the later that month falls in the year, the fewer months the first year pays.',
  },
  retirementAge: {
    what: 'The age at which you stop working full time. It is your starting point; the answer also tries other ages to find the earliest possible.',
    effect: 'At that age your salary stops, as do your planned account contributions and the service earned in an employer plan. Your spending is then paid by the pensions and the nest.',
  },
  childCost: {
    what: 'What a child at home costs the household in a year, in today’s dollars.',
    effect: 'Depending on your choice, this amount is already inside your budget (it leaves when the child moves out) or is added to it until they leave.',
  },
  childLeaves: {
    what: 'The age at which you expect your children to leave home. It is your own estimate, not the age the benefits stop.',
    effect: 'At that age, the child’s cost stops counting in your spending.',
  },
  childCostByAge: {
    what: 'What a planned child costs per year, for each age band: a child costs more as they grow.',
    effect: 'From birth until they leave, the cost of their age band is added to your budget, before and during retirement.',
    where: 'The button that takes Statistics Canada’s estimates fills these boxes; replace them with your own amounts if you wish.',
  },
  parentalLeaveWeeks: {
    what: 'How many of the shared parental weeks each parent takes, for a child still to come. Maternity and paternity weeks are counted on top.',
    effect: 'The pay for those weeks is not received; QPIP benefits replace part of it, are taxable, and do not count toward the QPP pension.',
  },
  homeValue: {
    what: 'What the home would sell for today, not what you paid for it.',
    effect: 'It is shown beside your nest and never pays your spending, unless you plan to sell.',
  },
  mortgageBalance: {
    what: 'What is left to repay on the mortgage today.',
    effect: 'With the rate and the payment, it sets the year the loan is paid off and the payment leaves your spending.',
    where: 'Your latest mortgage statement or your lender’s website.',
  },
  mortgageRate: {
    what: 'The yearly interest rate of your current term.',
    effect: 'It sets how much of each payment goes to interest, and so the date the loan is paid off.',
    where: 'Your mortgage contract or statement.',
  },
  homeSellAge: {
    what: 'The age of the first person in the profile when you plan to sell or downsize.',
    effect: 'That year the mortgage is repaid, the replacement home is paid for and the rest goes, tax-free, into the non-registered account: it joins the nest.',
  },
  homeReplacement: {
    what: 'The price of the home you would buy after the sale, in today’s dollars.',
    effect: 'The lower it is, the more the sale adds to the nest. Rent is not counted here: plan for it in your retirement spending.',
  },
  mortgagePayment: {
    what: 'What you pay each time, principal and interest included, without any property taxes the lender collects with it: those go in your budget.',
    effect: 'It is added to your spending, at the same dollar amount, until the loan is paid off; then it is gone.',
    where: 'Your mortgage statement, or the withdrawal on your bank statement.',
  },
  renewalYear: {
    what: 'The year your term ends and the rate is renegotiated.',
    effect: 'From that year, either your payment changes or the loan’s end date moves, as you choose.',
    where: 'The term’s maturity date, on your mortgage contract or statement.',
  },
  renewalRate: {
    what: 'The rate you expect at renewal: an assumption, not a promise.',
    effect: 'Higher, it raises the payment or lengthens the loan; lower, the reverse.',
  },
  eventName: {
    what: 'A name to find your way in the list and the tables.',
    effect: 'None: the calculation does not read it.',
  },
  eventAmount: {
    what: 'The event’s amount, in today’s dollars: once or every year, as the case may be.',
    effect: 'A sum received once lands tax-free in the non-registered account. An expense is added to your spending in those years; an income to your income, taxed if you say so.',
  },
  eventFrom: {
    what: 'The year the event starts, or the year it happens if it happens only once.',
    effect: 'The earlier in the plan, the longer an expense weighs on savings, and the more years a sum received has to grow.',
  },
  eventTo: {
    what: 'The last year the amount comes back, included.',
    effect: 'From the first to the last year, the amount counts every year.',
  },
  lumpSum: {
    what: 'A side calculation: an amount you would pay at once on the mortgage balance.',
    effect: 'The plan counts it only if you apply it: the balance then drops by that amount. Remember to lower the account the money came from too.',
  },
  employerContribution: {
    what: 'What your employer puts into your VRSP each year, on top of your own contributions.',
    effect: 'While you work, it is added to the locked-in part of your RRSP. It comes before your own contribution in your RRSP room.',
  },
  annualContribution: {
    what: 'What you plan to put in this account each year, in today’s dollars, while you work.',
    effect: 'This amount comes out of your income and grows the nest until retirement. In the RRSP and the TFSA, it is limited by your contribution room.',
  },
  partTimeShare: {
    what: 'The share of your work income you would still earn, part time, after the retirement age.',
    effect: 'This income is taxed and pays contributions like a salary, but adds nothing to your QPP pension, and the savings planned “while you work” do not continue.',
  },
  partTimeUntil: {
    what: 'The last age at which you earn this part-time income.',
    effect: 'After it, your spending is paid by the pensions and the nest alone.',
  },
  dbAccrual: {
    what: 'The share of your average salary that each year of service gives you as pension.',
    effect: 'It is the heart of the formula: the pension equals this rate, times your years of service, times your average salary.',
    where: 'Your plan’s booklet or summary; the annual statement often repeats it.',
  },
  dbMaxService: {
    what: 'The number of years of service beyond which the pension stops growing, if your plan sets one.',
    effect: 'The service counted in the formula stops at this maximum, even if you work longer.',
    where: 'Your plan’s booklet; leave it empty if it says nothing.',
  },
  dbAveraging: {
    what: 'The number of years of salary the plan averages, often the best-paid ones.',
    effect: 'Horizon takes the last years before you leave: for a salary that does not fall, it comes to the same.',
    where: 'Your plan’s booklet, at the pension formula.',
  },
  dbEarliestAge: {
    what: 'The first age at which the plan lets you draw your pension.',
    effect: 'Before that age no pension is paid; between it and the unreduced pension, the pension is reduced.',
    where: 'Your plan’s booklet, under early retirement.',
  },
  dbUnreducedAge: {
    what: 'The age at which the pension is paid in full, whatever your years of service.',
    effect: 'Starting earlier, without reaching another unreduced path, costs a permanent reduction counted per year early.',
    where: 'Your plan’s booklet.',
  },
  dbUnreducedService: {
    what: 'Some plans pay an unreduced pension once a number of years of service is reached, at any age.',
    effect: 'If you reach them before the unreduced age, the pension can start earlier without a penalty.',
    where: 'Your plan’s booklet; leave it empty if it offers no such path.',
  },
  dbFactorMinAge: {
    what: 'In a factor plan, the age below which age plus service does not give an unreduced pension.',
    effect: 'The pension is unreduced once you are at least this age and your age plus your service reaches the total.',
    where: 'Your plan’s booklet.',
  },
  dbFactorTotal: {
    what: 'The total your age and your years of service must reach together for an unreduced pension.',
    effect: 'Once it is reached, from the minimum age, the early-retirement reduction no longer applies.',
    where: 'Your plan’s booklet.',
  },
  dbEarlyReduction: {
    what: 'What the pension loses for each year it starts before being unreduced.',
    effect: 'The reduction is permanent: it applies for life, counted over the years missing to the first unreduced date.',
    where: 'Your plan’s booklet, under early retirement.',
  },
  dbCoordinationRate: {
    what: 'The rate that sets how much the pension drops when it is coordinated with the QPP.',
    effect: 'From the coordination age, the pension drops by this rate, times your years of service (up to the maximum), times the lesser of your average salary and the average Year’s Maximum Pensionable Earnings (YMPE).',
    where: 'Your plan’s booklet, under coordination with the QPP.',
  },
  dbCoordinationFrom: {
    what: 'The age at which the QPP-related drop begins.',
    effect: 'It applies from the month after that birthday, even if your QPP pension starts at another age.',
    where: 'Your plan’s booklet, under coordination with the QPP.',
  },
  dbCoordinationYears: {
    what: 'The cap on the years of service the coordination is calculated on.',
    effect: 'Beyond it, more years of service no longer increase the drop.',
    where: 'Your plan’s booklet, under coordination with the QPP.',
  },
  dbBridgeShare: {
    what: 'A temporary pension some plans add to bridge the gap to the government pensions, as a share of your pension.',
    effect: 'It is added to your pension from its start until the bridge’s end age.',
    where: 'Your plan’s booklet; if it does not mention one, leave this rule aside.',
  },
  dbBridgeUntil: {
    what: 'The age at which the temporary pension stops.',
    effect: 'After that age the base pension remains; the QPP and OAS often take over.',
    where: 'Your plan’s booklet.',
  },
  dbIndexShare: {
    what: 'The share of the rise in prices the plan adds to your pension each year.',
    effect: 'The lower it is, the more buying power the pension loses, year after year.',
    where: 'Your plan’s booklet, under indexation.',
  },
  dbIndexMinus: {
    what: 'The other indexation formula: the rise in prices minus a fixed gap.',
    effect: 'Each year the pension rises by the more generous of the two formulas, so a gap of zero means full indexation.',
    where: 'Your plan’s booklet, under indexation.',
  },
  pensionName: {
    what: 'A name to recognize this plan on the screens, such as your employer’s.',
    effect: 'None: the calculation does not read it.',
  },
  dbInPay: {
    what: 'The yearly amount of the pension you already receive, before tax.',
    effect: 'The plan pays it in full from this year and indexes it each January after; it does not redo the plan’s formula.',
    where: 'Your annual pension statement, or your latest pay stub times the number of payments in a year.',
  },
  dbServiceRate: {
    what: 'The service each year of work adds until you leave: one for a full-time year, less for part time.',
    effect: 'It sets how many years are added to those on your statement, and so the size of the pension.',
    where: 'Your annual statement: the service credited for the last full year.',
  },
  pensionStartAge: {
    what: 'The age at which you will claim the plan’s pension; it can differ from your retirement age.',
    effect: 'Before the unreduced rules, the pension is reduced for good. Between leaving and this age, your spending is paid by your other income and the nest.',
  },
  checkNetPay: {
    what: 'What actually reaches your bank account in a year, after tax and deductions.',
    effect: 'None: it is a check. Horizon compares it with what its calculation gives, and never uses it in the plan.',
    where: 'Your bank statements: add up the pay deposits of the last twelve months.',
  },
  checkDeposits: {
    what: 'Everything you have put into this account, less what you have taken out.',
    effect: 'None: the calculation does not use it. Beside the balance, it shows what your investments really earned.',
    where: 'Your institution’s statement, often on the line for contributions or net deposits.',
  },
  tfsaDepositedThisYear: {
    what: 'The total of your deposits into all your TFSAs since January first.',
    effect: 'Taken off the January first room, they give what you can still put in this year.',
    where: 'Your TFSA statements, or each institution’s transaction history.',
  },
  saveTargetAge: {
    what: 'The retirement age you want to make possible.',
    effect: 'Horizon finds the smallest extra amount to save each year until then for the money to last to the end of the plan.',
  },
  marketYear: {
    what: 'The return of one year of retirement in your own market path, positive or negative.',
    effect: 'It replaces the average return that year, for every account.',
  },
}

export const FIELD_HELP: Record<Lang, Record<HelpId, FieldHelpEntry>> = { fr: FR, en: EN }

export const FIELD_HELP_WORDS: Record<Lang, { what: string; effect: string; where: string }> = {
  fr: { what: 'Ce que c’est :', effect: 'Ce que ça change :', where: 'Où le trouver :' },
  en: { what: 'What it is:', effect: 'What it changes:', where: 'Where to find it:' },
}
