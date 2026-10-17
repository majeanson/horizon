// The deepest dip of a line of the market fan, read in the dollars the picture is drawn in. In nominal dollars a plan that earns more than prices rise hardly ever "falls", so the dip
// is found on the SAME values the reader sees (today's dollars by default), never on the engine's nominal ones. It is the largest fall from an earlier high — not the fall after the
// highest point of the plan, which for a plan that ends richer than it peaked is nothing.

export interface FanPoint {
  x: number
  y: number
}

/** The earlier high and the low that follows it, for the largest fall from a high the line ever makes. `fell` is false for a line that never goes below a point it has already reached. */
export function deepestDip(points: readonly FanPoint[]): { high: FanPoint; low: FanPoint; fell: boolean } {
  let high = points[0]
  let best = { high: points[0], low: points[0], drop: 0 }
  for (const p of points) {
    if (p.y > high.y) high = p
    if (high.y - p.y > best.drop) best = { high, low: p, drop: high.y - p.y }
  }
  return { high: best.high, low: best.low, fell: best.drop > 0 }
}
