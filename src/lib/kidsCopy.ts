import type { Lang } from '../i18n'

// « Les enfants » — the words of the children's part of the family card: where each child stands, what a child costs (Statistics Canada), and where the figures
// come from. Lazy with the Profil page.

type Level = 'lower' | 'medium' | 'higher'
type Family = 'twoParent' | 'oneParent'

interface KidsCopy {
  stage: { future: string; home: string; gone: string }
  planned: { add: string; hint: string; effect: (born: string, amount: string, until: string) => string; effectBands: (born: string, until: string) => string }
  cost: {
    title: string
    lead: (family: string, level: string, children: number) => string
    families: Record<Family, string>
    levels: Record<Level, string>
    bands: [string, string, string, string]
    bandLine: (label: string, amount: string) => string
    estimated: string
    useAll: string
    useNow: (amount: string) => string
    useAverage: (amount: string) => string
    byAgeTitle: string
    byAgeClear: string
    perYear: string
    nowHint: (amount: string) => string
  }
  how: { open: string; lines: string[]; sources: string }
}

const FR: KidsCopy = {
  stage: { future: 'prévu', home: 'à la maison', gone: 'parti' },
  planned: {
    add: 'Un enfant prévu',
    hint: 'Pour un enfant à venir, tapez l’année prévue de sa naissance : son coût s’ajoute à votre budget dès ce moment, jusqu’à ce qu’il quitte la maison.',
    effect: (born, amount, until) => `Un enfant prévu en ${born} ajoute environ ${amount} par année à votre budget, jusqu’en ${until}.`,
    effectBands: (born, until) => `Un enfant prévu en ${born} ajoute son coût par âge à votre budget, jusqu’en ${until}.`,
  },
  cost: {
    title: 'Ce que coûte un enfant, selon Statistique Canada',
    lead: (family, level, children) => `Pour une famille ${family}, de revenu ${level}, avec ${children === 1 ? 'un enfant' : `${children} enfants`} :`,
    families: { twoParent: 'de deux parents', oneParent: 'monoparentale' },
    levels: { lower: 'plus modeste', medium: 'moyen', higher: 'plus élevé' },
    bands: ['de 0 à 5 ans', 'de 6 à 12 ans', 'de 13 à 18 ans', 'à 19 ans et plus'],
    bandLine: (label, amount) => `${label} : ${amount} par année`,
    estimated: 'estimation',
    useAll: 'Utiliser ces montants pour un enfant prévu',
    useNow: (amount) => `Mettre ${amount} par enfant à la maison`,
    useAverage: (amount) => `Mettre ${amount} par enfant`,
    byAgeTitle: 'Coût d’un enfant prévu, par année, selon son âge',
    byAgeClear: 'Retirer les montants par âge',
    perYear: 'par année',
    nowHint: (amount) => `Un enfant à la maison à son âge d’aujourd’hui : environ ${amount} par année.`,
  },
  how: {
    open: 'D’où viennent ces chiffres?',
    lines: [
      'Statistique Canada a estimé, à partir de l’Enquête sur les dépenses des ménages de 2014 à 2017, ce que les familles dépensent pour un enfant : nourriture, vêtements, logement (une chambre de plus), transport, santé, garde et éducation, loisirs.',
      'Ses chiffres sont en dollars de 2017 : Horizon les ramène à aujourd’hui avec l’indice des prix à la consommation (× 1,26). Ce calcul est le nôtre, pas une statistique officielle.',
      'Ils ne comptent ni l’impôt, ni l’épargne, ni le revenu auquel un parent renonce. Ils mesurent ce que les familles dépensent, pas ce qu’elles doivent dépenser.',
      'Au Québec, la garde coûtait moins cher que dans le reste du pays (9,65 $ par jour en service subventionné en 2026) : ces montants peuvent donc être un peu élevés pour vous. Comptez-les comme un ordre de grandeur, à remplacer par les vôtres.',
    ],
    sources: 'Sources',
  },
}

const EN: KidsCopy = {
  stage: { future: 'planned', home: 'at home', gone: 'left' },
  planned: {
    add: 'A planned child',
    hint: 'For a child still to come, type the year you expect the birth: their cost is added to your budget from then, until they leave home.',
    effect: (born, amount, until) => `A child planned for ${born} adds about ${amount} a year to your budget, until ${until}.`,
    effectBands: (born, until) => `A child planned for ${born} adds their cost by age to your budget, until ${until}.`,
  },
  cost: {
    title: 'What a child costs, according to Statistics Canada',
    lead: (family, level, children) => `For a ${family} family with ${level} income and ${children === 1 ? 'one child' : `${children} children`}:`,
    families: { twoParent: 'two-parent', oneParent: 'one-parent' },
    levels: { lower: 'lower', medium: 'medium', higher: 'higher' },
    bands: ['ages 0 to 5', 'ages 6 to 12', 'ages 13 to 18', 'age 19 and over'],
    bandLine: (label, amount) => `${label}: ${amount} a year`,
    estimated: 'estimate',
    useAll: 'Use these amounts for a planned child',
    useNow: (amount) => `Set ${amount} per child at home`,
    useAverage: (amount) => `Set ${amount} per child`,
    byAgeTitle: 'Cost of a planned child, a year, by age',
    byAgeClear: 'Remove the amounts by age',
    perYear: 'a year',
    nowHint: (amount) => `A child at home, at today’s age: about ${amount} a year.`,
  },
  how: {
    open: 'Where do these figures come from?',
    lines: [
      'Statistics Canada estimated, from the 2014 to 2017 Survey of Household Spending, what families spend on a child: food, clothing, housing (one more bedroom), transportation, health, child care and education, recreation.',
      'Its figures are in 2017 dollars: Horizon brings them to today with the Consumer Price Index (× 1.26). That calculation is ours, not an official statistic.',
      'They leave out income tax, savings and the income a parent gives up. They measure what families spend, not what they must spend.',
      'In Québec child care cost less than in the rest of the country ($9.65 a day in subsidised care in 2026), so these amounts may run a little high for you. Take them as an order of magnitude, to replace with your own.',
    ],
    sources: 'Sources',
  },
}

export const KIDS_COPY: Record<Lang, KidsCopy> = { fr: FR, en: EN }
