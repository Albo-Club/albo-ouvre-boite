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
    title: 'Wire up Stripe Checkout for Pro plan',
    description: 'Server function + webhook handler with HMAC verify.',
    status: 'todo',
    priority: 'high',
    assignee: 'Benjamin',
    dueOffset: 2,
  },
  {
    id: 't2',
    title: 'Audit RLS on items table',
    description: 'Check orgId scoping on every query/mutation.',
    status: 'todo',
    priority: 'high',
    assignee: 'Clément',
    dueOffset: 1,
  },
  {
    id: 't3',
    title: 'Refactor invite email template',
    description: 'Add org logo + sender name.',
    status: 'todo',
    priority: 'low',
    assignee: 'Léa',
    dueOffset: 7,
  },
  {
    id: 't4',
    title: 'Add 2FA flow with TOTP',
    description: 'Better Auth twoFactor plugin + backup codes.',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Benjamin',
    dueOffset: 5,
  },
  {
    id: 't5',
    title: 'Migrate items page to data table',
    description: 'TanStack Table + sort/filter/pagination.',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Benjamin',
    dueOffset: 3,
  },
  {
    id: 't6',
    title: 'Sentry → Vercel integration',
    description: 'Set up sourcemaps upload on deploy.',
    status: 'done',
    priority: 'low',
    assignee: 'Maël',
    dueOffset: -2,
  },
  {
    id: 't7',
    title: 'Tailwind v4 upgrade',
    description: 'CSS-first config, drop tailwind.config.js.',
    status: 'done',
    priority: 'medium',
    assignee: 'Léa',
    dueOffset: -5,
  },
  {
    id: 't8',
    title: 'Convex Better Auth integration',
    description: 'Magic link + convex() plugin.',
    status: 'done',
    priority: 'high',
    assignee: 'Clément',
    dueOffset: -7,
  },
  {
    id: 't9',
    title: 'Onboarding tour',
    description: 'First-login walkthrough for new orgs.',
    status: 'todo',
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
