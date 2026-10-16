import { describe, expect, it } from 'vitest'
import { fillComparison } from '../engine/bracketFillCompare.ts'
import { bridgeView, profileLevers } from '../engine/bridge.ts'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples.ts'
import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import { project } from '../engine/projection.ts'
import { BRACKET_FILL_COPY } from './bracketFillCopy.ts'
import { BRIDGE_COPY } from './bridgeCopy.ts'
import { barRows, bridgeLines, windowRows } from './bridgeModel.ts'
import { BALANCE_SEGMENTS, EXPENSE_SEGMENTS, SOURCE_SEGMENTS, balanceBars, chartSeries, expenseBars, retirementMarkers, sourceBars } from './chartData.ts'
import { startMarkers } from './chartMarks.ts'
import { barProblems, seriesProblems } from './chartSeriesAssert.ts'
import { fillBalanceSeries, fillIncomeSeries, fillMarkers } from './fillView.ts'

// EVERY PICTURE THE APP DRAWS HAS A SHAPE, AND THE SHAPE IS HELD HERE FOR ALL OF THEM. chartInvariants.test.ts holds the figures the charts draw; this holds what they look like to a chart
// library: years that rise, a legend that does not say the same thing twice, colours that tell the lines apart, markers on years the axis reaches, bars that are whole figures. One function
// (lib/chartSeriesAssert.ts) for the main chart, the melt panel, the bridge panel and the flow bars, over all fourteen examples, so a new chart is held to it by being added to this list.

const scaleOf = (id: ExampleId, per?: 'year' | 'month') => ({ dollars: 'nominal' as const, todayYear: EXAMPLES[id].assumptions.today.year, inflation: EXAMPLES[id].assumptions.inflation, per })
const problems = (id: string, what: string, p: string[]) => p.map((x) => `${id} · ${what}: ${x}`)

describe('the main chart: net worth and guaranteed income, one line per scenario, with a marker where each retires', { timeout: 180_000 }, () => {
  it('every example, three retirement ages together, both measures, both kinds of dollar', () => {
    const wrong: string[] = []
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      // an age the person has not already passed (the app offers none before it): a marker at a year before today would be a question nobody can ask
      const now = assumptions.today.year - household.persons[0].birth.year
      const asked = [55, 60, 65].filter((a) => a >= now)
      const selections = asked.length > 0 ? asked : [now]
      const runs = selections.map((age) => ({ selection: age, result: runScenario(household, assumptions, everyoneAt(household, age), age) }))
      for (const metric of ['netWorth', 'income'] as const) {
        for (const dollars of ['nominal', 'today'] as const) {
          const series = chartSeries(runs, { metric, dollars, todayYear: assumptions.today.year, inflation: assumptions.inflation, label: (s) => `Retire à ${s}` })
          wrong.push(...problems(id, `${metric} ${dollars}`, seriesProblems(series, retirementMarkers(household, runs, (s) => `Retire à ${s}`))))
        }
      }
    }
    expect(wrong).toEqual([])
  })
})

describe('the melt panel: the income against the line, and the two balances, for each of the three ways', { timeout: 300_000 }, () => {
  it('every example, every way, both languages: the lines, and the one mark on the income chart', () => {
    const wrong: string[] = []
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      const age = household.persons[0].retirementAge
      const c = fillComparison(household, assumptions, age, age)
      for (const o of c.outcomes) {
        const years = o.years.filter((y) => y.year >= c.retiredFrom)
        if (years.length === 0) continue
        for (const lang of ['fr', 'en'] as const) {
          const t = BRACKET_FILL_COPY[lang]
          const m = fillMarkers(o, years, c.retiredFrom)
          const marks = m.leftAt ? [{ x: m.leftAt.year, label: t.markerForced, colour: 'accent' as const, named: true }] : []
          wrong.push(...problems(id, `${o.choice} ${lang} income`, seriesProblems(fillIncomeSeries(years, o.choice, { income: t.seriesIncome, line: t.seriesLine }), marks)))
          wrong.push(...problems(id, `${o.choice} ${lang} balances`, seriesProblems(fillBalanceSeries(years, { rrsp: t.seriesRrsp, tfsa: t.seriesTfsa }))))
        }
      }
    }
    expect(wrong).toEqual([])
  })
})

