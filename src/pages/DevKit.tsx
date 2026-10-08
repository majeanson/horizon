import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Chip, ChipGroup } from '../components/Chip'
import { NextStep } from '../components/NextStep'
import { EditField } from '../components/EditField'
import { EmptyState } from '../components/EmptyState'
import { FieldInfo } from '../components/FieldInfo'
import { FieldRow } from '../components/FieldRow'
import { Icon } from '../components/Icon'
import { Loading } from '../components/Loading'
import { Modal } from '../components/Modal'
import { NumberField } from '../components/NumberField'
import { Slider } from '../components/Slider'
import { PageHead } from '../components/PageHead'
import { Cluster, Rail } from '../components/Layout'
import { SectionHeader } from '../components/SectionHeader'
import { SectionNav } from '../components/SectionNav'
import { ImpactMeter } from '../components/ImpactMeter'
import { Skeleton } from '../components/Skeleton'
import { StatusMessage } from '../components/StatusMessage'
import { SubTabs } from '../components/SubTabs'
import { Switch } from '../components/Switch'
import { TableChooser } from '../components/TableChooser'
import { useLang, useT } from '../i18n'
import { getContrast, getTextScale, setContrast, setTextScale, TEXT_SCALES, type TextScale } from '../lib/accessibility'
import { useConfirm } from '../lib/confirm'
import { formatCompactMoney, formatMoney } from '../lib/money'
import { getTheme, setTheme } from '../lib/theme'
import { useNotice } from '../lib/toast'
import '../styles/devkit.css'

// The living gallery of every shared primitive (/dev/kit, reachable from « Données »). A new
// primitive that is not in this list is invisible to the next session and gets re-invented
// beside the one that exists — so src/lib/devkitParity.test.ts keeps this list and the table
// in COMPONENTS.md in step, in both directions.
//
// A specimen is `{ cat, name, file, kw, render }`: the category it is filed under, the
// component's name, the file it lives in, search keywords, and a function returning the
// live specimen. The header toggles theme, language, contrast and text size so every
// specimen can be judged on every axis — the axes a household actually varies.

interface Entry {
  cat: string
  name: string
  // The component's file, relative to the repo root — the parity test checks it exists and
  // that it really exports `name` (or the names in `exports`).
  file: string
  exports?: string[]
  kw: string
  render: () => ReactNode
}

// A labelled sub-variant inside one specimen.
function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="devkit__demo">
      <span className="devkit__demo-label mono">{label}</span>
      {children}
    </div>
  )
}

function EditFieldSpecimen() {
  const [v, setV] = useState('')
  const [w, setW] = useState('1 507,65')
  return (
    <>
      <Demo label="icône ✓ · Enter valide · effacer">
        <EditField value={v} onChange={setV} onSubmit={setV} placeholder="Écrire…" ariaLabel="Exemple" />
      </Demo>
      <Demo label="bouton étiqueté (passe sous le champ en espace étroit)">
        <EditField value={w} onChange={setW} onSubmit={setW} submitLabel="Ajouter" ariaLabel="Montant" />
      </Demo>
    </>
  )
}

function SliderSpecimen() {
  const [age, setAge] = useState(65)
  const [seen, setSeen] = useState(65)
  return (
    <>
      <Slider label="Début de la rente" value={age} min={60} max={72} valueText={(v) => `${v} ans`} onPreview={setSeen} onCommit={setAge} marks={[60, 65, 70].map((v) => ({ value: v, label: String(v) }))} info={(v) => <p className="field-row__hint">{v < 65 ? 'Avant 65 ans : la rente est réduite.' : v === 65 ? 'À 65 ans : le montant de référence.' : 'Après 65 ans : la rente est majorée.'}</p>} />
      <p className="field-row__hint">En mouvement : {seen} · enregistré : {age}</p>
    </>
  )
}

