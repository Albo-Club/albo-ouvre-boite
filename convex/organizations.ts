import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { roleValidator } from './schema'
import {
  requireAppUser,
  requireOrgMember,
  requireOrgRole,
  safeAppUser,
} from './lib/auth'
import { resolveAvatarUrl, resolveLogoUrl } from './lib/storage'
import type { DataModel, Id } from './_generated/dataModel'
import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server'

export const listMembers = query({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, { orgId }) => {
    await requireOrgMember(ctx, orgId)
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .collect()
    return await Promise.all(
      members.map(async (m) => {
        const u = await ctx.db.get("users", m.userId)
        return {
          _id: m._id,
          userId: m.userId,
          email: u?.email ?? '',
          name: u?.name ?? null,
          avatarUrl: u ? await resolveAvatarUrl(ctx, u) : null,
          role: m.role,
          joinedAt: m.joinedAt,
        }
      }),
    )
  },
})

const SLUG_RE = /^[a-z0-9-]{3,40}$/

// Reserved slugs that would clash with platform routes or have semantic
// ambiguity (`me/admin/...`). Keep this aligned with `src/routes/` top-level
// segments. If a new route is added under `app/$orgSlug/...` that uses a
// previously unreserved word, add it here.
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'auth', 'login', 'register', 'logout', 'signin',
  'signup', 'sign-in', 'sign-up', 'me', 'settings', 'billing',
  'invitations', 'onboarding', 'reset-password', 'forgot-password',
  'verify-email', 'accept-invite', 'help', 'docs', 'support', 'status',
  'www', 'public', 'static', 'assets', 'health', 'about', 'terms',
  'privacy', 'pricing', 'home',
])

export const checkSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const normalized = slug.toLowerCase().trim()
    if (!SLUG_RE.test(normalized)) return { available: false, reason: 'invalid' as const }
    if (RESERVED_SLUGS.has(normalized))
      return { available: false, reason: 'reserved' as const }
    const conflict = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', normalized))
      .unique()
    if (conflict) return { available: false, reason: 'taken' as const }
    return { available: true } as const
  },
})

export const create = mutation({
  args: { name: v.string(), slug: v.string() },
  handler: async (ctx, { name, slug }) => {
    const user = await requireAppUser(ctx)
    const normalizedSlug = slug.toLowerCase().trim()
    if (!SLUG_RE.test(normalizedSlug)) throw new ConvexError('invalid_slug')
    if (RESERVED_SLUGS.has(normalizedSlug))
      throw new ConvexError('slug_reserved')
    const trimmedName = name.trim()
    if (!trimmedName) throw new ConvexError('invalid_name')

    const conflict = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', normalizedSlug))
      .unique()
    if (conflict) throw new ConvexError('slug_taken')

    const orgId = await ctx.db.insert('organizations', {
      slug: normalizedSlug,
      name: trimmedName,
      createdBy: user._id,
      createdAt: Date.now(),
    })
    await ctx.db.insert('organizationMembers', {
      orgId,
      userId: user._id,
      role: 'owner',
      joinedAt: Date.now(),
    })
    await ctx.db.patch("users", user._id, { lastOrgSlug: normalizedSlug })
    return { orgId, slug: normalizedSlug }
  },
})

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await safeAppUser(ctx)
    if (!user) return null
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (!org) return null
    const member = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_and_user', (q) =>
        q.eq('orgId', org._id).eq('userId', user._id),
      )
      .unique()
    if (!member) return null
    return {
      ...org,
      logoUrl: await resolveLogoUrl(ctx, org),
    }
  },
})

export const setLastOrg = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await requireAppUser(ctx)
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (!org) throw new ConvexError('not_found')
    await requireOrgMember(ctx, org._id)
    if (user.lastOrgSlug !== slug) {
      await ctx.db.patch("users", user._id, { lastOrgSlug: slug })
    }
    return null
  },
})

export const updateGeneral = mutation({
  args: {
    orgId: v.id('organizations'),
    name: v.string(),
  },
  handler: async (ctx, { orgId, name }) => {
    await requireOrgRole(ctx, orgId, 'admin')
    const trimmedName = name.trim()
    if (!trimmedName) throw new ConvexError('invalid_name')
    await ctx.db.patch("organizations", orgId, { name: trimmedName })
    return null
  },
})

async function countOwners(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  orgId: Id<'organizations'>,
): Promise<number> {
  const members = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org', (q) => q.eq('orgId', orgId))
    .collect()
  return members.filter((m) => m.role === 'owner').length
}

export const updateMemberRole = mutation({
  args: {
    orgId: v.id('organizations'),
    memberId: v.id('organizationMembers'),
    role: roleValidator,
  },
  handler: async (ctx, { orgId, memberId, role }) => {
    const { member: acting } = await requireOrgRole(ctx, orgId, 'admin')
    const target = await ctx.db.get("organizationMembers", memberId)
    if (!target || target.orgId !== orgId) throw new ConvexError('not_found')

    if (target.role === 'owner' || role === 'owner') {
      if (acting.role !== 'owner') throw new ConvexError('owner_only')
    }
    if (target.role === 'owner' && role !== 'owner') {
      const owners = await countOwners(ctx, orgId)
      if (owners <= 1) throw new ConvexError('last_owner')
    }
    if (target.role === role) return null
    await ctx.db.patch("organizationMembers", memberId, { role })
    return null
  },
})

export const removeMember = mutation({
  args: {
    orgId: v.id('organizations'),
    memberId: v.id('organizationMembers'),
  },
  handler: async (ctx, { orgId, memberId }) => {
    const { user, member: acting } = await requireOrgRole(ctx, orgId, 'admin')
    const target = await ctx.db.get("organizationMembers", memberId)
    if (!target || target.orgId !== orgId) throw new ConvexError('not_found')
    if (target.role === 'owner') {
      if (acting.role !== 'owner') throw new ConvexError('owner_only')
      const owners = await countOwners(ctx, orgId)
      if (owners <= 1) throw new ConvexError('last_owner')
    }
    if (target.userId === user._id && acting.role === 'owner') {
      const owners = await countOwners(ctx, orgId)
      if (owners <= 1) throw new ConvexError('last_owner')
    }
    await ctx.db.delete("organizationMembers", memberId)
    return null
  },
})
