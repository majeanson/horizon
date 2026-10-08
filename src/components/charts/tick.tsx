// The axis tick that says a year WITH its age: two lines of text under the axis (« 2043 » over « 63 ans »), drawn the
// way the library draws its own ticks (an SVG text at the tick's position). The second line is quieter: the age is the
// reading aid, the year is the coordinate.

export function TwoLineTick({ x, y, payload, lines }: { x?: number; y?: number; payload?: { value: number }; lines: (x: number) => readonly string[] }) {
  const [first, second] = lines(Number(payload?.value))
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fill="var(--ink-soft)" fontSize="0.78rem">
      <tspan x={x}>{first}</tspan>
      {second ? (
        <tspan x={x} dy={13} fontSize="0.7rem">
          {second}
        </tspan>
      ) : null}
    </text>
  )
}
