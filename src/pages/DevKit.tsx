import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Accordion, AccordionItem, AccordionMode, type AccordionOpen } from '../components/Accordion'
import { Cascade } from '../components/Cascade'
import { CountUp } from '../components/CountUp'
import { Chip, ChipGroup } from '../components/Chip'
import { ConceptPip, FamilyPip } from '../components/ConceptPip'
import { DisplayControls } from '../components/DisplayControls'
import { ReadingHelp } from '../components/ReadingHelp'
import { TimeBudget } from '../components/TimeBudget'
import type { TimeBudget as TimeBudgetValue } from '../lib/timeBudget'
import { CONCEPTS, FAMILIES, FAMILY_HUE, type ConceptId } from '../lib/concepts'
import { DripQuestion } from '../components/DripQuestion'
import { DemoAnswer } from '../components/DemoAnswer'
import { LiveAnswer } from '../components/LiveAnswer'
import { NextStep } from '../components/NextStep'
import { EditField } from '../components/EditField'
import { EmptyState } from '../components/EmptyState'
import { FieldHelp } from '../components/FieldHelp'
import { FieldInfo } from '../components/FieldInfo'
import { FieldRow } from '../components/FieldRow'
import { Figure } from '../components/Figure'
import type { Trace } from '../engine/trace'
import { Icon } from '../components/Icon'
import { Loading } from '../components/Loading'
import { Modal } from '../components/Modal'
import { NumberField } from '../components/NumberField'
import { Slider } from '../components/Slider'
import { PageHead } from '../components/PageHead'
import { Cluster, Rail } from '../components/Layout'
import { SectionHeader } from '../components/SectionHeader'
import { EstFlag } from '../components/EstFlag'
import { Gloss } from '../components/Gloss'
import { SectionNav } from '../components/SectionNav'
import { ImpactMeter } from '../components/ImpactMeter'
import { Skeleton } from '../components/Skeleton'
import { StatusMessage } from '../components/StatusMessage'
import { Fold } from '../components/Fold'
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

/** Three blocks, one open at a time or all at once; the third is « done » and folds away in the all-open shape. */
function AccordionSpecimen() {
  const [open, setOpen] = useState<AccordionOpen>('un')
  return (
    <>
      <AccordionMode open={open} onOpen={setOpen} first="un" />
      <Accordion ids={['un', 'deux', 'trois']} open={open} onOpen={setOpen} done={new Set(['trois'])} doneCount={new Map([['trois', 4]])}>
        <AccordionItem id="un" title="Le scénario" subtitle="Les trois hypothèses d’un coup." concept="scenario">
          <p className="field-row__hint">Le corps du premier bloc.</p>
        </AccordionItem>
        <AccordionItem id="deux" title="Les prix" subtitle="L’inflation et la hausse des salaires." concept="inflation" details="Ce que la mesure veut dire, replié sous « En savoir plus ».">
          <p className="field-row__hint">Le corps du deuxième bloc.</p>
        </AccordionItem>
        <AccordionItem id="trois" title="Les placements" subtitle="Le rendement des comptes." concept="rendement">
          <p className="field-row__hint">Le corps du troisième bloc, dont tous les chiffres sont confirmés.</p>
        </AccordionItem>
      </Accordion>
    </>
  )
}

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

// A small trace for the Figure specimen: a pension that a start age moves, with its three layers (formula, inputs, official page).
const FIGURE_SPECIMEN: Trace = {
  labelKey: 'rrq',
  value: 1180.5,
  today: 1020,
  start: { year: 2043, month: 4 },
  parts: [
    { labelKey: 'rrqBase', value: 900, kind: 'money', op: 'add' },
    { labelKey: 'rrqFirst', value: 120, kind: 'money', op: 'add' },
    { labelKey: 'rrqSecond', value: 80, kind: 'money', op: 'add' },
    { labelKey: 'rrqAdjustment', value: 1.0755, kind: 'pct', op: 'mul' },
  ],
  inputs: [
    { labelKey: 'retirement', value: 60, kind: 'age', door: 'person:self' },
    { labelKey: 'rrqStart', value: 65, kind: 'age', door: 'person:self' },
  ],
  source: { title: 'Retirement pension paid as of age 65 and 1 month (1036-1-RRQ, 2025-06)', url: 'https://www.retraitequebec.gouv.qc.ca/' },
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

// ReadingHelp is a full-screen dialog: the kit opens it on demand (controlled), so it never covers the page it is judged on.
function ReadingHelpSpecimen() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <ReadingHelp open={open} onClose={() => setOpen(false)} />
    </>
  )
}

