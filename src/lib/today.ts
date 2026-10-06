// The one place the app reads the clock. The engine never does (it takes `today` as an input), so a
// profile is projected from « now » only because THIS function says what now is.
export function today(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}
