// The words of « Le coût d’un dollar de plus, par âge » (components/results/MarginalWeather.tsx): what the next RRSP dollar costs at each retired age (lib/marginalWeather.ts).
// Both languages, each written for its reader. Amounts arrive formatted.

interface MarginalWeatherCopy {
  title: string
  /** Two sentences a child could repeat: what the card is about. */
  intro: string
  /** How to read the bars. */
  reading: string
  /** The chart's name: what the bars count, for whose age. */
  caption: (name: string, per: string) => string
  /** The three parts of the cost, one legend entry each. */
  tax: string
  oas: string
  gis: string
  /** One real case: at this age, this much more taken out, this much leaves, this much stays. */
  example: (age: number, taken: string, lost: string) => string
  kept: (kept: string) => string
  lowest: (lost: string, per: string, age: number) => string
  highest: (lost: string, per: string, age: number) => string
  flat: (lost: string, per: string) => string
  /** When neither the OAS nor the GIS is touched in any year: the whole cost is income tax. */
  taxOnly: string
  /** Why the bars climb and fall in steps. */
  steps: string
  /** Why a bar can read nought while the household pays tax: the pension credit on the first RRSP dollars. Shown only when some year reads under one per cent. */
  zero: string
  who: string
  none: string
}

export const MARGINAL_WEATHER_COPY: { fr: MarginalWeatherCopy; en: MarginalWeatherCopy } = {
  fr: {
    title: 'Le coût d’un dollar de plus, par âge',
    intro: 'Quand vous retirez de l’argent de votre REER, l’État en garde une part : de l’impôt, et parfois une prestation qui baisse. Cette carte montre quelle part, à chaque âge.',
    reading: 'Plus la barre est haute, plus un dollar retiré à cet âge coûte cher. Une barre basse est un bon moment pour retirer.',
    caption: (name, per) => `Sur chaque ${per} retirés en plus du REER, ce qui repart, à l’âge de ${name}`,
    tax: 'Impôt',
    oas: 'Récupération de la PSV',
    gis: 'SRG perdu',
    example: (age, taken, lost) => `Un exemple : à ${age} ans, retirer ${taken} de plus du REER fait repartir ${lost}.`,
    kept: (kept) => `Il vous en reste ${kept}.`,
    lowest: (lost, per, age) => `Le plus bas — ${lost} sur ${per}, vers ${age} ans.`,
    highest: (lost, per, age) => `Le plus haut — ${lost} sur ${per}, vers ${age} ans.`,
    flat: (lost, per) => `Le coût ne bouge presque pas : environ ${lost} sur ${per} presque partout.`,
    taxOnly: 'Pour ce ménage, seul l’impôt est en jeu : aucune prestation ne baisse quand vous retirez du REER.',
    steps: 'Ça monte et ça descend par marches : l’impôt grimpe avec le revenu, la PSV est reprise au-delà d’un seuil, et le supplément de revenu garanti (SRG) disparaît peu à peu.',
    zero: 'Une barre de 0 ne veut pas dire sans impôt : le premier petit montant tiré du REER ou du FERR donne droit au crédit pour revenu de pension, qui efface l’impôt sur ce montant.',
    who: 'C’est le dollar tiré du REER de la personne qui a le moins de revenu cette année-là. Seules les années où plus personne ne travaille sont lues.',
    none: 'Aucune année de retraite complète à lire : quelqu’un travaille encore jusqu’à la fin du plan.',
  },
  en: {
    title: 'What one more dollar costs, by age',
    intro: 'When you take money out of your RRSP, the government keeps a share: income tax, and sometimes a benefit that shrinks. This card shows how big that share is, at each age.',
    reading: 'The taller the bar, the more a dollar taken out at that age costs. A short bar is a good time to take money out.',
    caption: (name, per) => `Out of every ${per} taken from the RRSP, what leaves, at ${name}’s age`,
    tax: 'Income tax',
    oas: 'OAS recovery tax',
    gis: 'GIS lost',
    example: (age, taken, lost) => `An example: at ${age}, taking ${taken} more out of the RRSP sends ${lost} away.`,
    kept: (kept) => `You keep ${kept}.`,
    lowest: (lost, per, age) => `The lowest — ${lost} out of ${per}, around ${age}.`,
    highest: (lost, per, age) => `The highest — ${lost} out of ${per}, around ${age}.`,
    flat: (lost, per) => `The cost barely moves: about ${lost} out of ${per} almost everywhere.`,
    taxOnly: 'For this household only income tax is at stake: no benefit shrinks when you take money out of the RRSP.',
    steps: 'It rises and falls in steps: income tax climbs with income, the OAS is taken back above a threshold, and the Guaranteed Income Supplement (GIS) fades away.',
    zero: 'A bar of 0 does not mean no tax: the first small amount drawn from the RRSP or RRIF earns the pension income credit, which wipes out the tax on that amount.',
    who: 'It is the dollar drawn from the RRSP of whoever has the lower income that year. Only years when nobody works any more are read.',
    none: 'No full retirement year to read: someone still works until the end of the plan.',
  },
}
