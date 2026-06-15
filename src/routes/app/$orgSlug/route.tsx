import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'
import { useTranslation } from 'react-i18next'

import { api } from '../../../../convex/_generated/api'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/app-shell/AppSidebar'
import { AppHeader } from '~/components/app-shell/AppHeader'
import { AiPanel } from '~/components/ai/AiPanel'
import { cn } from '~/lib/utils'

// AI panel open/closed persists in a 7-day cookie (same pattern as shadcn's
// sidebar_state), open by default.
const AI_PANEL_COOKIE_NAME = 'ai_panel_state'
const AI_PANEL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function readAiPanelCookie(): boolean {
  if (typeof document === 'undefined') return true
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AI_PANEL_COOKIE_NAME}=([^;]*)`),
  )
  return match ? match[1] === 'true' : true
}

export const Route = createFileRoute('/app/$orgSlug')({
  component: OrgLayout,
})

function OrgLayout() {
  const { orgSlug } = Route.useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('nav')
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })
  const setLastOrg = useConvexMutation(api.organizations.setLastOrg)
  // Last slug this tab already persisted. Without it, two tabs open on
  // different orgs ping-pong `setLastOrg` forever: each write updates `me`
  // in the other tab, whose effect writes back, etc.
  const lastOrgSyncedRef = useRef<string | null>(null)
  const [aiOpen, setAiOpen] = useState(readAiPanelCookie)

  const setAiPanelOpen = useCallback((open: boolean) => {
    setAiOpen(open)
    document.cookie = `${AI_PANEL_COOKIE_NAME}=${open}; path=/; max-age=${AI_PANEL_COOKIE_MAX_AGE}`
  }, [])

  // ⌘J / Ctrl+J toggles the AI panel (mirrors the sidebar's ⌘B).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'j' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setAiPanelOpen(!aiOpen)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aiOpen, setAiPanelOpen])

  useEffect(() => {
    if (me?.kind !== 'ready') return
    const member = me.orgs.find((o) => o.slug === orgSlug)
    if (!member) {
      navigate({ to: '/app' })
      return
    }
    // Persist at most once per visited slug: `me` updates (e.g. another tab
    // writing its own last-org) must NOT re-trigger the write.
    if (lastOrgSyncedRef.current !== orgSlug) {
      lastOrgSyncedRef.current = orgSlug
      if (me.user.lastOrgSlug !== orgSlug) {
        void setLastOrg({ slug: orgSlug })
      }
    }
  }, [me, orgSlug, navigate, setLastOrg])

  if (!me || me.kind !== 'ready') {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </main>
    )
  }
  const member = me.orgs.find((o) => o.slug === orgSlug)
  if (!member) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">{t('redirecting')}</p>
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
          onToggleAiPanel={() => setAiPanelOpen(!aiOpen)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
      {org && (
        <aside
          className={cn(
            'bg-background flex-col',
            // Desktop (≥ lg): rounded card in the flow, same visual language
            // as SidebarInset (m-2 rounded-xl shadow).
            'lg:static lg:z-auto lg:my-2 lg:mr-2 lg:ml-0 lg:h-auto lg:w-[400px] lg:max-w-none lg:shrink-0 lg:overflow-hidden lg:rounded-xl lg:border-0 lg:shadow-sm',
            // Mobile: full-screen overlay on the right.
            'fixed inset-y-0 right-0 z-50 w-full max-w-md border-l shadow-xl',
            aiOpen ? 'flex' : 'hidden',
          )}
        >
          {/* key: clean remount on org change (org-scoped thread state). */}
          <AiPanel
            key={org._id}
            orgId={org._id}
            open={aiOpen}
            onClose={() => setAiPanelOpen(false)}
          />
        </aside>
      )}
    </SidebarProvider>
  )
}
