import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'
import { provisionAppUser, requireAppUser, safeAppUser } from './lib/auth'

export const me = query({
  args: {},
  handler: async (ctx) => {
    const baUser = await authComponent.safeGetAuthUser(ctx)
    if (!baUser) return { kind: 'unauthenticated' as const }

    const user = await safeAppUser(ctx)
    if (!user) {
      return {
        kind: 'unprovisioned' as const,
        baUser: {
          id: baUser._id,
          email: baUser.email,
          name: baUser.name ?? null,
        },
      }
    }

    const memberships = await ctx.db
      .query('organizationMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const orgs = (
      await Promise.all(
        memberships.map(async (m) => {
          const org = await ctx.db.get(m.orgId)
          if (!org) return null
          return {
            _id: org._id,
            slug: org.slug,
            name: org.name,
            logoUrl: org.logoUrl ?? null,
            role: m.role,
          }
        }),
      )
    ).filter((o): o is NonNullable<typeof o> => o !== null)

    return {
      kind: 'ready' as const,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name ?? null,
        avatarUrl: user.avatarUrl ?? null,
        superAdmin: user.superAdmin,
        lastOrgSlug: user.lastOrgSlug ?? null,
      },
      orgs,
    }
  },
})

export const provisionMe = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await provisionAppUser(ctx)
    return user._id
  },
})

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, avatarUrl }) => {
    const user = await requireAppUser(ctx)
    const patch: Partial<{ name: string; avatarUrl: string | undefined }> = {}
    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed) throw new ConvexError('invalid_name')
      patch.name = trimmed
    }
    if (avatarUrl !== undefined) {
      const trimmed = avatarUrl.trim()
      patch.avatarUrl = trimmed ? trimmed : undefined
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch)
    }
    return null
  },
})
