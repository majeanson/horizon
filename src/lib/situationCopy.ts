import type { Lang } from '../i18n'

// « Ma situation » — the plain questions that decide what the profile form shows. Lazy with the card.

interface SituationCopy {
  title: string
  lead: string
  yes: string
  no: string
  q: { kids: string; home: string; events: string; pension: string; abroad: string; partTime: string }
  hint: { kids: string; home: string; events: string; pension: string; abroad: string; partTime: string }
  /** What a « no » over typed figures would erase — said before it does. */
  lose: { kids: string; home: string; events: (n: number) => string; pension: (n: number) => string; abroad: string; partTime: string }
  hidden: string
  confirmNo: string
}

const FR: SituationCopy = {
  title: 'Ma situation',
  lead: 'Quelques questions simples : le formulaire ne garde que ce qui vous concerne. Changez d’avis quand vous voulez.',
  yes: 'Oui',
  no: 'Non',
  q: {
    kids: 'Des enfants à la maison, ou un enfant prévu?',
    home: 'Propriétaire de votre résidence principale?',
    events: 'Un événement prévu : héritage, grosse dépense, revenu de location?',
    pension: 'Un régime de retraite d’employeur qui verse une rente (comme le RREGOP)?',
    abroad: 'Des années hors du Canada depuis vos 18 ans?',
    partTime: 'Du travail après votre retraite, à temps partiel?',
  },
  hint: {
    kids: 'Ce que coûte un enfant, ce que l’État verse et un congé parental : et vos dépenses baissent quand ils quittent la maison.',
    home: 'Sa valeur, l’hypothèque et une vente éventuelle.',
    events: 'Des sommes datées, en plus du budget courant.',
    pension: 'Pas un REER collectif ni un CELI : seulement un régime où la rente dépend de vos années de service et de votre salaire.',
    abroad: 'La Sécurité de la vieillesse compte les années passées ici après 18 ans. Sans « oui », on suppose que vous avez toujours vécu au Canada.',
    partTime: 'Une part de votre salaire, jusqu’à l’âge que vous choisissez.',
  },
  lose: {
    kids: 'Les années de naissance des enfants et leur coût dans le budget seront effacés.',
    home: 'La maison, son hypothèque et sa vente éventuelle seront effacées.',
    events: (n) => (n === 1 ? '1 événement daté sera effacé.' : `${n} événements datés seront effacés.`),
    pension: (n) => (n === 1 ? 'Ce régime de retraite et ses règles seront effacés.' : `${n} régimes de retraite et leurs règles seront effacés.`),
    abroad: 'Votre année d’arrivée au Canada sera effacée : on supposera que vous avez toujours vécu ici.',
    partTime: 'Le travail gardé après la retraite sera effacé.',
  },
  hidden: 'Les sections qui ne vous concernent pas restent cachées : répondez « oui » pour les ouvrir.',
  confirmNo: 'Effacer',
}

const EN: SituationCopy = {
  title: 'My situation',
  lead: 'A few simple questions: the form keeps only what concerns you. Change your mind whenever you like.',
  yes: 'Yes',
  no: 'No',
  q: {
    kids: 'Children at home, or a planned child?',
    home: 'Do you own your main residence?',
    events: 'A planned event: inheritance, big expense, rental income?',
    pension: 'An employer pension plan that pays an annuity (like RREGOP)?',
    abroad: 'Years outside Canada since you turned 18?',
    partTime: 'Part-time work after you retire?',
  },
  hint: {
    kids: 'What a child costs, what the state pays and a parental leave; and your spending drops when they leave home.',
    home: 'Its value, the mortgage and a possible sale.',
    events: 'Dated sums, on top of the regular budget.',
    pension: 'Not a group RRSP or a TFSA: only a plan whose annuity depends on your years of service and your salary.',
    abroad: 'Old Age Security counts the years spent here after 18. Without a “yes”, you are assumed to have lived in Canada all along.',
    partTime: 'A share of your salary, up to the age you choose.',
  },
  lose: {
    kids: 'The children’s birth years and their cost in the budget will be erased.',
    home: 'The home, its mortgage and a possible sale will be erased.',
    events: (n) => (n === 1 ? '1 dated event will be erased.' : `${n} dated events will be erased.`),
    pension: (n) => (n === 1 ? 'This pension plan and its rules will be erased.' : `${n} pension plans and their rules will be erased.`),
    abroad: 'Your year of arrival in Canada will be erased: you will be assumed to have lived here all along.',
    partTime: 'The work kept after retirement will be erased.',
  },
  hidden: 'Sections that do not concern you stay hidden: answer “yes” to open them.',
  confirmNo: 'Erase',
}

export const SITUATION_COPY: Record<Lang, SituationCopy> = { fr: FR, en: EN }
