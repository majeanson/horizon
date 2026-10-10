import type { Lang } from '../i18n.ts'

// THE WORDS OF « À QUEL POINT EST-CE PRÉCIS ? » on the « Vérifier » view: what the calculation can be checked against, and what it
// simplifies. Every line restates a fact ENGINE.md and the verified tests already hold — no new claim is made here. Outside the eager
// dictionaries: they arrive with the results page.

export interface AccuracyCopy {
  title: string
  intro: string
  checkedTitle: string
  checked: readonly string[]
  simplifiedTitle: string
  simplified: readonly string[]
  /** « Où voir les pages officielles » — the in-page figures, and the files that list them all. */
  seeFigures: string
  seeSources: string
  seeEngine: string
}

const FR: AccuracyCopy = {
  title: 'À quel point est-ce précis ?',
  intro: 'Ce calcul est un estimé, pas un avis. Voici contre quoi il a été vérifié, et ce qu’il simplifie.',
  checkedTitle: 'Ce qui est vérifié',
  checked: [
    'Chaque chiffre du gouvernement cite sa page officielle et le jour où il a été lu.',
    'La RRQ reproduit, au cent près, l’exemple chiffré du dépliant de Retraite Québec et les maximums publiés pour 2026.',
    'L’impôt de récupération de la PSV reproduit l’exemple de canada.ca, et les montants de l’Allocation canadienne pour enfants reproduisent les exemples de l’ARC, au cent près.',
    'La PSV et le SRG sont comparés à l’estimateur des prestations de la Sécurité de la vieillesse : l’écart connu est d’au plus 1 $ par mois.',
    'Les foyers d’exemple sont imprimés avec leurs calculs, pour les comparer à un calculateur officiel.',
  ],
  simplifiedTitle: 'Ce qui est simplifié, et dit',
  simplified: [
    'L’impôt ne modélise ni les dons, ni les frais médicaux, ni la contribution santé.',
    'Les rendements, l’inflation et la croissance des salaires sont des hypothèses (Prudent, Neutre, Audacieux), pas des chiffres officiels.',
    'Aucune probabilité n’est annoncée : aucune source officielle ne la fonde.',
    'Le SRG n’est pas arrondi au dollar comme le fait l’estimateur, et la résidence au Canada se résume à une année de début.',
    'Un chiffre qui n’est pas lu sur un document est marqué comme non confirmé, et la réponse dit de combien il la déplacerait.',
    'Le coût des enfants et des soins est un estimé ou votre propre montant, jamais un tarif sur lequel compter.',
  ],
  seeFigures: 'Voir les pages officielles (Paramètres utilisés)',
  seeSources: 'SOURCES.md : tous les chiffres et leurs pages',
  seeEngine: 'ENGINE.md : tout ce qui est simplifié',
}

const EN: AccuracyCopy = {
  title: 'How accurate is this?',
  intro: 'This calculation is an estimate, not advice. Here is what it has been checked against, and what it simplifies.',
  checkedTitle: 'What is checked',
  checked: [
    'Every government figure cites its official page and the day it was read.',
    'The QPP reproduces, to the cent, the worked example in Retraite Québec’s leaflet and the published 2026 maximums.',
    'The OAS recovery tax reproduces the canada.ca example, and the Canada Child Benefit amounts reproduce the CRA’s examples, to the cent.',
    'The OAS and the GIS are compared with the Old Age Security benefits estimator: the known gap is at most $1 a month.',
    'The example households are printed with their calculations, to hold beside an official calculator.',
  ],
  simplifiedTitle: 'What is simplified, and said',
  simplified: [
    'Tax does not model donations, medical expenses or the health contribution.',
    'Returns, inflation and wage growth are assumptions (Prudent, Neutral, Bold), not official figures.',
    'No probability is announced: no official source backs one.',
    'The GIS is not rounded to the dollar the way the estimator does it, and residence in Canada is reduced to one start year.',
    'A figure not read off a document is marked unconfirmed, and the answer says how far it would move.',
    'What children and care cost is an estimate or your own amount, never a rate to count on.',
  ],
  seeFigures: 'See the official pages (Parameters used)',
  seeSources: 'SOURCES.en.md: every figure and its page',
  seeEngine: 'ENGINE.md: everything that is simplified',
}

export const ACCURACY_COPY: Record<Lang, AccuracyCopy> = { fr: FR, en: EN }