function NumberFieldSpecimen() {
  const [money, setMoney] = useState(1507.65)
  const [pct, setPct] = useState(0.0525)
  const [year, setYear] = useState(1978)
  const [age, setAge] = useState(65)
  const [optional, setOptional] = useState<number | null>(null)
  return (
    <>
      <Demo label="dollars (« 1 507,65 » ou « 1507.65 » : la virgule décimale se lit à la québécoise)">
        <NumberField kind="money" value={money} onChange={setMoney} ariaLabel="Montant" />
      </Demo>
      <Demo label="pourcentage (stocké 0,0525, saisi 5,25)">
        <NumberField kind="percent" min={-0.2} max={0.3} value={pct} onChange={setPct} ariaLabel="Taux" />
      </Demo>
      <Demo label="année · entier avec unité · facultatif (vide = rien)">
        <NumberField kind="year" min={1900} max={2100} value={year} onChange={setYear} ariaLabel="Année" />
        <NumberField kind="int" min={60} max={72} unit="ans" value={age} onChange={setAge} ariaLabel="Âge" />
        <NumberField kind="money" allowEmpty value={optional} onChange={setOptional} ariaLabel="Facultatif" />
      </Demo>
    </>
  )
}

function FieldRowSpecimen() {
  const [v, setV] = useState(7000)
  return (
    <FieldRow label="Droits de cotisation inutilisés (CELI)" infoId="tfsaRoom" hint="Un indice discret sous le champ, lu avec lui.">
      {(w) => <NumberField kind="money" value={v} onChange={setV} id={w.id} ariaDescribedBy={w.describedBy} />}
    </FieldRow>
  )
}

// The chart library is lazy here too: the gallery is online-only, and the library is the heaviest thing in the app.
const LineChart = lazy(() => import('../components/charts').then((m) => ({ default: m.LineChart })))
const StackedBarChart = lazy(() => import('../components/charts').then((m) => ({ default: m.StackedBarChart })))

function StackedBarChartSpecimen() {
  const { lang } = useLang()
  const ages = Array.from({ length: 11 }, (_, i) => 60 + i)
  const data = ages.map((x) => {
    const late = x >= 65
    const guaranteed = late ? 38_000 : 24_000
    return { x, work: x < 62 ? 30_000 : 0, db: 24_000, rrq: late ? 14_000 : 0, oas: late ? 8_000 : 0, nest: Math.max(0, 60_000 - guaranteed - (x < 62 ? 30_000 : 0)), need: 66_000 }
  })
  return (
    <Suspense fallback={<Loading />}>
      <StackedBarChart
        data={data}
        series={[
          { id: 'work', label: 'Travail', colour: 'ink' },
          { id: 'db', label: 'Rente de l’employeur', colour: 'sky' },
          { id: 'rrq', label: 'RRQ', colour: 'sage' },
          { id: 'oas', label: 'PSV', colour: 'berry' },
          { id: 'nest', label: 'Tiré du nid', colour: 'accent' },
        ]}
        line={{ id: 'need', label: 'Dépenses + impôt' }}
        markers={[{ x: 65, label: 'RRQ', colour: 'accent', named: true }]}
        yFormat={(y) => formatCompactMoney(y, lang)}
        yDetail={(y) => formatMoney(y, lang)}
        xTitle={(x) => x + ' ans'}
        ariaLabel="Exemple : d’où vient l’argent de 60 à 70 ans."
        height={240}
      />
    </Suspense>
  )
}

function LineChartSpecimen() {
  const { lang } = useLang()
  const years = Array.from({ length: 31 }, (_, i) => 2030 + i)
  const series = [
    { id: 'a', label: '60 ans', colour: 'accent' as const, points: years.map((x, i) => ({ x, y: 40_000 * Math.sin(i / 9) ** 2 * (i + 4) * 4 })) },
    { id: 'b', label: '65 ans', colour: 'sky' as const, points: years.map((x, i) => ({ x, y: 22_000 * (i + 2) + 9_000 * i * Math.cos(i / 7) })) },
  ]
  return (
    <Suspense fallback={<Loading />}>
      <LineChart
        series={series}
        markers={[{ x: 2038, label: '60 ans', colour: 'accent' }, { x: 2043, label: '65 ans', colour: 'sky' }]}
        yFormat={(y) => formatCompactMoney(y, lang)}
        yDetail={(y) => formatMoney(y, lang)}
        xTitle={(x) => String(x)}
        ariaLabel="Deux courbes d’exemple, de 2030 à 2060."
        height={240}
      />
    </Suspense>
  )
}

