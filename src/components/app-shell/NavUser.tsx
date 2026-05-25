import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronsUpDown,
  LogOut,
  Shield,
  UserCircle,
  Building2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { authClient } from '~/lib/auth-client'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
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
  useSidebar,
} from '~/components/ui/sidebar'

export function NavUser({
  name,
  email,
  avatarUrl,
  superAdmin,
}: {
  name: string | null
  email: string
  avatarUrl: string | null | undefined
  superAdmin: boolean
}) {
  const navigate = useNavigate()
  const { t } = useTranslation(['nav', 'account', 'common'])
  const { isMobile } = useSidebar()
  const displayName = name ?? email
  const source = name?.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : source.slice(0, 2).toUpperCase() || '?'

  async function handleSignOut() {
    await authClient.signOut()
    navigate({ to: '/login' })
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
              <Avatar className="size-8">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="end"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/me">
                <UserCircle className="mr-2 size-4" />
                {t('account:menu.profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/app">
                <Building2 className="mr-2 size-4" />
                {t('account:menu.switchOrg')}
              </Link>
            </DropdownMenuItem>
            {superAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/app/admin">
                  <Shield className="mr-2 size-4" />
                  {t('account:menu.superAdmin')}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              {t('account:menu.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
