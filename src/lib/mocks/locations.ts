// demo data only

export type LocationStatus = 'available' | 'occupied' | 'maintenance'

export type Location = {
  id: string
  title: string
  city: string
  address: string
  lat: number
  lng: number
  capacity: number
  /** Monthly price in EUR. For per-desk listings, this is the per-desk price. */
  pricePerMonth: number
  /** If true, `pricePerMonth` is the per-desk price (flex/coworking). */
  perDesk?: boolean
  status: LocationStatus
}

export const STATUS_LABEL: Record<LocationStatus, string> = {
  available: 'Disponible',
  occupied: 'Loué',
  maintenance: 'Maintenance',
}

export const STATUS_COLOR: Record<LocationStatus, string> = {
  available: '#10b981', // emerald-500
  occupied: '#f59e0b', // amber-500
  maintenance: '#6b7280', // gray-500
}

export const locations: Array<Location> = [
  {
    id: 'loc-paris-9',
    title: 'Bureau privatif 4p — Paris 9 Trinité',
    city: 'Paris',
    address: '14 rue de la Trinité, 75009 Paris',
    lat: 48.8755,
    lng: 2.3324,
    capacity: 4,
    pricePerMonth: 4200,
    status: 'available',
  },
  {
    id: 'loc-paris-11',
    title: 'Open-space 20p — Paris 11 Bastille',
    city: 'Paris',
    address: '12 rue de la Roquette, 75011 Paris',
    lat: 48.8553,
    lng: 2.3725,
    capacity: 20,
    pricePerMonth: 12000,
    status: 'occupied',
  },
  {
    id: 'loc-lyon',
    title: 'Open-space 12p — Lyon Part-Dieu',
    city: 'Lyon',
    address: '85 bd Marius Vivier Merle, 69003 Lyon',
    lat: 45.7606,
    lng: 4.8597,
    capacity: 12,
    pricePerMonth: 6800,
    status: 'occupied',
  },
  {
    id: 'loc-marseille',
    title: 'Desk flexible — Marseille Vieux-Port',
    city: 'Marseille',
    address: 'Quai du Port, 13002 Marseille',
    lat: 43.2965,
    lng: 5.3698,
    capacity: 30,
    pricePerMonth: 290,
    perDesk: true,
    status: 'available',
  },
  {
    id: 'loc-bordeaux',
    title: 'Salle de réunion 8p — Bordeaux Mériadeck',
    city: 'Bordeaux',
    address: 'Cours du Maréchal Juin, 33000 Bordeaux',
    lat: 44.8412,
    lng: -0.5878,
    capacity: 8,
    pricePerMonth: 80,
    status: 'maintenance',
  },
  {
    id: 'loc-lille',
    title: 'Coworking 50p — Lille Euralille',
    city: 'Lille',
    address: '152 av de la République, 59000 Lille',
    lat: 50.6365,
    lng: 3.0758,
    capacity: 50,
    pricePerMonth: 240,
    perDesk: true,
    status: 'available',
  },
  {
    id: 'loc-nantes',
    title: 'Bureau privatif 2p — Nantes Île de Nantes',
    city: 'Nantes',
    address: 'Quai des Antilles, 44200 Nantes',
    lat: 47.2069,
    lng: -1.5639,
    capacity: 2,
    pricePerMonth: 1800,
    status: 'available',
  },
  {
    id: 'loc-toulouse',
    title: 'Desk flex — Toulouse Compans',
    city: 'Toulouse',
    address: 'Bd Lascrosses, 31000 Toulouse',
    lat: 43.6125,
    lng: 1.4318,
    capacity: 24,
    pricePerMonth: 250,
    perDesk: true,
    status: 'available',
  },
]

export function formatPrice(loc: Location): string {
  const eur = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(loc.pricePerMonth)
  return loc.perDesk ? `${eur} / desk / mois` : `${eur} / mois`
}
