import type { ReactNode } from 'react'

// The ONE on/off setting: a real switch (role="switch", aria-checked), with its label beside it and an optional line
// under it saying what it does. A lone toggle used to be a Chip whose « on » state was a 1 px border — nobody could
// tell « Répartir au mieux entre conjoints » was on by default. A switch is the shape every phone already taught:
// the knob is on the right when it is on. Colour is never the only cue: the knob moves, and the state is in the ARIA.
//
//   <Switch checked={on} onChange={setOn} label="Placer d’abord le surplus dans le REER" hint="…" />
//
// A choose-ONE among several is not a switch: that is SubTabs (or a Chip radio group).
export function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; hint?: ReactNode; disabled?: boolean }) {
  return (
    <div className="switch-row">
      <button type="button" role="switch" aria-checked={checked} className={'switch' + (checked ? ' is-on' : '')} onClick={() => onChange(!checked)} disabled={disabled}>
        <span className="switch__track" aria-hidden="true">
          <span className="switch__knob" />
        </span>
        <span className="switch__label">{label}</span>
      </button>
      {hint != null && <p className="field-row__hint switch__hint">{hint}</p>}
    </div>
  )
}
