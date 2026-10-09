import type { Lang } from '../i18n.ts'

// THE WORDS OF « MES PLANS » (Données). Outside the eager dictionaries: only that page ever reads them.

export interface PlansCopy {
  title: string
  hint: string
  nameLabel: string
  namePlaceholder: string
  keep: string
  empty: string
  full: (max: number) => string
  open: string
  openConfirm: (name: string) => string
  openLabel: string
  opened: (name: string) => string
  update: string
  updateConfirm: (name: string) => string
  updateLabel: string
  updated: (name: string) => string
  remove: string
  removeConfirm: (name: string) => string
  removeLabel: string
  removed: (name: string) => string
  kept: (name: string) => string
  current: string
  /** The kept plans side by side, on the results page (components/results/PlansCompare.tsx). */
  compare: {
    title: string
    hint: string
    /** The plan on screen, first in the list. */
    current: string
    at: (age: number) => string
    now: string
    none: (max: number) => string
    /** What the answer's age can fund each month, after tax, in today's dollars. */
    monthly: (amount: string) => string
    earlier: (years: number) => string
    later: (years: number) => string
  }
}

const FR: PlansCopy = {
  title: 'Mes plans',
  hint: 'Gardez plusieurs versions de votre plan sous un nom (« Je vends la maison », « Retraite à 55 ans ») et passez de l’une à l’autre. Les plans suivent votre fichier d’export, et restent sur cet appareil.',
  nameLabel: 'Nom du plan',
  namePlaceholder: 'Par exemple : Je vends la maison',
  keep: 'Garder ce plan',
  empty: 'Aucun plan gardé pour l’instant. Réglez votre profil comme vous voulez, donnez-lui un nom, puis modifiez-le pour essayer autre chose.',
  full: (max) => `${max} plans, c’est le maximum : retirez-en un pour en garder un nouveau.`,
  open: 'Ouvrir',
  openConfirm: (name) => `Ouvrir « ${name} » remplace tous les chiffres que vous voyez maintenant (profil, hypothèses, résidence). Si vous voulez les garder, gardez-les d’abord sous un nom. Vous pourrez rétablir tout de suite après.`,
  openLabel: 'Ouvrir ce plan',
  opened: (name) => `Plan « ${name} » ouvert.`,
  update: 'Mettre à jour',
  updateConfirm: (name) => `Le plan « ${name} » sera remplacé par vos chiffres actuels ; ce qu’il contenait est perdu.`,
  updateLabel: 'Remplacer',
  updated: (name) => `Plan « ${name} » mis à jour.`,
  remove: 'Retirer',
  removeConfirm: (name) => `Retirer le plan « ${name} » : ce qu’il contenait est perdu (à moins d’un export qui le contient).`,
  removeLabel: 'Retirer',
  removed: (name) => `Plan « ${name} » retiré.`,
  kept: (name) => `Plan « ${name} » gardé.`,
  current: 'C’est ce que vous voyez maintenant',
  compare: {
    title: 'Mes plans, côte à côte',
    hint: 'Chaque plan gardé, avec ses propres chiffres et ses propres hypothèses, passé au même calcul que la réponse. Pour en ouvrir un : « Sauvegarde et réglages ».',
    current: 'Plan actuel',
    at: (age) => `${age} ans`,
    now: 'dès maintenant',
    none: (max) => `aucun âge jusqu’à ${max} ans`,
    monthly: (amount) => `${amount} par mois`,
    earlier: (years) => `${years} ${years === 1 ? 'an' : 'ans'} plus tôt que le plan actuel`,
    later: (years) => `${years} ${years === 1 ? 'an' : 'ans'} plus tard que le plan actuel`,
  },
}

const EN: PlansCopy = {
  title: 'My plans',
  hint: 'Keep several versions of your plan under a name (“I sell the house”, “Retire at 55”) and switch between them. Plans travel with your export file and stay on this device.',
  nameLabel: 'Plan name',
  namePlaceholder: 'For example: I sell the house',
  keep: 'Keep this plan',
  empty: 'No plan kept yet. Set your profile the way you like, give it a name, then change it to try something else.',
  full: (max) => `${max} plans is the most: remove one to keep a new one.`,
  open: 'Open',
  openConfirm: (name) => `Opening “${name}” replaces every figure you see now (profile, assumptions, home). If you want to keep them, keep them under a name first. You can undo right after.`,
  openLabel: 'Open this plan',
  opened: (name) => `Plan “${name}” opened.`,
  update: 'Update',
  updateConfirm: (name) => `The plan “${name}” will be replaced by your current figures; what it held is lost.`,
  updateLabel: 'Replace',
  updated: (name) => `Plan “${name}” updated.`,
  remove: 'Remove',
  removeConfirm: (name) => `Remove the plan “${name}”: what it held is lost (unless an export contains it).`,
  removeLabel: 'Remove',
  removed: (name) => `Plan “${name}” removed.`,
  kept: (name) => `Plan “${name}” kept.`,
  current: 'This is what you see now',
  compare: {
    title: 'My plans, side by side',
    hint: 'Each kept plan, with its own figures and its own assumptions, put through the same calculation as the answer. To open one: “Backup and settings”.',
    current: 'Current plan',
    at: (age) => `age ${age}`,
    now: 'right now',
    none: (max) => `no age up to ${max}`,
    monthly: (amount) => `${amount} a month`,
    earlier: (years) => `${years} ${years === 1 ? 'year' : 'years'} earlier than the current plan`,
    later: (years) => `${years} ${years === 1 ? 'year' : 'years'} later than the current plan`,
  },
}

export const PLANS_COPY: Record<Lang, PlansCopy> = { fr: FR, en: EN }
