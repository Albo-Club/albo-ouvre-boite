import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  ListTodo,
  Mail,
  MapPin,
  Package,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavLeaf = {
  /** i18n key under the `nav` namespace, e.g. `items.dashboard`. */
  titleKey: string
  to: string
  icon?: LucideIcon
  adminOnly?: boolean
  /** When true, render a `common:demo` badge. */
  demo?: boolean
}

export type NavGroup = {
  /** i18n key under the `nav` namespace, e.g. `groups.platform`. */
  labelKey: string
  items: Array<NavLeaf>
  secondary?: boolean
}

export function getNavGroups(): Array<NavGroup> {
  return [
    {
      labelKey: 'groups.platform',
      items: [
        {
          titleKey: 'items.dashboard',
          to: '/app/$orgSlug',
          icon: LayoutDashboard,
        },
        {
          titleKey: 'items.items',
          to: '/app/$orgSlug/items',
          icon: Package,
        },
        {
          titleKey: 'items.locations',
          to: '/app/$orgSlug/map',
          icon: MapPin,
          demo: true,
        },
        {
          titleKey: 'items.calendar',
          to: '/app/$orgSlug/calendar',
          icon: Calendar,
          demo: true,
        },
        {
          titleKey: 'items.tasks',
          to: '/app/$orgSlug/tasks',
          icon: ListTodo,
          demo: true,
        },
      ],
    },
    {
      labelKey: 'groups.billing',
      items: [
        {
          titleKey: 'items.payments',
          to: '/app/$orgSlug/billing',
          icon: CreditCard,
          demo: true,
        },
        {
          titleKey: 'items.invoices',
          to: '/app/$orgSlug/billing',
          icon: Receipt,
          demo: true,
        },
      ],
    },
    {
      labelKey: 'groups.workspace',
      secondary: true,
      items: [
        {
          titleKey: 'items.members',
          to: '/app/$orgSlug/settings/members',
          icon: Users,
          adminOnly: true,
        },
        {
          titleKey: 'items.invitations',
          to: '/app/$orgSlug/settings/invitations',
          icon: Mail,
          adminOnly: true,
        },
        {
          titleKey: 'items.settings',
          to: '/app/$orgSlug/settings',
          icon: Settings,
        },
      ],
    },
  ]
}
