import { ConvexError, v } from 'convex/values'

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { authComponent } from './auth'
import { provisionAppUser, requireAppUser, safeAppUser } from './lib/auth'
import { resolveAvatarUrl, resolveLogoUrl } from './lib/storage'

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
          name: baUser.name,
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
          const org = await ctx.db.get("organizations", m.orgId)
          if (!org) return null
          return {
            _id: org._id,
            slug: org.slug,
            name: org.name,
            logoUrl: await resolveLogoUrl(ctx, org),
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
        avatarUrl: await resolveAvatarUrl(ctx, user),
        superAdmin: user.superAdmin,
        lastOrgSlug: user.lastOrgSlug ?? null,
        preferredLanguage: user.preferredLanguage ?? null,
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
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await requireAppUser(ctx)
    const trimmed = name.trim()
    if (!trimmed) throw new ConvexError('invalid_name')
    await ctx.db.patch("users", user._id, { name: trimmed })
    return null
  },
})

export const setPreferredLanguage = mutation({
  args: { language: v.union(v.literal('en'), v.literal('fr')) },
  handler: async (ctx, { language }) => {
    const user = await requireAppUser(ctx)
    await ctx.db.patch("users", user._id, { preferredLanguage: language })
    return null
  },
})

/**
 * Internal — resolve a recipient's email locale for transactional emails sent
 * from Better Auth callbacks (which only expose a run-mutation ctx). Falls back
 * to English when the recipient has no account or no stored preference.
 */
export const localeForEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<'en' | 'fr'> => {
    const normalized = email.trim().toLowerCase()
    const user =
      (await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', normalized))
        .first()) ??
      (await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', email))
        .first())
    return user?.preferredLanguage ?? 'en'
  },
})

/**
 * Internal — called from Better Auth's `beforeDelete` hook to cascade-delete
 * all Convex-side data for a user being removed. Idempotent.
 */
export const cascadeDelete = internalMutation({
  args: { betterAuthId: v.string() },
  handler: async (ctx, { betterAuthId }) => {
    const appUser = await ctx.db
      .query('users')
      .withIndex('by_betterAuthId', (q) =>
        q.eq('betterAuthId', betterAuthId),
      )
      .unique()
    if (!appUser) return null

    const memberships = await ctx.db
      .query('organizationMembers')
      .withIndex('by_user', (q) => q.eq('userId', appUser._id))
      .collect()
    for (const m of memberships) {
      await ctx.db.delete("organizationMembers", m._id)
    }

    if (appUser.avatarStorageId) {
      try {
        await ctx.storage.delete(appUser.avatarStorageId)
      } catch {
        // ignore — storage may already be gone
      }
    }

    await ctx.db.delete("users", appUser._id)
    return null
  },
})
