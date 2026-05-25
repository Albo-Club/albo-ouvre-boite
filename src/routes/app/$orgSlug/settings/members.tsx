import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
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

export const Route = createFileRoute('/app/$orgSlug/settings/members')({
  component: MembersSettings,
})

function MembersSettings() {
  const { t } = useTranslation(['settings', 'common'])
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
    const known = ['insufficient_role', 'owner_only', 'last_owner', 'not_found']
    toast.error(
      t(
        known.includes(code)
          ? `settings:members.errors.${code}`
          : 'settings:members.errors.default',
      ),
    )
  }

  async function handleChangeRole(
    memberId: Id<'organizationMembers'>,
    role: Role,
  ) {
    if (!org) return
    try {
      await updateRole({ orgId: org._id, memberId, role })
      toast.success(t('settings:members.roleUpdated'))
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
      toast.success(t('settings:members.memberRemoved'))
      setConfirmRemove(null)
    } catch (err) {
      reportError(err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings:members.title')}</CardTitle>
        <CardDescription>
          {t('settings:members.description', {
            org: org?.name ?? t('settings:members.fallbackOrg'),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!members ? (
          <p className="text-muted-foreground text-sm">
            {t('settings:members.loading')}
          </p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('settings:members.empty')}
          </p>
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
                            {t('settings:members.you')}
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
                      {t(`common:roles.${targetRole}`)}
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
                                {t('settings:members.makeRole', {
                                  role: t(`common:roles.${r}`).toLowerCase(),
                                })}
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
                            {t('settings:members.removeFromOrg')}
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
            <DialogTitle>{t('settings:members.removeTitle')}</DialogTitle>
            <DialogDescription>
              <Trans
                t={t}
                i18nKey="settings:members.removeDescription"
                values={{ label: confirmRemove?.label }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              {t('common:actions.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
