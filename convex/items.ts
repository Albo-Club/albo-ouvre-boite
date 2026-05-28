import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOrgMember, requireOrgRole } from './lib/auth'

const TITLE_MAX = 120
const DESCRIPTION_MAX = 2000

export const list = query({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, { orgId }) => {
    await requireOrgMember(ctx, orgId)
    const items = await ctx.db
      .query('items')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .order('desc')
      .collect()
    return await Promise.all(
      items.map(async (i) => {
        const creator = await ctx.db.get("users", i.createdBy)
        return {
          _id: i._id,
          title: i.title,
          description: i.description ?? null,
          createdAt: i.createdAt,
          createdBy: {
            _id: i.createdBy,
            name: creator?.name ?? null,
            email: creator?.email ?? '',
          },
        }
      }),
    )
  },
})

export const create = mutation({
  args: {
    orgId: v.id('organizations'),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, title, description }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    const trimmedTitle = title.trim()
    if (!trimmedTitle || trimmedTitle.length > TITLE_MAX) {
      throw new ConvexError('invalid_title')
    }
    const trimmedDescription = description?.trim()
    if (trimmedDescription && trimmedDescription.length > DESCRIPTION_MAX) {
      throw new ConvexError('description_too_long')
    }
    const itemId = await ctx.db.insert('items', {
      orgId,
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : undefined,
      createdBy: user._id,
      createdAt: Date.now(),
    })
    return itemId
  },
})

export const update = mutation({
  args: {
    itemId: v.id('items'),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, title, description }) => {
    const item = await ctx.db.get("items", itemId)
    if (!item) throw new ConvexError('not_found')
    await requireOrgMember(ctx, item.orgId)
    const trimmedTitle = title.trim()
    if (!trimmedTitle || trimmedTitle.length > TITLE_MAX) {
      throw new ConvexError('invalid_title')
    }
    const trimmedDescription = description?.trim()
    if (trimmedDescription && trimmedDescription.length > DESCRIPTION_MAX) {
      throw new ConvexError('description_too_long')
    }
    await ctx.db.patch("items", itemId, {
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : undefined,
    })
    return null
  },
})

export const remove = mutation({
  args: { itemId: v.id('items') },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get("items", itemId)
    if (!item) throw new ConvexError('not_found')
    const { user } = await requireOrgMember(ctx, item.orgId)
    if (item.createdBy !== user._id) {
      await requireOrgRole(ctx, item.orgId, 'admin')
    }
    await ctx.db.delete("items", itemId)
    return null
  },
})
