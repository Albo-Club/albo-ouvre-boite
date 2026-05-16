import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useConvexQuery } from '@convex-dev/react-query'
import { Building2, LogOut, Shield, UserCircle, Users } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Spinner } from '~/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

/**
 * Compact avatar dropdown for the app header. Sibling of `NavUser` (sidebar
 * footer) — they share data but live on different surfaces. Built from
 * shadcn primitives, no Better Auth UI dependency.
 */
export function UserButton() {
  const me = useConvexQuery(api.users.me, {})
  const navigate = useNavigate()
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)

  if (me?.kind !== 'ready') {
    return null
  }

  const user = me.user
  const displayName = user.name ?? user.email
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase() || '?'

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  const handleSignOutEverywhere = async () => {
    setSigningOutAll(true)
    // Revoke every other session, then sign out of the current one.
    const { error } = await authClient.revokeOtherSessions()
    if (error) {
      setSigningOutAll(false)
      setConfirmSignOutAll(false)
      toast.error(formatAuthError(classifyAuthError(error), 'signin'))
      return
    }
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Account menu"
          >
            <Avatar className="size-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="grid leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/app/me">
              <UserCircle className="mr-2 size-4" />
              Your profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/app">
              <Building2 className="mr-2 size-4" />
              Switch organization
            </Link>
          </DropdownMenuItem>
          {user.superAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/app/admin">
                <Shield className="mr-2 size-4" />
                Super-admin
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setConfirmSignOutAll(true)}>
            <Users className="mr-2 size-4" />
            Sign out everywhere
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmSignOutAll} onOpenChange={setConfirmSignOutAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out everywhere?</DialogTitle>
            <DialogDescription>
              This signs out every device including this one. You&apos;ll need
              to sign back in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSignOutAll(false)}
              disabled={signingOutAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleSignOutEverywhere()}
              disabled={signingOutAll}
            >
              {signingOutAll && <Spinner />}
              Sign out everywhere
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
