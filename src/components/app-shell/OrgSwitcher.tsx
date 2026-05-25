import { useNavigate } from '@tanstack/react-router'
import { useConvexMutation } from '@convex-dev/react-query'
import { ChevronsUpDown, Plus, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api } from '../../../convex/_generated/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'

type Org = {
  _id: string
  slug: string
  name: string
  logoUrl?: string | null
  role: string
}

export function OrgSwitcher({
  orgs,
  currentSlug,
}: {
  orgs: Array<Org>
  currentSlug: string
}) {
  const navigate = useNavigate()
  const { t } = useTranslation(['nav', 'common'])
  const setLastOrg = useConvexMutation(api.organizations.setLastOrg)
  const current = orgs.find((o) => o.slug === currentSlug)
  const roleLabel = (role: string | undefined) =>
    role === 'owner' || role === 'admin' || role === 'member'
      ? t(`common:roles.${role}`)
      : '—'

  async function switchTo(slug: string) {
    if (slug === currentSlug) return
    await setLastOrg({ slug })
    navigate({ to: '/app/$orgSlug', params: { orgSlug: slug } })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                {current?.logoUrl ? (
                  <img
                    src={current.logoUrl}
                    alt=""
                    className="size-8 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold">
                    {(current?.name ?? currentSlug).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {current?.name ?? currentSlug}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {roleLabel(current?.role)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t('nav:orgSwitcher.label')}
            </DropdownMenuLabel>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org._id}
                onSelect={() => switchTo(org.slug)}
                className="gap-2"
              >
                <div className="bg-muted flex size-6 items-center justify-center rounded">
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt=""
                      className="size-6 rounded object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium">
                      {org.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="truncate">{org.name}</span>
                {org.slug === currentSlug && (
                  <Check className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => navigate({ to: '/app' })}
              className="gap-2"
            >
              <div className="bg-background flex size-6 items-center justify-center rounded border">
                <Plus className="size-4" />
              </div>
              <span className="text-muted-foreground">
                {t('nav:orgSwitcher.allOrganizations')}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
