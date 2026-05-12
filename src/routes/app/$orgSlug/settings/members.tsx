import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

type Role = 'owner' | 'admin' | 'member'

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

const errorMessages: Record<string, string> = {
  insufficient_role: 'Admins or owners only',
  owner_only: 'Only an owner can perform this action',
  last_owner: 'You cannot remove or demote the last owner',
  not_found: 'Member not found',
}

export const Route = createFileRoute('/app/$orgSlug/settings/members')({
  component: MembersSettings,
})

function MembersSettings() {
  const { orgSlug } = Route.useParams()
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })
  const members = useConvexQuery(
    api.organizations.listMembers,
    org ? { orgId: org._id } : 'skip',
  )
  const updateRole = useConvexMutation(api.organizations.updateMemberRole)
  const removeMember = useConvexMutation(api.organizations.removeMember)

  const [confirmRemove, setConfirmRemove] = useState<{
    memberId: Id<'organizationMembers'>
    label: string
  } | null>(null)

  const myRole =
    me?.kind === 'ready'
      ? (me.orgs.find((o) => o.slug === orgSlug)?.role as Role | undefined)
      : undefined
  const myUserId = me?.kind === 'ready' ? me.user._id : undefined
  const canManage = myRole === 'admin' || myRole === 'owner'

  function reportError(err: unknown) {
    const code = err instanceof ConvexError ? (err.data as string) : ''
    toast.error(errorMessages[code] ?? 'Action failed')
  }

  async function handleChangeRole(
    memberId: Id<'organizationMembers'>,
    role: Role,
  ) {
    if (!org) return
    try {
      await updateRole({ orgId: org._id, memberId, role })
      toast.success('Role updated')
    } catch (err) {
      reportError(err)
    }
  }

  async function handleRemove() {
    if (!org || !confirmRemove) return
    try {
      await removeMember({
        orgId: org._id,
        memberId: confirmRemove.memberId,
      })
      toast.success('Member removed')
      setConfirmRemove(null)
    } catch (err) {
      reportError(err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          People with access to {org?.name ?? 'this organization'}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!members ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground text-sm">No members yet.</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {members.map((m) => {
              const isSelf = m.userId === myUserId
              const targetRole = m.role as Role
              const canEditThis =
                canManage &&
                !isSelf &&
                (targetRole !== 'owner' || myRole === 'owner')
              return (
                <li
                  key={m._id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs">
                        {(m.name ?? m.email).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {m.name ?? m.email}
                        {isSelf && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            (you)
                          </span>
                        )}
                      </p>
                      {m.name && (
                        <p className="text-muted-foreground truncate text-xs">
                          {m.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {roleLabels[targetRole]}
                    </span>
                    {canEditThis && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            …
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(['owner', 'admin', 'member'] as Role[])
                            .filter((r) => r !== targetRole)
                            .filter((r) => r !== 'owner' || myRole === 'owner')
                            .map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onSelect={() => handleChangeRole(m._id, r)}
                              >
                                Make {roleLabels[r].toLowerCase()}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                              setConfirmRemove({
                                memberId: m._id,
                                label: m.name ?? m.email,
                              })
                            }
                          >
                            Remove from org
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              <strong>{confirmRemove?.label}</strong> will lose access
              immediately. They can be re-invited later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
