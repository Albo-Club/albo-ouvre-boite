import { useEffect, useState } from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../convex/_generated/api'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/app-shell/AppSidebar'
import { AppHeader } from '~/components/app-shell/AppHeader'
import { AiChat } from '~/components/AiChat'

export const Route = createFileRoute('/app/$orgSlug')({
  component: OrgLayout,
})

function OrgLayout() {
  const { orgSlug } = Route.useParams()
  const navigate = useNavigate()
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })
  const setLastOrg = useConvexMutation(api.organizations.setLastOrg)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (me?.kind !== 'ready') return
    const member = me.orgs.find((o) => o.slug === orgSlug)
    if (!member) {
      navigate({ to: '/app' })
      return
    }
    if (me.user.lastOrgSlug !== orgSlug) {
      void setLastOrg({ slug: orgSlug })
    }
  }, [me, orgSlug, navigate, setLastOrg])

  if (!me || me.kind !== 'ready') {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }
  const member = me.orgs.find((o) => o.slug === orgSlug)
  if (!member) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Redirecting…</p>
      </main>
    )
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar
        orgs={me.orgs}
        currentSlug={orgSlug}
        myRole={member.role}
        me={{
          name: me.user.name,
          email: me.user.email,
          avatarUrl: me.user.avatarUrl,
          superAdmin: me.user.superAdmin,
        }}
      />
      <SidebarInset className="overflow-hidden">
        <AppHeader
          orgSlug={orgSlug}
          orgName={member.name}
          onOpenAiChat={() => setChatOpen(true)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
      {org && (
        <AiChat
          orgId={org._id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </SidebarProvider>
  )
}
