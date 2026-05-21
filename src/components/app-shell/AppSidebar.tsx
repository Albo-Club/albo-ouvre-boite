import { Link, useLocation } from '@tanstack/react-router'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'
import { OrgSwitcher } from './OrgSwitcher'
import { NavUser } from './NavUser'
import { ThemePicker } from './ThemePicker'
import { getNavGroups } from './nav'

type NavLeaf = ReturnType<typeof getNavGroups>[number]['items'][number]

type Org = {
  _id: string
  slug: string
  name: string
  logoUrl?: string | null
  role: string
}

type Me = {
  name: string | null
  email: string
  avatarUrl: string | null | undefined
  superAdmin: boolean
}

export function AppSidebar({
  orgs,
  currentSlug,
  myRole,
  me,
}: {
  orgs: Array<Org>
  currentSlug: string
  myRole: string | undefined
  me: Me
}) {
  const location = useLocation()
  const groups = getNavGroups()
  const isAdmin = myRole === 'admin' || myRole === 'owner'

  const renderItem = (item: NavLeaf, size?: 'sm') => {
    const Icon = item.icon
    const href = item.to.replace('$orgSlug', currentSlug)
    const isActive =
      item.to === '/app/$orgSlug'
        ? location.pathname === href
        : location.pathname === href ||
          location.pathname.startsWith(href + '/')
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.title}
          size={size}
        >
          <Link to={item.to} params={{ orgSlug: currentSlug }}>
            {Icon ? <Icon /> : null}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher orgs={orgs} currentSlug={currentSlug} />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || isAdmin,
          )
          if (visibleItems.length === 0) return null
          return (
            <SidebarGroup
              key={group.label}
              className={group.secondary ? 'mt-auto' : undefined}
            >
              {!group.secondary && (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) =>
                    renderItem(item, group.secondary ? 'sm' : undefined),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemePicker />
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser
          name={me.name}
          email={me.email}
          avatarUrl={me.avatarUrl}
          superAdmin={me.superAdmin}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
