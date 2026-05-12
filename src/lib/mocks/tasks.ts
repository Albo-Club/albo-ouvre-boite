// demo data only

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
  dueOffset: number // days from today
}

export const initialTasks: Task[] = [
  {
    id: 't1',
    title: 'Photographier le bureau Bastille',
    description: 'Session photo pro + drone façade. Livrer 12 visuels HD.',
    status: 'todo',
    priority: 'high',
    assignee: 'Léa',
    dueOffset: 2,
  },
  {
    id: 't2',
    title: 'Relancer client retard paiement — Nantes Île de Nantes',
    description: 'Facture INV-2026-007 impayée depuis 21 jours.',
    status: 'todo',
    priority: 'high',
    assignee: 'Clément',
    dueOffset: 1,
  },
  {
    id: 't3',
    title: 'Mettre à jour disponibilités WeWork Q2',
    description: 'Synchroniser le calendrier des 8 sites partenaires.',
    status: 'todo',
    priority: 'low',
    assignee: 'Benjamin',
    dueOffset: 7,
  },
  {
    id: 't4',
    title: 'Préparation visite jeudi — Paris 9 Trinité',
    description: 'Brief commercial, dossier locataire, état des lieux entrant.',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Maël',
    dueOffset: 3,
  },
  {
    id: 't5',
    title: 'Refresh annonces — Toulouse Compans',
    description: 'Nouvelles photos, prix actualisés, mise à jour Ubiq + LinkedIn.',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Léa',
    dueOffset: 5,
  },
  {
    id: 't6',
    title: 'Signature bail — Marseille Vieux-Port',
    description: 'Bail commercial 3/6/9 signé, dépôt de garantie encaissé.',
    status: 'done',
    priority: 'low',
    assignee: 'Maël',
    dueOffset: -2,
  },
  {
    id: 't7',
    title: 'Livraison 4 bureaux ergonomiques — Lille Euralille',
    description: 'Mobilier Fleex livré, installation validée par le client.',
    status: 'done',
    priority: 'medium',
    assignee: 'Clément',
    dueOffset: -5,
  },
  {
    id: 't8',
    title: 'Renouvellement plan — Trinité Paris 9',
    description: 'Locataire renouvelé 18 mois, +5% indexation ILAT.',
    status: 'done',
    priority: 'high',
    assignee: 'Maël',
    dueOffset: -7,
  },
  {
    id: 't9',
    title: 'Audit mobilier — client Lyon Part-Dieu',
    description: 'Inventaire annuel, identification du matériel à remplacer.',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Léa',
    dueOffset: 10,
  },
]

export const PRIORITY_VARIANT: Record<
  TaskPriority,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
]