describe('the bridge panel: the nest and the guaranteed income, one line each for the plan and the three ways', { timeout: 300_000 }, () => {
  it('every example, both windows, both measures, both languages: the lines, and the start-of-pension markers inside them', () => {
    const wrong: string[] = []
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      const levers = profileLevers(household, household.persons[0].id)
      const view = bridgeView(household, assumptions, levers)
      const person = household.persons[0]
      for (const window of ['bridge', 'plan'] as const) {
        const rows = windowRows(view.selected.rows, window)
        if (rows.length === 0) continue
        const first = rows[0].age
        const last = rows[rows.length - 1].age
        for (const lang of ['fr', 'en'] as const) {
          const t = BRIDGE_COPY[lang]
          const labels = { selected: t.selectedName, asap: t.strategyName.asap, standard: t.strategyName.standard, max: t.strategyName.max }
          const inWindow = (age: number) => age >= first && age <= last
          const marks = startMarkers({ rrq: levers.rrqStartAge, oas: levers.oasStartAge }, inWindow, { rrq: t.markerRrq, oas: t.markerOas }, (age) => person.birth.year + age)
          for (const of of ['total', 'guaranteed'] as const) {
            const lines = bridgeLines(view, of, { first, last }, labels)
            // the markers belong to the picture of the NEST over the window; the guaranteed-income picture runs on to the end, so they are inside it a fortiori
            wrong.push(...problems(id, `${window} ${lang} ${of}`, seriesProblems(lines, of === 'total' ? marks : [])))
          }
          wrong.push(...problems(id, `${window} ${lang} bars`, barProblems(barRows(rows), ['work', 'db', 'rrq', 'oas', 'nest'], 'need', startMarkers({ rrq: levers.rrqStartAge, oas: levers.oasStartAge }, inWindow, { rrq: t.markerRrq, oas: t.markerOas }, (a) => a))))
        }
      }
    }
    expect(wrong).toEqual([])
  })
})

describe('the detail bars: where the money comes from, where it goes, what the accounts hold', { timeout: 300_000 }, () => {
  it('every example, the household and each person, per year and per month', () => {
    const wrong: string[] = []
    for (const id of EXAMPLE_IDS) {
      const { household, assumptions } = EXAMPLES[id]
      const rows = project(household, assumptions)
      for (const per of ['year', 'month'] as const) {
        const s = scaleOf(id, per)
        for (const who of [null, ...household.persons.map((p) => p.id)]) {
          wrong.push(...problems(id, `sources ${who} ${per}`, barProblems(sourceBars(rows, who, s), SOURCE_SEGMENTS, who === null ? 'need' : undefined)))
          wrong.push(...problems(id, `balances ${who} ${per}`, barProblems(balanceBars(rows, who, s), who === null ? [...BALANCE_SEGMENTS, 'rrspLocked', 'home'] : [...BALANCE_SEGMENTS, 'rrspLocked'])))
        }
        wrong.push(...problems(id, `expenses ${per}`, barProblems(expenseBars(rows, s), EXPENSE_SEGMENTS)))
      }
    }
    expect(wrong).toEqual([])
  })
})

describe('the assertion itself: it names each way a picture can be wrong', () => {
  const ok = (id: string, colour: 'accent' | 'sky' = 'accent', xs = [2040, 2041, 2042]) => ({ id, label: `L${id}`, colour, points: xs.map((x) => ({ x, y: 1 })) })

  it('a good picture has no problems', () => expect(seriesProblems([ok('a'), ok('b', 'sky')], [{ x: 2041, label: 'm', colour: 'accent' }])).toEqual([]))

  it.each([
    ['no series', () => seriesProblems([]), /no series/],
    ['a repeated id', () => seriesProblems([ok('a'), ok('a', 'sky')]), /share an id/],
    ['a repeated colour', () => seriesProblems([ok('a'), ok('b')]), /share a colour/],
    ['a series with no points', () => seriesProblems([{ ...ok('a'), points: [] }]), /no points/],
    ['years that go back', () => seriesProblems([ok('a', 'accent', [2040, 2042, 2041])]), /does not rise/],
    ['a NaN', () => seriesProblems([{ ...ok('a'), points: [{ x: 2040, y: NaN }] }]), /NaN/],
    ['a marker off the axis', () => seriesProblems([ok('a')], [{ x: 2099, label: 'late', colour: 'accent' }]), /off the axis/],
    ['two identical markers', () => seriesProblems([ok('a')], [{ x: 2041, label: 'm', colour: 'accent' }, { x: 2041, label: 'm', colour: 'accent' }]), /identical markers/],
  ])('%s', (_name, run, re) => expect(run().join('\n')).toMatch(re))

  it('bars: a negative segment, a missing one, years that go back, and a marker off the axis are named', () => {
    expect(barProblems([{ x: 1, a: 1 }, { x: 2, a: -5 }], ['a']).join()).toMatch(/negative/)
    expect(barProblems([{ x: 1, a: 1 }], ['a', 'b']).join()).toMatch(/segment b is undefined/)
    expect(barProblems([{ x: 2, a: 1 }, { x: 1, a: 1 }], ['a']).join()).toMatch(/does not rise/)
    expect(barProblems([{ x: 1, a: 1 }, { x: 2, a: 1 }], ['a'], undefined, [{ x: 9, label: 'm', colour: 'accent' }]).join()).toMatch(/off the axis/)
    expect(barProblems([{ x: 1, a: 1 }], ['a'], 'need').join()).toMatch(/the line need is undefined/)
    expect(barProblems([{ x: 1, a: 1 }], ['a'])).toEqual([])
  })
})
