import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { components } from './_generated/api'
import { requireSuperAdmin } from './lib/auth'
import type { FunctionReference } from 'convex/server'

/**
 * One-shot dev cleanup. Run via:
 *   pnpm exec convex run admin:purgeExcept '{"keepEmail":"x@y.com"}'
 *
 * Nukes:
 *  - All Convex app data except the matching user (and their org memberships are also nuked — orgs are wiped fully)
 *  - All Better Auth users (and dependent sessions/accounts via cascade in the BA component) except the matching one
 */
export const purgeExcept = internalMutation({
  args: { keepEmail: v.string() },
  handler: async (ctx, { keepEmail }) => {
    const target = keepEmail.toLowerCase().trim()

    for (const table of [
      'invitations',
      'organizationMembers',
      'organizations',
    ] as const) {
      const rows = await ctx.db.query(table).collect()
      for (const r of rows) await ctx.db.delete(table, r._id)
    }

    let keptConvexUserId: string | null = null
    const users = await ctx.db.query('users').collect()
    for (const u of users) {
      if (u.email.toLowerCase() === target) {
        keptConvexUserId = u._id
        await ctx.db.patch("users", u._id, { lastOrgSlug: undefined })
      } else {
        await ctx.db.delete("users", u._id)
      }
    }

    let cursor: string | null = null
    let baDeleted = 0
    const adapter = (
      components as unknown as {
        betterAuth: {
          adapter: {
            findMany: FunctionReference<'query', 'internal'>
            deleteOne: FunctionReference<'mutation', 'internal'>
          }
        }
      }
    ).betterAuth.adapter

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const result = (await ctx.runQuery(adapter.findMany, {
        model: 'user',
        paginationOpts: { numItems: 100, cursor },
      })) as {
        page: Array<{ _id: string; email?: string }>
        isDone: boolean
        continueCursor: string
      }
      for (const u of result.page) {
        if ((u.email ?? '').toLowerCase() !== target) {
          await ctx.runMutation(adapter.deleteOne, {
            input: {
              model: 'user',
              where: [{ field: '_id', operator: 'eq', value: u._id }],
            },
          })
          baDeleted += 1
        }
      }
      if (result.isDone) break
      cursor = result.continueCursor
    }

    return {
      keptConvexUserId,
      baUsersDeleted: baDeleted,
    }
  },
})

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx)
    const [users, orgs, members, invitations] = await Promise.all([
      ctx.db.query('users').collect(),
      ctx.db.query('organizations').collect(),
      ctx.db.query('organizationMembers').collect(),
      ctx.db.query('invitations').collect(),
    ])
    return {
      userCount: users.length,
      orgCount: orgs.length,
      memberCount: members.length,
      pendingInvitations: invitations.filter((i) => !i.acceptedAt).length,
    }
  },
})

export const listOrgs = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx)
    const orgs = await ctx.db.query('organizations').collect()
    return await Promise.all(
      orgs.map(async (org) => {
        const members = await ctx.db
          .query('organizationMembers')
          .withIndex('by_org', (q) => q.eq('orgId', org._id))
          .collect()
        return {
          _id: org._id,
          slug: org.slug,
          name: org.name,
          memberCount: members.length,
          createdAt: org.createdAt,
        }
      }),
    )
  },
})

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx)
    const users = await ctx.db.query('users').collect()
    return await Promise.all(
      users.map(async (u) => {
        const memberships = await ctx.db
          .query('organizationMembers')
          .withIndex('by_user', (q) => q.eq('userId', u._id))
          .collect()
        return {
          _id: u._id,
          email: u.email,
          name: u.name ?? null,
          superAdmin: u.superAdmin,
          orgCount: memberships.length,
          createdAt: u.createdAt,
        }
      }),
    )
  },
})

export const setSuperAdmin = mutation({
  args: { userId: v.id('users'), value: v.boolean() },
  handler: async (ctx, { userId, value }) => {
    const me = await requireSuperAdmin(ctx)
    if (userId === me._id && !value) {
      const all = await ctx.db.query('users').collect()
      const remaining = all.filter((u) => u.superAdmin && u._id !== me._id)
      if (remaining.length === 0) throw new ConvexError('last_super_admin')
    }
    const target = await ctx.db.get("users", userId)
    if (!target) throw new ConvexError('not_found')
    if (target.superAdmin === value) return null
    await ctx.db.patch("users", userId, { superAdmin: value })
    return null
  },
})