// TimeBudget is a full-screen dialog too: opened on demand, its choice kept in the kit's own state — never written to the device.
function TimeBudgetSpecimen() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<TimeBudgetValue | null>(null)
  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <TimeBudget
        open={open}
        value={value}
        onChoose={(b) => {
          setValue(b)
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

// Every concept of the registry, grouped by family: the page to judge the hues and the glyphs on (day, night, contrast, text size).
function ConceptPipSpecimen() {
  const ids = Object.keys(CONCEPTS) as ConceptId[]
  return (
    <div className="pip-legend">
      {FAMILIES.map((family) => (
        <div key={family} className={`pip-legend__item fam--${FAMILY_HUE[family]}`}>
          <FamilyPip family={family} size="lg" />
          <span>
            <span className="pip-legend__name">{family}</span>
            <span className="pip-legend__what">
              {ids.filter((id) => CONCEPTS[id].family === family).map((id) => (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginInlineEnd: '0.6rem' }}>
                  <ConceptPip id={id} size="sm" /> {id}
                </span>
              ))}
            </span>
          </span>
        </div>
      ))}
    </div>
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

// Motion (styles/motion.css) is CSS, not a component: this specimen re-mounts a small page so its entrances can be watched again, and lines up the
// things that move under a hand — a chip, a tab, a button, a switch, a fold, a gauge — with the rule they all follow written beside them.
/** Cascade: the digits of a figure rise into place one after another — the text is whole at once; a new text replays it. */
function CascadeSpecimen() {
  const [n, setN] = useState(1507.65)
  const { lang } = useLang()
  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      <p className="answer__big">
        <Cascade>{'Il faudrait mettre de côté ' + formatMoney(n, lang) + ' de plus par année.'}</Cascade>
      </p>
      <p className="answer__big">
        <CountUp>{'À ' + formatMoney(n, lang) + ' par année : dès 52 ans.'}</CountUp>
      </p>
      <p className="field-row__hint" style={{ margin: 0 }}>
        Premier : les chiffres montent en place. Second : le montant compte jusqu’à sa valeur (et, à un autre chiffre, depuis l’ancien) ; l’âge à côté ne bouge jamais, et le texte est entier dans la page dès la première image.
      </p>
      <Cluster>
        <Chip onClick={() => setN((x) => Math.round((x * 1.37 + 211) * 100) / 100)}>Un autre chiffre</Chip>
      </Cluster>
    </div>
  )
}

function MotionSpecimen() {
  const [take, setTake] = useState(0)
  const [on, setOn] = useState(true)
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const [sw, setSw] = useState(true)
  const [amount, setAmount] = useState(15000)
  const [age, setAge] = useState(62)
  const [pulse, setPulse] = useState({ count: 0, dir: 'earlier' as 'earlier' | 'later' })
  const [answer, setAnswer] = useState(62)
  const move = (to: number) => {
    setPulse((p) => ({ count: p.count + 1, dir: to < answer ? 'earlier' : 'later' }))
    setAnswer(to)
  }
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Cluster>
        <button type="button" className="btn btn--sm" onClick={() => setTake((t) => t + 1)}>
          Rejouer les entrées
        </button>
        <p className="field-row__hint" style={{ margin: 0 }}>
          Transformations seulement : un texte ne naît jamais transparent, un bouton ou un chiffre se pose sans rebondir, et tout s’éteint sous « réduire les animations ».
        </p>
      </Cluster>
      <div key={take} className="page-body">
        <div className="surface" style={{ padding: '0.9rem 1.1rem' }}>
          <SectionHeader concept="rrq" title="Une carte arrive" subtitle="Elle monte en place ; sa pastille éclot dans la teinte de sa famille, et grandit sous la souris." />
        </div>
        <Cluster>
          <Chip selected={on} onClick={() => setOn((x) => !x)} concept="reer">
            bascule
          </Chip>
          <Chip onClick={() => {}} concept="maison">
            action
          </Chip>
          <button type="button" className="btn btn--primary btn--sm">
            Bouton
          </button>
        </Cluster>
        <SubTabs ariaLabel="Mouvement — onglets" value={tab} onSelect={setTab} options={[{ key: 'a', label: 'Moi', concept: 'personne' }, { key: 'b', label: 'Nous', concept: 'famille' }]} />
        <Switch checked={sw} onChange={setSw} label="Un interrupteur" />
        <div className="refine__gauge">
          <div className="refine__meter">
            <span className="refine__meter-fill" style={{ width: '62%' }} />
          </div>
          <span className="refine__meter-count">5 / 8</span>
        </div>
        <ImpactMeter level="typical" tilt="middle" ends={['Très bas', 'Très élevé']} levelLabel="Typique" tiltLabel="Le marqueur se pose sur sa marche" whyTitle="Pourquoi ça compte :" />
        <Fold summary="Un repli qui s’ouvre">
          <p className="field-row__hint">Son corps glisse en place au lieu d’apparaître.</p>
        </Fold>
        <FieldRow label="Une case de chiffre" infoId="tfsaRoom" hint="Flèches haut / bas : un pas qui suit la taille du chiffre (Maj : dix pas). Échap redonne le chiffre gardé. Un texte refusé tremble une fois et la case rougit ; un chiffre gardé s’entoure de vert un instant.">
          {(a) => <NumberField kind="money" value={amount} onChange={setAmount} min={0} max={5000000} id={a.id} ariaDescribedBy={a.describedBy} />}
        </FieldRow>
        <Slider label="Un curseur" value={age} min={55} max={70} valueText={(v) => v + ' ans'} onCommit={setAge} marks={[{ value: 60, label: '60' }, { value: 65, label: '65' }]} />
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <p className="verdict__line">
            <span className="verdict__big">
              <span className="verdict__age-wrap">
                <strong key={answer} className="verdict__age">
                  <Cascade>{answer + ' ans'}</Cascade>
                </strong>
                {pulse.count > 0 && <span key={pulse.count} className="answer-pulse" data-dir={pulse.dir} aria-hidden="true" />}
              </span>
            </span>
          </p>
          <Cluster>
            <Chip onClick={() => move(Math.max(55, answer - 2))}>Plus tôt (anneau vert)</Chip>
            <Chip onClick={() => move(Math.min(70, answer + 2))}>Plus tard (anneau doré)</Chip>
          </Cluster>
        </div>
        <EmptyState tone="calm" icon="chart-line-up-bold">
          Une page vide porte une image de ce qui viendra.
        </EmptyState>
      </div>
    </div>
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
    { cat: 'Fondations', name: 'Mouvement (CSS)', file: 'src/styles/motion.css', kw: 'animation transition mouvement entrée survol pression réduire les animations', render: () => <MotionSpecimen /> },
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
    {
      cat: 'Saisie',
      name: 'FieldHelp',
      file: 'src/components/FieldHelp.tsx',
      kw: 'ⓘ à propos de ce champ aide explication choix',
      render: () => (
        <div className="field-row__control">
          <span>Un âge que la personne choisit</span>
          <FieldHelp id="retirementAge" label="Âge de la retraite" />
        </div>
      ),
    },
    { cat: 'Saisie', name: 'Chip', file: 'src/components/Chip.tsx', exports: ['Chip', 'ChipGroup'], kw: 'pastille filtre bascule', render: () => <ChipSpecimen /> },
    { cat: 'Saisie', name: 'Switch', file: 'src/components/Switch.tsx', kw: 'interrupteur oui non réglage bascule', render: () => <SwitchSpecimen /> },
    { cat: 'Saisie', name: 'TableChooser', file: 'src/components/TableChooser.tsx', kw: 'tableau choisir scénario hypothèses entête', render: () => <TableChooserSpecimen /> },
    { cat: 'Affichage', name: 'Fold', file: 'src/components/Fold.tsx', kw: 'replier déplier explication détails comment lire', render: () => <Fold summary="Comment lire cette mesure"><p className="field-row__hint">Ce que la mesure veut dire, et ce que représente une barre pleine.</p></Fold> },
    { cat: 'Affichage', name: 'Accordion', file: 'src/components/Accordion.tsx', exports: ['Accordion', 'AccordionItem', 'AccordionMode'], kw: 'accordéon un bloc à la fois suivant précédent replier blocs terminés', render: () => <AccordionSpecimen /> },
    { cat: 'Saisie', name: 'SubTabs', file: 'src/components/SubTabs.tsx', kw: 'onglets segmenté', render: () => <SubTabsSpecimen /> },
    { cat: 'Affichage', name: 'DisplayControls', file: 'src/components/DisplayControls.tsx', kw: 'affichage thème contraste taille texte lisibilité accessibilité', render: () => <DisplayControls /> },
    { cat: 'Affichage', name: 'ReadingHelp', file: 'src/components/ReadingHelp.tsx', kw: 'lire confortablement langue taille lettres accueil première visite accessibilité', render: () => <ReadingHelpSpecimen /> },
    { cat: 'Affichage', name: 'TimeBudget', file: 'src/components/TimeBudget.tsx', kw: 'temps minutes accueil première visite façon de commencer porte', render: () => <TimeBudgetSpecimen /> },
    { cat: 'Affichage', name: 'ConceptPip', file: 'src/components/ConceptPip.tsx', exports: ['ConceptPip', 'FamilyPip'], kw: 'pastille concept icône couleur famille glossaire', render: () => <ConceptPipSpecimen /> },
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
          <ImpactMeter level="typical" tilt="middle" ends={['Très bas', 'Très élevé']} levelLabel="Typique" tiltLabel="Hypothèse centrale" whyTitle="Pourquoi ça compte :" why="Une phrase sur ce que ce chiffre change au plan." />
          <ImpactMeter level="above" tilt="optimistic" levelLabel="Très élevé" tiltLabel="Hypothèse optimiste : le plan en dépend" whyTitle="Pourquoi ça compte :" why="Une phrase sur ce que ce chiffre change au plan." outside="Au-delà de ce que couvrent les trois scénarios." />
        </>
      ),
    },
    {
      cat: 'Affichage',
      name: 'EmptyState',
      file: 'src/components/EmptyState.tsx',
      kw: 'vide rien icône',
      render: () => (
        <>
          <EmptyState tone="calm">Rien à montrer pour l’instant.</EmptyState>
          <EmptyState tone="calm" icon="chart-line-up-bold">
            Avec une image : « pas encore », pas « cassé ».
          </EmptyState>
        </>
      ),
    },
    {
      cat: 'Affichage',
      name: 'Cascade',
      file: 'src/components/Cascade.tsx',
      kw: 'chiffres arrivée animation réponse nombre',
      render: () => <CascadeSpecimen />,
    },
    {
      cat: 'Affichage',
      name: 'CountUp',
      file: 'src/components/CountUp.tsx',
      kw: 'montant compte jusqu’à chiffre argent animation réponse',
      render: () => <CascadeSpecimen />,
    },
    { cat: 'Affichage', name: 'Gloss', file: 'src/components/Gloss.tsx', exports: ['Gloss', 'glossed'], kw: 'glossaire sigle abréviation lien explication', render: () => <p><Gloss>Votre rente du RRQ et la PSV commencent à l’âge choisi ; le REER et le CELI s’ajoutent.</Gloss></p> },
    { cat: 'Affichage', name: 'EstFlag', file: 'src/components/EstFlag.tsx', kw: 'estimé confirmer chiffre dépenses marque lien', render: () => <p>Dépenses à la retraite : 54 000 $ <EstFlag fact="household:spendingRetired" /></p> },
    { cat: 'Affichage', name: 'Figure', file: 'src/components/Figure.tsx', kw: 'chiffre calculé d’où vient formule source provenance trace rente pension', render: () => <Figure trace={FIGURE_SPECIMEN} after="par mois, en dollars d’aujourd’hui" /> },
    { cat: 'Affichage', name: 'SectionNav', file: 'src/components/SectionNav.tsx', kw: 'sections ancre carte navigation page longue', render: () => <SectionNav ariaLabel="Sections (exemple)" links={[{ id: 'devkit-nav-a', label: 'La réponse' }, { id: 'devkit-nav-b', label: 'Comparer' }, { id: 'devkit-nav-c', label: 'Paramètres', arc: 'Vérifier' }]} /> },
    { cat: 'Affichage', name: 'LiveAnswer', file: 'src/components/LiveAnswer.tsx', kw: 'réponse en direct âge bandeau', render: () => <LiveAnswer /> },
    { cat: 'Affichage', name: 'DemoAnswer', file: 'src/components/DemoAnswer.tsx', kw: 'exemple démo première visite accueil réponse ménage', render: () => <DemoAnswer /> },
    {
      cat: 'Affichage',
      name: 'DripQuestion',
      file: 'src/components/DripQuestion.tsx',
      kw: 'question chiffre estimé préciser accueil',
      render: () => <DripQuestion facts={[{ id: 'self:salary', owner: 'self', kind: 'salary' }]} impact={{ base: 60, swings: { 'self:salary': { down: 57, up: 63, years: 3 } }, range: null }} />,
    },
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
