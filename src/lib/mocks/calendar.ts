// demo data only

export type CalendarEvent = {
  id: string
  title: string
  dateOffset: number // days from today
  hour: number
  minutes: number
  durationMin: number
  type: 'meeting' | 'review' | 'focus' | 'demo'
  attendees: string[]
}

const types: Record<CalendarEvent['type'], string> = {
  meeting: 'Meeting',
  review: 'Review',
  focus: 'Focus block',
  demo: 'Demo',
}

export function eventTypeLabel(t: CalendarEvent['type']) {
  return types[t]
}

export const events: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Weekly stand-up',
    dateOffset: 0,
    hour: 9,
    minutes: 30,
    durationMin: 30,
    type: 'meeting',
    attendees: ['Maël', 'Clément', 'Benjamin'],
  },
  {
    id: 'e2',
    title: 'Product review',
    dateOffset: 0,
    hour: 14,
    minutes: 0,
    durationMin: 60,
    type: 'review',
    attendees: ['Benjamin', 'Léa'],
  },
  {
    id: 'e3',
    title: 'Focus — onboarding flow',
    dateOffset: 1,
    hour: 10,
    minutes: 0,
    durationMin: 120,
    type: 'focus',
    attendees: ['Benjamin'],
  },
  {
    id: 'e4',
    title: 'Customer demo · Acme',
    dateOffset: 2,
    hour: 15,
    minutes: 30,
    durationMin: 45,
    type: 'demo',
    attendees: ['Maël', 'Sales'],
  },
  {
    id: 'e5',
    title: 'Design critique',
    dateOffset: 3,
    hour: 11,
    minutes: 0,
    durationMin: 60,
    type: 'review',
    attendees: ['Léa', 'Benjamin', 'Clément'],
  },
  {
    id: 'e6',
    title: 'Retro',
    dateOffset: 4,
    hour: 16,
    minutes: 0,
    durationMin: 30,
    type: 'meeting',
    attendees: ['Maël', 'Benjamin', 'Clément', 'Léa'],
  },
]
