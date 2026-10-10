import type { Cited } from './cited.ts'

// WHAT A CHILD COSTS: Statistics Canada's own estimate of what families in Canada spend on a child, by the child's age, the family's kind and income, and how
// many children it has. They are OBSERVATIONS (a modelled analysis of the Survey of Household Spending 2014–2017, in 2017 dollars), never projected
// (index: 'none'). What is done with them — which cell a household falls in, the move to today's dollars with the CPI — is arithmetic in lib/kidsCost.ts,
// said as such on screen, and never presented as a government figure. Each cell below is a cell of the paper's tables 1 to 3; the paper's own totals
// (0–17 and 0–22) are held against them in childCosts.test.ts, so a mistyped cell cannot hide.
//
// What the paper counts: child care and education, clothing, food, out-of-pocket health, housing (the cost of one more bedroom), transportation and
// miscellaneous. What it leaves out: taxes, savings, gifts, pets, support payments and everything a child costs a parent in forgone income. Its own
// warnings, repeated where the figures are shown: the four survey years are pooled; the household's spending is shared among its members by assumed
// shares; Québec's child care (and tuition) was cheaper than elsewhere, so the figure may overstate it; and it is what families SPEND, not what they must.

/** The four age bands the paper prints, for the youngest child of the family: 0–5, 6–12, 13–18, 19–22 (a year of age is a whole year: 6 + 7 + 6 + 4 = 23 years). */
export type CostBands = readonly [number, number, number, number]

/** One family size: two-parent families by income level, one-parent families by income level (the paper has only two there). */
export interface CostTable {
  twoParent: { lower: CostBands; medium: CostBands; higher: CostBands }
  oneParent: { lower: CostBands; mediumHigh: CostBands }
}

const SOURCE = {
  url: 'https://www150.statcan.gc.ca/n1/pub/11f0019m/11f0019m2023007-eng.htm',
  title: 'Estimating Expenditures on Children by Families in Canada, 2014 to 2017',
  retrieved: '2026-10-09',
}

export const CHILD_COSTS: Cited<{ oneChild: CostTable; twoChildren: CostTable; threeChildren: CostTable }> = {
  value: {
    // Table 2: predicted annual expenditure on the one child of a one-child family.
    oneChild: {
      twoParent: { lower: [14_960, 15_910, 17_890, 17_760], medium: [19_560, 20_670, 22_690, 22_550], higher: [28_730, 30_200, 32_360, 32_180] },
      oneParent: { lower: [15_400, 16_030, 18_030, 17_610], mediumHigh: [26_740, 27_830, 30_030, 29_610] },
    },
    // Table 1: predicted annual expenditure on ONE child of a two-child family (a family's total is the sum over its children).
    twoChildren: {
      twoParent: { lower: [12_330, 13_230, 14_320, 14_050], medium: [15_300, 16_300, 17_420, 17_120], higher: [21_290, 22_510, 23_720, 23_410] },
      oneParent: { lower: [12_160, 12_700, 13_880, 13_510], mediumHigh: [19_820, 20_570, 21_840, 21_470] },
    },
    // Table 3: predicted annual expenditure on ONE child of a three-child family.
    threeChildren: {
      twoParent: { lower: [11_320, 12_110, 12_820, 12_540], medium: [13_660, 14_500, 15_230, 14_950], higher: [18_460, 19_450, 20_230, 19_930] },
      oneParent: { lower: [10_340, 10_710, 11_560, 11_270], mediumHigh: [16_560, 17_050, 17_940, 17_650] },
    },
  },
  source: {
    ...SOURCE,
    note: 'Tables 1 (two-child families), 2 (one-child) and 3 (three-child): « Predicted annual expenditures for one child », Canada, 2017 constant dollars, by age of the youngest child (0–5, 6–12, 13–18, 19–22), two-parent families (lower, medium, higher income) and one-parent families (lower, medium-high). Pooled Survey of Household Spending 2014–2017, ten provinces.',
  },
  index: 'none',
}

/** The paper's income levels, in 2016 before-tax household income: lower is under `lowerBelow`, higher is over `higherAbove`, medium is between. */
export const CHILD_COST_INCOME_LEVELS: Cited<{ lowerBelow: number; higherAbove: number }> = {
  value: { lowerBelow: 83_013, higherAbove: 135_790 },
  source: {
    ...SOURCE,
    note: 'Income groups in 2016 dollars, before-tax household income: lower under 83 013 $, medium 83 013 $ to 135 790 $, higher over 135 790 $. One-parent families have two groups only: lower (under 83 013 $) and medium-high (83 013 $ and over).',
  },
  index: 'none',
}

/**
 * The all-items Consumer Price Index, annual average (2002 = 100): the paper's costs are in 2017 dollars and its income levels in 2016 dollars, so today's
 * figures move by the ratio of the latest year to theirs. 2016 and 2017 read from the table's own CSV download; 2025 is the latest full year.
 */
export const CPI_ANNUAL: Cited<Record<number, number>> = {
  value: { 2016: 128.4, 2017: 130.4, 2025: 164.2 },
  source: {
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000501',
    title: 'Consumer Price Index, annual average, not seasonally adjusted',
    retrieved: '2026-10-09',
    note: 'Table 18-10-0005-01, Canada, « All-items », 2002 = 100, reference years 2016, 2017 and 2025.',
  },
  index: 'none',
}
