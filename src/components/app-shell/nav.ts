import {
  LayoutDashboard,
  Mail,
  Package,
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
