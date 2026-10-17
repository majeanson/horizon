// The words of « Le coût d’un dollar de plus, par âge » (components/results/MarginalWeather.tsx): what the next RRSP dollar costs at each retired age (lib/marginalWeather.ts).
// Both languages, each written for its reader. Rates arrive formatted.

interface MarginalWeatherCopy {
  title: string
  hint: string
  caption: (name: string) => string
  /** A row header: the decade of age the row holds (60 → « 60 à 69 ans »). */
  decade: (from: number) => string
  /** A column header: the years added to the row's decade. */
  plus: (n: number) => string
  lowestMark: string
  highestMark: string
  lowest: (rate: string, age: number) => string
  highest: (rate: string, age: number) => string
  flat: (rate: string) => string
  parts: string
  who: string
  none: string
}

export const MARGINAL_WEATHER_COPY: { fr: MarginalWeatherCopy; en: MarginalWeatherCopy } = {
  fr: {
    title: 'Le coût d’un dollar de plus, par âge',
    hint: 'Pour chaque année de retraite, ce que l’État reprend — ou ne verse plus — sur un dollar de plus tiré du REER. Ce n’est pas une ligne lisse : la récupération de la PSV et la perte du SRG font des marches.',
    caption: (name) => `Part d’un dollar de plus reprise, à l’âge de ${name}`,
    decade: (from) => `${from} à ${from + 9} ans`,
    plus: (n) => `+${n}`,
    lowestMark: 'le plus bas',
    highestMark: 'le plus haut',
    lowest: (rate, age) => `Le plus bas — ${rate}, vers ${age} ans.`,
    highest: (rate, age) => `Le plus haut — ${rate}, vers ${age} ans.`,
    flat: (rate) => `Le taux ne bouge presque pas : ${rate} presque partout.`,
    parts: 'Le taux additionne l’impôt, la récupération de la PSV et le supplément de revenu garanti perdu.',
    who: 'C’est le dollar tiré du REER de la personne qui a le moins de revenu cette année-là. Seules les années où plus personne ne travaille sont lues.',
    none: 'Aucune année de retraite complète à lire : quelqu’un travaille encore jusqu’à la fin du plan.',
  },
  en: {
    title: 'What one more dollar costs, by age',
    hint: 'For each retired year, what the state takes back — or no longer pays — out of one more dollar drawn from the RRSP. It is not a smooth line: the OAS recovery tax and the loss of the GIS make steps.',
    caption: (name) => `Share of one more dollar taken back, at ${name}’s age`,
    decade: (from) => `${from} to ${from + 9}`,
    plus: (n) => `+${n}`,
    lowestMark: 'the lowest',
    highestMark: 'the highest',
    lowest: (rate, age) => `The lowest — ${rate}, around ${age}.`,
    highest: (rate, age) => `The highest — ${rate}, around ${age}.`,
    flat: (rate) => `The rate barely moves: ${rate} almost everywhere.`,
    parts: 'The rate adds income tax, the OAS recovery tax and the Guaranteed Income Supplement lost.',
    who: 'It is the dollar drawn from the RRSP of whoever has the lower income that year. Only years when nobody works any more are read.',
    none: 'No full retirement year to read: someone still works until the end of the plan.',
  },
}