function TableChooserSpecimen() {
  const [k, setK] = useState<'prudent' | 'neutral' | 'bold'>('neutral')
  return (
    <TableChooser
      label="Scénario"
      ariaLabel="Exemple"
      value={k}
      onSelect={setK}
      options={[
        { key: 'prudent', label: 'Prudent' },
        { key: 'neutral', label: 'Neutre' },
        { key: 'bold', label: 'Audacieux' },
      ]}
      trailing={<Chip>CSV</Chip>}
    />
  )
}

function SubTabsSpecimen() {
  const [k, setK] = useState<'self' | 'spouse'>('self')
  return (
    <SubTabs
      ariaLabel="Exemple"
      value={k}
      onSelect={setK}
      options={[
        { key: 'self', label: 'Moi', icon: 'user-bold' },
        { key: 'spouse', label: 'Partenaire', icon: 'users-three-bold' },
      ]}
    />
  )
}

function ChipSpecimen() {
  const [on, setOn] = useState(true)
  const [open, setOpen] = useState(false)
  return (
    <ChipGroup label="Cinq formes">
      <Chip selected={on} onClick={() => setOn((x) => !x)}>
        bascule
      </Chip>
      <Chip onClick={() => {}}>action</Chip>
      <Chip to="/dev/kit">lien</Chip>
      <Chip>étiquette</Chip>
      <Chip expanded={open} onClick={() => setOpen((x) => !x)}>
        dépliant
      </Chip>
    </ChipGroup>
  )
}

function SwitchSpecimen() {
  const [on, setOn] = useState(true)
  return <Switch checked={on} onChange={setOn} label="Répartir au mieux entre conjoints" hint="Un réglage oui / non : le bouton glisse, l’état est dit en mots." />
}

function ModalSpecimen() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
        Ouvrir le dialogue
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Un dialogue">
        <p>Échap, le fond ou ✕ le ferment ; le focus revient au bouton.</p>
      </Modal>
    </>
  )
}

function ConfirmSpecimen() {
  const confirm = useConfirm()
  const notice = useNotice()
  return (
    <Cluster>
      <button
        type="button"
        className="btn btn--sm btn--danger"
        onClick={async () => {
          const ok = await confirm({ message: 'Effacer tout ? Le profil sera retiré de cet appareil ; sans export, rien ne le ramène.' })
          notice(ok ? 'Confirmé' : 'Annulé')
        }}
      >
        Demander confirmation
      </button>
      <button type="button" className="btn btn--sm" onClick={() => notice('Profil exporté')}>
        Afficher un avis
      </button>
    </Cluster>
  )
}

