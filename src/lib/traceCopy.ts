// The words of « D'où vient ce chiffre ? » (components/Figure.tsx, lib/traceView.ts), in both languages. Like ledgerCopy.ts it lives outside the eager
// dictionaries (only the results page reads it). `labels` maps the engine's label keys (engine/trace.ts) to the words for a part or an input; every
// function takes already-formatted STRINGS — traceView formats the money, the percentages and the dates for the reader's language, and the copy never
// retypes a cited rate. (No sign that French binds — « : ; ? ! % $ » — appears in a literal here: the formatters write the figures, the sentences avoid the rest.)

export interface TraceCopy {
  /** Part and input names, by the engine's label key. */
  labels: Record<string, string>
  /** The whole calculation in one line: what it is, when it starts, the formula with this household's numbers, the amount, and the same amount in today's money. */
  formula: (lead: string, start: string, expr: string, result: string, today: string) => string
  /** A person's age, as written in a formula or beside an input. */
  age: (age: string) => string
  /** The accessible name of the figure's button: the amount and what it opens. */
  figureName: (value: string, label: string) => string
  inputsTitle: string
  sourceTitle: string
  /** After the page's title, for a screen reader: this link leaves for an official page. */
  officialPage: string
  /** The page is only written in the other language. */
  pageIn: (lang: string) => string
}

export const TRACE_COPY: { fr: TraceCopy; en: TraceCopy } = {
  fr: {
    labels: {
      rrqLead: 'Première rente',
      oasLead: 'Première pension',
      rrq: 'Rente du RRQ',
      oas: 'Pension de la PSV',
      rrqBase: 'base',
      rrqFirst: '1ʳᵉ supplémentaire',
      rrqSecond: '2ᵉ supplémentaire',
      rrqAdjustment: 'ajustement selon l’âge de départ',
      oasFull: 'pension complète',
      oasResidence: 'résidence',
      oasDeferral: 'report',
      earnings: 'Vos gains de travail (relevé du RRQ)',
      retirement: 'Âge de retraite visé',
      rrqStart: 'Début du RRQ',
      oasStart: 'Début de la PSV',
      residence: 'Part de résidence au Canada',
    },
    formula: (lead, start, expr, result, today) => `${lead} en ${start}. ${expr} = ${result} par mois, soit ${today} en dollars d’aujourd’hui.`,
    age: (age) => `${age} ans`,
    figureName: (value, label) => `${value}, d’où vient ce chiffre (${label})`,
    inputsTitle: 'Ce qui le fait varier',
    sourceTitle: 'La règle, sur la page officielle',
    officialPage: 'page officielle',
    pageIn: (lang) => (lang === 'en' ? 'page en anglais' : 'page en français'),
  },
  en: {
    labels: {
      rrqLead: 'First payment',
      oasLead: 'First payment',
      rrq: 'QPP pension',
      oas: 'OAS pension',
      rrqBase: 'base',
      rrqFirst: '1st additional',
      rrqSecond: '2nd additional',
      rrqAdjustment: 'adjustment for the start age',
      oasFull: 'full pension',
      oasResidence: 'residence',
      oasDeferral: 'deferral',
      earnings: 'Your work earnings (QPP statement)',
      retirement: 'Target retirement age',
      rrqStart: 'QPP start',
      oasStart: 'OAS start',
      residence: 'Share of residence in Canada',
    },
    formula: (lead, start, expr, result, today) => `${lead} in ${start}. ${expr} = ${result} a month, or ${today} in today’s dollars.`,
    age: (age) => `age ${age}`,
    figureName: (value, label) => `${value}, where this figure comes from (${label})`,
    inputsTitle: 'What moves it',
    sourceTitle: 'The rule, on the official page',
    officialPage: 'official page',
    pageIn: (lang) => (lang === 'fr' ? 'page in French' : 'page in English'),
  },
}
