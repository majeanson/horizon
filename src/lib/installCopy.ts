import type { Lang } from '../i18n.ts'

// THE WORDS OF THE INSTALL OFFER: the one-time card on the front door and the permanent line on « Sauvegarde et réglages ». Calm, once, and honest about what
// installing is: nothing leaves the device, it opens full screen and works without a network. Outside the eager dictionaries.

export interface InstallWords {
  card: { title: string; text: string; native: string; ios: string; install: string; later: string }
  line: { title: string; hint: string; native: string; ios: string; manual: string; installed: string; install: string }
}

const FR: InstallWords = {
  card: {
    title: 'Installer Horizon',
    text: 'Sur l’écran d’accueil, Horizon s’ouvre en plein écran, comme une application, et fonctionne sans réseau. Vos chiffres restent sur cet appareil.',
    native: 'Le navigateur propose de l’installer en un geste.',
    ios: 'Dans Safari : touchez Partager, puis « Sur l’écran d’accueil ».',
    install: 'Installer',
    later: 'Plus tard',
  },
  line: {
    title: 'Installer l’application',
    hint: 'Horizon s’ouvre en plein écran depuis l’écran d’accueil et fonctionne sans réseau. Rien n’est envoyé nulle part.',
    native: 'Le navigateur peut l’installer en un geste.',
    ios: 'Dans Safari : touchez Partager, puis « Sur l’écran d’accueil ».',
    manual: 'Dans le menu de votre navigateur, cherchez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
    installed: 'Horizon est installé sur cet appareil.',
    install: 'Installer',
  },
}

const EN: InstallWords = {
  card: {
    title: 'Install Horizon',
    text: 'On the home screen, Horizon opens full screen like an app and works without a network. Your figures stay on this device.',
    native: 'The browser offers to install it in one tap.',
    ios: 'In Safari: tap Share, then “Add to Home Screen”.',
    install: 'Install',
    later: 'Later',
  },
  line: {
    title: 'Install the app',
    hint: 'Horizon opens full screen from the home screen and works without a network. Nothing is sent anywhere.',
    native: 'The browser can install it in one tap.',
    ios: 'In Safari: tap Share, then “Add to Home Screen”.',
    manual: 'In your browser’s menu, look for “Install app” or “Add to Home Screen”.',
    installed: 'Horizon is installed on this device.',
    install: 'Install',
  },
}

export const INSTALL_COPY: Record<Lang, InstallWords> = { fr: FR, en: EN }
