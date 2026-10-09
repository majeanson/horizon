import type { Lang } from '../i18n'

// WHICH SIGLES THE PAGES LINK TO THE GLOSSARY. A sigle (« RRQ », « QPP ») in a hint or a note becomes a link to its entry on
// /glossaire — the sigle → entry-id table, nothing more. It is kept apart from the glossary's words (lib/glossaryCopy.ts,
// fetched with the glossary page alone) because THIS is read by every page: a few hundred bytes in the shell, not a dozen KB.
// glossaryCopy.test.ts holds the two together: every id here is an entry there, with that very sigle.

export const GLOSS_SIGLES: Readonly<Record<Lang, Readonly<Record<string, string>>>> = {
  fr: {
    RRQ: 'rrq', PSV: 'psv', SRG: 'srg', MGA: 'mga', REER: 'reer', CELI: 'celi', FERR: 'ferr', PBR: 'pbr', ARC: 'arc',
    RREGOP: 'rregop', RVER: 'rver', RPAC: 'rpac', CRI: 'cri', FRV: 'frv',
  },
  en: {
    QPP: 'rrq', OAS: 'psv', GIS: 'srg', YMPE: 'mga', RRSP: 'reer', TFSA: 'celi', RRIF: 'ferr', ACB: 'pbr', CRA: 'arc',
    RREGOP: 'rregop', VRSP: 'rver', PRPP: 'rpac', LIRA: 'cri', LIF: 'frv',
  },
}

/** The anchor of a glossary entry — shared by the page (which sets it) and the links (which follow it). */
export const glossaryAnchor = (id: string): string => `terme-${id}`
