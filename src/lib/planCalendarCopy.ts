import type { CalendarEvent, CalendarKind } from './planCalendar'

// The words of the plan's calendar (lib/planCalendar.ts), on Ma fiche and on paper. Both languages, each written for its reader. A date names the person only when the household has two;
// a flow or a pension carries the name the household gave it.

type Plain = Exclude<CalendarKind, 'flowStart' | 'flowEnd'>
type Flow = NonNullable<CalendarEvent['flow']>

interface PlanCalendarCopy {
  title: string
  hint: string
  empty: string
  /** One line per kind: `who` is the person's name (empty for a household of one or a household date), `label` the name of a pension or flow. */
  kinds: Record<Plain, (who: string, label: string) => string>
  flowStart: Record<Flow, (label: string) => string>
  flowEnd: Record<Exclude<Flow, 'windfall'>, (label: string) => string>
}

export const PLAN_CALENDAR_COPY: { fr: PlanCalendarCopy; en: PlanCalendarCopy } = (() => {
  const named = (text: string, who: string) => (who === '' ? text : `${text} — ${who}`)
  return {
    fr: {
      title: 'Les dates de votre plan',
      hint: 'Ce que votre profil annonce, année après année. Aucun calcul ici — chaque date vient d’un âge ou d’une année que vous avez saisis.',
      empty: 'Aucune date à venir dans le profil.',
      kinds: {
        retire: (w) => named('Retraite', w),
        rrq: (w) => named('Début de la rente du RRQ', w),
        oas: (w) => named('Début de la PSV', w),
        pension: (w, l) => named(`Début de la rente ${l}`, w),
        partTimeEnds: (w) => named('Fin du temps partiel', w),
        childBorn: () => 'Naissance prévue d’un enfant',
        childLeaves: () => 'Un enfant quitte la maison',
        mortgageDone: () => 'Hypothèque payée',
        homeSold: () => 'Vente de la maison',
        end: (w) => named('Fin du plan', w),
      },
      flowStart: {
        windfall: (l) => `Entrée d’argent — ${l}`,
        income: (l) => `Début d’un revenu — ${l}`,
        expense: (l) => `Début d’une dépense — ${l}`,
      },
      flowEnd: {
        income: (l) => `Fin du revenu — ${l}`,
        expense: (l) => `Fin de la dépense — ${l}`,
      },
    },
    en: {
      title: 'The dates of your plan',
      hint: 'What your profile announces, year by year. Nothing is calculated here — every date comes from an age or a year you entered.',
      empty: 'No dates ahead in the profile.',
      kinds: {
        retire: (w) => named('Retirement', w),
        rrq: (w) => named('QPP pension starts', w),
        oas: (w) => named('OAS starts', w),
        pension: (w, l) => named(`${l} pension starts`, w),
        partTimeEnds: (w) => named('Part-time work ends', w),
        childBorn: () => 'A child is due',
        childLeaves: () => 'A child leaves home',
        mortgageDone: () => 'Mortgage paid off',
        homeSold: () => 'The house is sold',
        end: (w) => named('End of the plan', w),
      },
      flowStart: {
        windfall: (l) => `Money comes in — ${l}`,
        income: (l) => `An income begins — ${l}`,
        expense: (l) => `An expense begins — ${l}`,
      },
      flowEnd: {
        income: (l) => `The income ends — ${l}`,
        expense: (l) => `The expense ends — ${l}`,
      },
    },
  }
})()

/** The line for one event, in a language. */
export function calendarLine(copy: PlanCalendarCopy, e: CalendarEvent, names: readonly string[]): string {
  const who = e.who === null ? '' : (names[e.who] ?? '')
  const label = e.label ?? ''
  if (e.kind === 'flowStart') return copy.flowStart[e.flow ?? 'expense'](label)
  if (e.kind === 'flowEnd') return copy.flowEnd[e.flow === 'income' ? 'income' : 'expense'](label)
  return copy.kinds[e.kind](who, label)
}
