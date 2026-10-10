import type { ExampleId } from '../engine/golden/examples.ts'

// The names and one-line stories of the example households (engine/golden/examples.ts), in both languages. Outside the eager
// dictionaries (only the data page reads them). The story is what the household's test holds it to.

export interface ExampleText {
  name: string
  story: string
}

export const EXAMPLE_COPY: { fr: Record<ExampleId, ExampleText>; en: Record<ExampleId, ExampleText> } = {
  fr: {
    golden: { name: 'Couple, un en fonction publique', story: 'Camille (RREGOP, 85 000 $) et Alex (65 000 $) : le couple des exemples de la documentation.' },
    average: { name: 'Couple, revenus moyens', story: 'Marie (72 000 $) et Luc (58 000 $), REER et CELI, une maison dont l’hypothèque se termine en 2041, sans régime d’employeur : le plan tient.' },
    modest: { name: 'Une personne, petit revenu', story: 'Hélène, 40 000 $, peu d’économies : le plan tient de justesse, et le SRG y est pour beaucoup.' },
    rich: { name: 'Couple, hauts revenus', story: 'Sophie (190 000 $) et Marc (130 000 $), gros comptes : retraite dès 58 et 60 ans, un gros nid à la fin.' },
    behind: { name: 'Une personne, en retard', story: 'Julien, 52 ans, 62 000 $, presque rien d’épargné : à 60 ans l’argent manque vers 62 ans.' },
    retired: { name: 'Couple à la retraite', story: 'Gilles (rente d’employeur en cours) et Francine : RRQ et PSV déjà versés, le nid est mis à contribution.' },
    newcomer: { name: 'Arrivée au Canada à 30 ans', story: 'Amira, 58 000 $ : PSV partielle (35 ans sur 40) et un historique du RRQ qui commence tard.' },
    downsizer: { name: 'Couple, vendre la maison', story: 'Nadia (96 000 $) et Paul (74 000 $) : en vendant la grande maison à 58 ans pour une plus petite, ils arrêtent à 58 ans ; sans la vente, l’argent manque dès 2042.' },
    family: { name: 'Couple, une famille qui grandit', story: 'Olivier (135 000 $) et Léa (24 000 $, à temps partiel depuis la naissance du premier) : deux enfants (2024, 2028), les allocations, un congé parental, une grosse hypothèque. Un seul gros revenu : le plan tient à 62 ans ; sans les enfants, 2 ans de moins ; sans les allocations, 1 an de plus.' },
    planner: { name: 'Couple, une vie à planifier', story: 'Élise (88 000 $) et Thomas (74 000 $) : un enfant en 2028 (coût, allocations, congé parental), du temps partiel pour Élise, un héritage, des dépenses qui ralentissent avec l’âge et des soins à 85 ans. Chaque événement déplace l’âge le plus tôt ; le plan tient à 58 ans.' },
    heir: { name: 'Une personne, grand héritage', story: 'Jules, 27 ans, hérite de 3,5 M$ : il pourrait arrêter de travailler dès maintenant, et l’argent doit durer soixante-dix ans.' },
  },
  en: {
    golden: { name: 'Couple, one in the public service', story: 'Camille (RREGOP, $85,000) and Alex ($65,000): the couple used in the documentation.' },
    average: { name: 'Couple, average incomes', story: 'Marie ($72,000) and Luc ($58,000), RRSP and TFSA, a home whose mortgage ends in 2041, no employer plan: the plan holds.' },
    modest: { name: 'One person, low income', story: 'Hélène, $40,000, little saved: the plan only just holds, and the GIS is a large part of why.' },
    rich: { name: 'Couple, high incomes', story: 'Sophie ($190,000) and Marc ($130,000), large accounts: retiring at 58 and 60, a large nest egg left.' },
    behind: { name: 'One person, behind', story: 'Julien, 52, $62,000, almost nothing saved: retiring at 60, the money runs out around 62.' },
    retired: { name: 'Retired couple', story: 'Gilles (employer pension in pay) and Francine: QPP and OAS already paid, the nest egg is being drawn.' },
    newcomer: { name: 'Arrived in Canada at 30', story: 'Amira, $58,000: a partial OAS (35 of 40 years) and a QPP history that starts late.' },
    downsizer: { name: 'Couple, selling the house', story: 'Nadia ($96,000) and Paul ($74,000): selling the big house at 58 for a smaller one lets them stop at 58; without the sale the money runs out in 2042.' },
    family: { name: 'Couple, a growing family', story: 'Olivier ($135,000) and Léa ($24,000, part-time since the first baby): two children (2024, 2028), the benefits, a parental leave, a big mortgage. One big income: the plan holds at 62; without the children, 2 years sooner; without the benefits, 1 year later.' },
    planner: { name: 'Couple, a life to plan', story: 'Élise ($88,000) and Thomas ($74,000): a child in 2028 (cost, benefits, parental leave), part-time work for Élise, an inheritance, spending that slows with age, and care at 85. Each event moves the earliest age; the plan holds at 58.' },
    heir: { name: 'One person, large inheritance', story: 'Jules, 27, inherits $3.5M: he could stop working right now, and the money has to last seventy years.' },
  },
}
