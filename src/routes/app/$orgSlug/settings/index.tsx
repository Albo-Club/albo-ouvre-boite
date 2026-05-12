import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$orgSlug/settings/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/$orgSlug/settings/general',
      params: { orgSlug: params.orgSlug },
    })
  },
})
