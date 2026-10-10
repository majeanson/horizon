// A bar for one figure on a stated scale. A picture of the figure beside it, never the only carrier: the figure and what a full bar stands for are text
// next to it, and the bar says the same to assistive technology as a meter. No bar is drawn when there is nothing to draw (the figure is pending, or none).
// The percent arrives from the sheet view (lib/sheetView.ts): the bar draws it, it does not work it out.
export function StatBar({ name, percent, valueText }: { name: string; percent: number | null; valueText: string }) {
  if (percent === null) return <div className="sheet-bar sheet-bar--empty" aria-hidden="true" />
  return (
    <div className="sheet-bar" role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={valueText}>
      <span className="sheet-bar__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}
