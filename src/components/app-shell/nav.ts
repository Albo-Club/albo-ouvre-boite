import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Package,
  MapPin,
  Calendar,
  ListTodo,
  CreditCard,
  Receipt,
  Users,
  Mail,
  Settings,
} from 'lucide-react'

export type NavLeaf = {
  title: string
  to: string
  icon?: LucideIcon
  adminOnly?: boolean
  badge?: string
}

export type NavGroup = {
  label: string
  items: NavLeaf[]
  secondary?: boolean
}

export function getNavGroups(): NavGroup[] {
  return [
    {
      label: 'Platform',
      items: [
        {
          title: 'Dashboard',
          to: '/app/$orgSlug',
          icon: LayoutDashboard,
        },
        {
          title: 'Items',
          to: '/app/$orgSlug/items',
          icon: Package,
        },
        {
          title: 'Locations',
          to: '/app/$orgSlug/map',
          icon: MapPin,
          badge: 'Demo',
        },
        {
          title: 'Calendar',
          to: '/app/$orgSlug/calendar',
          icon: Calendar,
          badge: 'Demo',
        },
        {
          title: 'Tasks',
          to: '/app/$orgSlug/tasks',
          icon: ListTodo,
          badge: 'Demo',
        },
      ],
    },
    {
      label: 'Billing',
      items: [
        {
          title: 'Payments',
          to: '/app/$orgSlug/billing',
          icon: CreditCard,
          badge: 'Demo',
        },
        {
          title: 'Invoices',
          to: '/app/$orgSlug/billing',
          icon: Receipt,
          badge: 'Demo',
        },
      ],
    },
    {
      label: 'Workspace',
      secondary: true,
      items: [
        {
          title: 'Members',
          to: '/app/$orgSlug/settings/members',
          icon: Users,
          adminOnly: true,
        },
        {
          title: 'Invitations',
          to: '/app/$orgSlug/settings/invitations',
          icon: Mail,
          adminOnly: true,
        },
        {
          title: 'Settings',
          to: '/app/$orgSlug/settings',
          icon: Settings,
        },
      ],
    },
  ]
}
