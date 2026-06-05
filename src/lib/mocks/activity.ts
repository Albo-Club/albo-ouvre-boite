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

// Weekly pattern: peak Tue/Wed/Thu, lighter Mon/Fri, dip Sat/Sun.
// Mimics a typical office-management workload (visits, listings activity).
// Multiplier indexed by JS getDay(): 0=Sun, 1=Mon, …, 6=Sat.
const WEEKDAY_MULTIPLIER = [0.25, 0.85, 1.0, 1.05, 1.0, 0.75, 0.3]

export function generateActivity(days = 30): Array<ActivityPoint> {
  const rng = seededRandom(42)
  const today = new Date()
  const out: Array<ActivityPoint> = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const mult = WEEKDAY_MULTIPLIER[d.getDay()] ?? 1
    out.push({
      date: d.toISOString().slice(0, 10),
      items: Math.max(1, Math.round((6 + rng() * 22) * mult)),
      events: Math.max(0, Math.round((2 + rng() * 16) * mult)),
    })
  }
  return out
}
