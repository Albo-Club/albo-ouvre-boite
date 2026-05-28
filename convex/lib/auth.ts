import { ConvexError } from 'convex/values'
import { authComponent } from '../auth'
import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server'
import type { DataModel, Doc, Id } from '../_generated/dataModel'

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
type MutCtx = GenericMutationCtx<DataModel>

export type AppRole = 'owner' | 'admin' | 'member'

const roleRank: Record<AppRole, number> = {
  owner: 2,
  admin: 1,
  member: 0,
}

export async function safeAppUser(ctx: Ctx): Promise<Doc<'users'> | null> {
  const baUser = await authComponent.safeGetAuthUser(ctx)
  if (!baUser) return null
  return await ctx.db
    .query('users')
    .withIndex('by_betterAuthId', (q) => q.eq('betterAuthId', baUser._id))
    .unique()
}

export async function requireAppUser(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await safeAppUser(ctx)
  if (!user) throw new ConvexError('unprovisioned_or_unauthenticated')
  return user
}

/**
 * Mutation-only: return the current app user, creating the row on first call
 * if Better Auth has the user but our Convex `users` table doesn't yet.
 * First user across the deployment becomes `superAdmin: true`.
 *
 * Dedup strategy (anti-doublon):
 *   1. Lookup by `betterAuthId` — happy path for returning users.
 *   2. Fallback lookup by `email` — covers the case where Better Auth linked
 *      accounts on its side (different `betterAuthId`, same email) but our
 *      `users` table hasn't seen the new BA id yet. We re-point the existing
 *      row's `betterAuthId` to the current BA user instead of inserting a
 *      duplicate. This also heals legacy duplicates as users come back in.
 *   3. Insert only if neither match succeeds.
 */
export async function provisionAppUser(ctx: MutCtx): Promise<Doc<'users'>> {
  const baUser = await authComponent.getAuthUser(ctx)
  const byBetterAuthId = await ctx.db
    .query('users')
    .withIndex('by_betterAuthId', (q) => q.eq('betterAuthId', baUser._id))
    .unique()
  if (byBetterAuthId) return byBetterAuthId

  const byEmail = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', baUser.email))
    .first()
  if (byEmail) {
    await ctx.db.patch("users", byEmail._id, { betterAuthId: baUser._id })
    const refreshed = await ctx.db.get("users", byEmail._id)
    if (!refreshed) throw new ConvexError('provision_failed')
    return refreshed
  }

  const probe = await ctx.db.query('users').take(1)
  const isFirst = probe.length === 0
  const userId = await ctx.db.insert('users', {
    betterAuthId: baUser._id,
    email: baUser.email,
    name: baUser.name,
    avatarUrl: baUser.image ?? undefined,
    superAdmin: isFirst,
    createdAt: Date.now(),
  })
  const created = await ctx.db.get("users", userId)
  if (!created) throw new ConvexError('provision_failed')
  return created
}

export async function requireOrgMember(
  ctx: Ctx,
  orgId: Id<'organizations'>,
): Promise<{ user: Doc<'users'>; member: Doc<'organizationMembers'> }> {
  const user = await requireAppUser(ctx)
  const member = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_and_user', (q) =>
      q.eq('orgId', orgId).eq('userId', user._id),
    )
    .unique()
  if (!member) throw new ConvexError('not_a_member')
  return { user, member }
}

export async function requireOrgRole(
  ctx: Ctx,
  orgId: Id<'organizations'>,
  minRole: AppRole,
): Promise<{ user: Doc<'users'>; member: Doc<'organizationMembers'> }> {
  const { user, member } = await requireOrgMember(ctx, orgId)
  if (roleRank[member.role] < roleRank[minRole]) {
    throw new ConvexError('insufficient_role')
  }
  return { user, member }
}

export async function requireSuperAdmin(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await requireAppUser(ctx)
  if (!user.superAdmin) throw new ConvexError('not_super_admin')
  return user
}
