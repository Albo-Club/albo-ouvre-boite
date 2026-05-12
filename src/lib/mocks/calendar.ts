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
    title: 'Visite — Bureau privatif Paris 9 Trinité (Acme Co)',
    dateOffset: 0,
    hour: 10,
    minutes: 0,
    durationMin: 45,
    type: 'demo',
    attendees: ['Maël', 'Acme Co'],
  },
  {
    id: 'e2',
    title: 'Sync disponibilités WeWork — Q2',
    dateOffset: 0,
    hour: 14,
    minutes: 0,
    durationMin: 60,
    type: 'focus',
    attendees: ['Benjamin', 'WeWork ops'],
  },
  {
    id: 'e3',
    title: 'Audit mobilier — client Lyon Part-Dieu',
    dateOffset: 1,
    hour: 9,
    minutes: 30,
    durationMin: 90,
    type: 'review',
    attendees: ['Clément', 'Léa'],
  },
  {
    id: 'e4',
    title: 'Restitution clés — Marseille Vieux-Port',
    dateOffset: 2,
    hour: 11,
    minutes: 0,
    durationMin: 30,
    type: 'meeting',
    attendees: ['Maël', 'Locataire sortant'],
  },
  {
    id: 'e5',
    title: 'Photo session — nouveau bureau Lille Euralille',
    dateOffset: 3,
    hour: 15,
    minutes: 0,
    durationMin: 120,
    type: 'meeting',
    attendees: ['Léa', 'Photographe'],
  },
  {
    id: 'e6',
    title: 'Maintenance climatisation — Bordeaux Mériadeck',
    dateOffset: 4,
    hour: 8,
    minutes: 0,
    durationMin: 180,
    type: 'focus',
    attendees: ['Clément', 'Prestataire HVAC'],
  },
]
