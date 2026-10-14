import type { Lang } from '../i18n.ts'

// THE WORDS OF THE TFSA ROOM HELPER. Outside the eager dictionaries: only Profil reads them.

export interface TfsaRoomCopy {
  summary: string
  jan1: string
  jan1Hint: string
  deposited: string
  depositedHint: string
  today: (amount: string) => string
  next: (amount: string, limit: string) => string
  over: (amount: string) => string
  use: string
}

const FR: TfsaRoomCopy = {
  summary: 'Calculer mes droits d’aujourd’hui',
  jan1: 'Droits au 1er janvier (compte de l’ARC)',
  jan1Hint: 'Compte de l’ARC ▸ Régimes d’épargne et de pension ▸ Droits de cotisation CELI : le chiffre « au 1er janvier ».',
  deposited: 'Déposé depuis le 1er janvier',
  depositedHint: 'Vos dépôts de cette année, dans tous vos CELI. Un retrait de cette année ne redonne ses droits qu’au 1er janvier prochain.',
  today: (amount) => `Droits d’aujourd’hui : ${amount}.`,
  next: (amount, limit) => `Au 1er janvier prochain : environ ${amount}, soit ces droits plus la limite annuelle (${limit} cette année).`,
  over: (amount) => `Vos dépôts dépassent les droits de ${amount} : l’ARC prélève un impôt de 1 % par mois sur l’excédent.`,
  use: 'Utiliser ce montant',
}

const EN: TfsaRoomCopy = {
  summary: 'Work out my room today',
  jan1: 'Room on January 1 (CRA account)',
  jan1Hint: 'CRA account ▸ Savings and pension plans ▸ TFSA contribution room: the figure “as of January 1”.',
  deposited: 'Deposited since January 1',
  depositedHint: 'Your deposits this year, in all your TFSAs. A withdrawal this year gives its room back only on the next January 1.',
  today: (amount) => `Room today: ${amount}.`,
  next: (amount, limit) => `On the next January 1: about ${amount}, that room plus the yearly limit (${limit} this year).`,
  over: (amount) => `Your deposits are ${amount} over the room: the CRA taxes the excess at 1% a month.`,
  use: 'Use this amount',
}

export const TFSA_ROOM_COPY: Record<Lang, TfsaRoomCopy> = { fr: FR, en: EN }
