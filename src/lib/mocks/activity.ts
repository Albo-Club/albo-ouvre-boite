// demo data only — not connected to Convex

function seededRandom(seed: number) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

export type ActivityPoint = {
  date: string
  items: number
  events: number
}

export function generateActivity(days = 30): ActivityPoint[] {
  const rng = seededRandom(42)
  const today = new Date()
  const out: ActivityPoint[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push({
      date: d.toISOString().slice(0, 10),
      items: Math.round(8 + rng() * 22),
      events: Math.round(2 + rng() * 18),
    })
  }
  return out
}
