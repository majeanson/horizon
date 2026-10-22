import type { Lang } from '../i18n'

// THE TOKENS OF A PLAIN-LANGUAGE TEXT. A template (exampleStory.ts, whatIfCopy.ts) never types a figure: it holds `{age}`, `{nestEnd}`… and the figure is put in
// where the text is shown, from the facts of planFacts.ts. A token a template names that the facts do not give is an error here, loudly, never an empty space in a sentence.

export type TokenName = 'age' | 'base' | 'year' | 'who' | 'nestEnd' | 'nestEndBase' | 'comfort' | 'gain' | 'yearsWord'

const TOKEN = /\{(\w+)\}/g

/** The token names a template uses, in order of appearance. */
export const tokensIn = (template: string): string[] => [...template.matchAll(TOKEN)].map((m) => m[1])

/** « 1 an » / « 3 ans », « 1 year » / « 3 years ». */
export const yearsWord = (n: number, lang: Lang): string => (lang === 'en' ? `${n} ${n === 1 ? 'year' : 'years'}` : `${n} ${n === 1 ? 'an' : 'ans'}`)

/** The template with every token replaced; throws on a token the values do not carry. */
export function fillTokens(template: string, values: Partial<Record<TokenName, string>>): string {
  return template.replace(TOKEN, (_all, name: string) => {
    const v = values[name as TokenName]
    if (v === undefined || v === '') throw new Error(`the text uses {${name}} and no value was given for it: « ${template} »`)
    return v
  })
}