function ENTRIES(): Entry[] {
  return [
    {
      cat: 'Fondations',
      name: 'Icon',
      file: 'src/components/Icon.tsx',
      exports: ['Icon', 'InlineIcon'],
      kw: 'icône phosphor glyphe',
      render: () => (
        <Cluster>
          <Icon name="user-bold" size={28} />
          <Icon name="chart-line-up-bold" size={28} />
          <Icon name="info-bold" size={28} />
          <Icon name="download-simple-bold" size={28} />
        </Cluster>
      ),
    },
    {
      cat: 'Fondations',
      name: 'Cluster',
      file: 'src/components/Layout.tsx',
      exports: ['Cluster'],
      kw: 'rangée flex wrap boutons',
      render: () => (
        <Cluster fill>
          <button type="button" className="btn btn--sm">Un</button>
          <button type="button" className="btn btn--sm">Deux</button>
          <button type="button" className="btn btn--sm">Trois</button>
        </Cluster>
      ),
    },
    {
      cat: 'Fondations',
      name: 'Rail',
      file: 'src/components/Layout.tsx',
      exports: ['Rail'],
      kw: 'rangée défile hscroll',
      render: () => (
        <Rail>
          {Array.from({ length: 14 }, (_, i) => (
            <Chip key={i}>{`${55 + i} ans`}</Chip>
          ))}
        </Rail>
      ),
    },
    { cat: 'Saisie', name: 'EditField', file: 'src/components/EditField.tsx', kw: 'champ texte saisie input', render: () => <EditFieldSpecimen /> },
    { cat: 'Saisie', name: 'Slider', file: 'src/components/Slider.tsx', kw: 'curseur glissière âge plage', render: () => <SliderSpecimen /> },
    { cat: 'Saisie', name: 'NumberField', file: 'src/components/NumberField.tsx', kw: 'nombre montant pourcentage année âge saisie', render: () => <NumberFieldSpecimen /> },
    { cat: 'Saisie', name: 'FieldRow', file: 'src/components/FieldRow.tsx', kw: 'champ étiquette indice libellé', render: () => <FieldRowSpecimen /> },
    {
      cat: 'Saisie',
      name: 'FieldInfo',
      file: 'src/components/FieldInfo.tsx',
      kw: 'ⓘ où trouver ce chiffre aide libellé page officielle',
      render: () => (
        <div className="field-row__control">
          <span>Un chiffre à trouver sur un relevé</span>
          <FieldInfo id="earnings" label="Revenus de travail admissibles" />
        </div>
      ),
    },
    { cat: 'Saisie', name: 'Chip', file: 'src/components/Chip.tsx', exports: ['Chip', 'ChipGroup'], kw: 'pastille filtre bascule', render: () => <ChipSpecimen /> },
    { cat: 'Saisie', name: 'Switch', file: 'src/components/Switch.tsx', kw: 'interrupteur oui non réglage bascule', render: () => <SwitchSpecimen /> },
    { cat: 'Saisie', name: 'TableChooser', file: 'src/components/TableChooser.tsx', kw: 'tableau choisir scénario hypothèses entête', render: () => <TableChooserSpecimen /> },
    { cat: 'Saisie', name: 'SubTabs', file: 'src/components/SubTabs.tsx', kw: 'onglets segmenté', render: () => <SubTabsSpecimen /> },
    {
      cat: 'Affichage',
      name: 'SectionHeader',
      file: 'src/components/SectionHeader.tsx',
      kw: 'titre section en-tête',
      render: () => <SectionHeader title="Régime de rentes du Québec" subtitle="Retraite Québec" icon="info-bold" />,
    },
    { cat: 'Graphiques', name: 'LineChart', file: 'src/components/charts/LineChart.tsx', exports: ['LineChart'], kw: 'graphique courbe ligne série recharts', render: () => <LineChartSpecimen /> },
    { cat: 'Graphiques', name: 'StackedBarChart', file: 'src/components/charts/StackedBarChart.tsx', exports: ['StackedBarChart'], kw: 'graphique barres empilées sources revenus recharts', render: () => <StackedBarChartSpecimen /> },
    { cat: 'Affichage', name: 'PageHead', file: 'src/components/PageHead.tsx', kw: 'titre page h1 en-tête', render: () => <PageHead title="Résultats" subtitle="Le titre unique d’une page, et une ligne discrète dessous." /> },
    {
      cat: 'Affichage',
      name: 'ImpactMeter',
      file: 'src/components/ImpactMeter.tsx',
      kw: 'impact niveau bas élevé hypothèse indicateur',
      render: () => (
        <>
          <ImpactMeter level="low" tilt="cautious" levelLabel="Bas" tiltLabel="Hypothèse prudente : le plan a de la marge" whyTitle="Pourquoi ça compte :" why="Une phrase sur ce que ce chiffre change au plan." />
          <ImpactMeter level="typical" tilt="middle" levelLabel="Typique" tiltLabel="Hypothèse centrale" whyTitle="Pourquoi ça compte :" why="Une phrase sur ce que ce chiffre change au plan." />
          <ImpactMeter level="above" tilt="optimistic" levelLabel="Très élevé" tiltLabel="Hypothèse optimiste : le plan en dépend" whyTitle="Pourquoi ça compte :" why="Une phrase sur ce que ce chiffre change au plan." outside="Au-delà de ce que couvrent les trois scénarios." />
        </>
      ),
    },
    { cat: 'Affichage', name: 'EmptyState', file: 'src/components/EmptyState.tsx', kw: 'vide rien', render: () => <EmptyState tone="calm">Rien à montrer pour l’instant.</EmptyState> },
    { cat: 'Affichage', name: 'SectionNav', file: 'src/components/SectionNav.tsx', kw: 'sections ancre carte navigation page longue', render: () => <SectionNav ariaLabel="Sections (exemple)" links={[{ id: 'devkit-nav-a', label: 'La réponse' }, { id: 'devkit-nav-b', label: 'Comparer' }, { id: 'devkit-nav-c', label: 'Paramètres', arc: 'Vérifier' }]} /> },
    { cat: 'Affichage', name: 'NextStep', file: 'src/components/NextStep.tsx', kw: 'suivant prochaine étape action', render: () => <NextStep to="/resultats" label="Voir mon résultat"><p>Votre profil est assez complet pour une réponse.</p></NextStep> },
    {
      cat: 'Feedback',
      name: 'StatusMessage',
      file: 'src/components/StatusMessage.tsx',
      kw: 'message statut erreur',
      render: () => (
        <>
          <StatusMessage tone="info">Information</StatusMessage>
          <StatusMessage tone="success">Enregistré</StatusMessage>
          <StatusMessage tone="error">Montant invalide</StatusMessage>
        </>
      ),
    },
    {
      cat: 'Feedback',
      name: 'Skeleton',
      file: 'src/components/Skeleton.tsx',
      kw: 'chargement forme réserve',
      render: () => (
        <>
          <Skeleton count={2} />
          <Loading />
        </>
      ),
    },
    { cat: 'Feedback', name: 'Modal', file: 'src/components/Modal.tsx', kw: 'dialogue fenêtre', render: () => <ModalSpecimen /> },
    { cat: 'Feedback', name: 'useConfirm', file: 'src/lib/confirm.tsx', exports: ['ConfirmProvider', 'useConfirm'], kw: 'confirmer destructif toast avis', render: () => <ConfirmSpecimen /> },
  ]
}

export function DevKit() {
  const t = useT()
  const { lang, setLang } = useLang()
  const [theme, setThemeState] = useState(getTheme)
  const [contrast, setContrastState] = useState(getContrast)
  const [scale, setScale] = useState<TextScale>(getTextScale)
  const [q, setQ] = useState('')

  const entries = useMemo(ENTRIES, [])
  const needle = q.trim().toLowerCase()
  const shown = entries.filter((e) => !needle || (e.name + ' ' + e.kw + ' ' + e.cat).toLowerCase().includes(needle))
  const cats = [...new Set(shown.map((e) => e.cat))]

  return (
    <div className="devkit">
      <header className="devkit__head">
        <Link to="/" className="devkit__back">
          ← {t.appName}
        </Link>
        <h1>Galerie des composants</h1>
        <Cluster>
          <Chip selected={theme === 'night'} onClick={() => { const n = theme === 'night' ? 'day' : 'night'; setTheme(n); setThemeState(n) }}>
            nuit
          </Chip>
          <Chip selected={contrast === 'high'} onClick={() => { const n = contrast === 'high' ? 'normal' : 'high'; setContrast(n); setContrastState(n) }}>
            contraste élevé
          </Chip>
          <Chip selected={lang === 'en'} onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}>
            English
          </Chip>
          {TEXT_SCALES.map((s) => (
            <Chip key={s} selected={scale === s} onClick={() => { setTextScale(s); setScale(s) }}>
              {s === 'normal' ? 'texte 100 %' : s === 'large' ? 'texte 115 %' : 'texte 130 %'}
            </Chip>
          ))}
        </Cluster>
        <EditField value={q} onChange={setQ} placeholder="Chercher un composant…" ariaLabel="Chercher" submitIcon={null} />
      </header>
      {cats.map((cat) => (
        <section key={cat} className="devkit__cat">
          <h2>{cat}</h2>
          {shown
            .filter((e) => e.cat === cat)
            .map((e) => (
              <article key={e.name} className="devkit__entry surface" id={`kit-${e.name}`}>
                <header className="devkit__entry-head">
                  <h3>{e.name}</h3>
                  <code className="mono">{e.file.replace('src/', '')}</code>
                </header>
                {e.render()}
              </article>
            ))}
        </section>
      ))}
    </div>
  )
}
