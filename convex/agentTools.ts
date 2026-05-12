import { ConvexError, v } from 'convex/values'
import { createTool } from '@convex-dev/agent'
import { z } from 'zod/v3'

import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'

const TITLE_MAX = 120
const DESCRIPTION_MAX = 2000

function parseScope(scope: string | undefined | null): {
  orgId: Id<'organizations'>
  userId: Id<'users'>
} {
  if (!scope) throw new ConvexError('agent_tools_missing_scope')
  const idx = scope.indexOf(':')
  if (idx <= 0) throw new ConvexError('agent_tools_invalid_scope')
  return {
    orgId: scope.slice(0, idx) as Id<'organizations'>,
    userId: scope.slice(idx + 1) as Id<'users'>,
  }
}

async function readMembership(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<'organizations'>,
  userId: Id<'users'>,
): Promise<Doc<'organizationMembers'>> {
  const member = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_and_user', (q) =>
      q.eq('orgId', orgId).eq('userId', userId),
    )
    .unique()
  if (!member) throw new ConvexError('agent_tools_forbidden')
  return member
}

function serializeItem(item: Doc<'items'>) {
  return {
    _id: item._id,
    title: item.title,
    description: item.description ?? null,
    createdAt: item.createdAt,
    createdBy: item.createdBy,
  }
}

export const listItemsInternal = internalQuery({
  args: { orgId: v.id('organizations'), actorUserId: v.id('users') },
  handler: async (ctx, { orgId, actorUserId }) => {
    await readMembership(ctx, orgId, actorUserId)
    const items = await ctx.db
      .query('items')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .order('desc')
      .collect()
    return items.map(serializeItem)
  },
})

export const createItemInternal = internalMutation({
  args: {
    orgId: v.id('organizations'),
    actorUserId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, actorUserId, title, description }) => {
    await readMembership(ctx, orgId, actorUserId)
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
      createdBy: actorUserId,
      createdAt: Date.now(),
    })
    const created = await ctx.db.get(itemId)
    return serializeItem(created!)
  },
})

export const updateItemInternal = internalMutation({
  args: {
    orgId: v.id('organizations'),
    actorUserId: v.id('users'),
    itemId: v.id('items'),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { orgId, actorUserId, itemId, title, description },
  ) => {
    await readMembership(ctx, orgId, actorUserId)
    const item = await ctx.db.get(itemId)
    if (!item || item.orgId !== orgId) throw new ConvexError('not_found')
    const trimmedTitle = title.trim()
    if (!trimmedTitle || trimmedTitle.length > TITLE_MAX) {
      throw new ConvexError('invalid_title')
    }
    const trimmedDescription = description?.trim()
    if (trimmedDescription && trimmedDescription.length > DESCRIPTION_MAX) {
      throw new ConvexError('description_too_long')
    }
    await ctx.db.patch(itemId, {
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : undefined,
    })
    const updated = await ctx.db.get(itemId)
    return serializeItem(updated!)
  },
})

const ADMIN_ROLES: ReadonlyArray<Doc<'organizationMembers'>['role']> = [
  'admin',
  'owner',
]

export const deleteItemInternal = internalMutation({
  args: {
    orgId: v.id('organizations'),
    actorUserId: v.id('users'),
    itemId: v.id('items'),
  },
  handler: async (ctx, { orgId, actorUserId, itemId }) => {
    const member = await readMembership(ctx, orgId, actorUserId)
    const item = await ctx.db.get(itemId)
    if (!item || item.orgId !== orgId) throw new ConvexError('not_found')
    if (item.createdBy !== actorUserId && !ADMIN_ROLES.includes(member.role)) {
      throw new ConvexError('forbidden')
    }
    await ctx.db.delete(itemId)
    return { deletedId: itemId }
  },
})

const listItems = createTool({
  description:
    "List items in the current organization, newest first. Use this when " +
    'the user asks "what items do I have" or wants an overview before ' +
    'creating/updating.',
  inputSchema: z.object({}),
  execute: async (ctx): Promise<unknown> => {
    const { orgId, userId } = parseScope(ctx.userId)
    return await ctx.runQuery(internal.agentTools.listItemsInternal, {
      orgId,
      actorUserId: userId,
    })
  },
})

const createItem = createTool({
  description:
    'Create a new item in the current organization. Always pass a clear ' +
    'human-readable title. Description is optional.',
  inputSchema: z.object({
    title: z.string().min(1).max(TITLE_MAX).describe('Short title'),
    description: z
      .string()
      .max(DESCRIPTION_MAX)
      .optional()
      .describe('Optional longer description'),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    const { orgId, userId } = parseScope(ctx.userId)
    return await ctx.runMutation(internal.agentTools.createItemInternal, {
      orgId,
      actorUserId: userId,
      title: input.title,
      description: input.description,
    })
  },
})

const updateItem = createTool({
  description:
    'Update an existing item by id. Pass the full new title (required) and ' +
    'optionally a new description. Use listItems first if you do not know ' +
    'the id.',
  inputSchema: z.object({
    itemId: z.string().describe('The Convex id of the item to update'),
    title: z.string().min(1).max(TITLE_MAX),
    description: z.string().max(DESCRIPTION_MAX).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    const { orgId, userId } = parseScope(ctx.userId)
    return await ctx.runMutation(internal.agentTools.updateItemInternal, {
      orgId,
      actorUserId: userId,
      itemId: input.itemId as Id<'items'>,
      title: input.title,
      description: input.description,
    })
  },
})

const deleteItem = createTool({
  description:
    'Delete an item by id. Only the creator can delete their own items; ' +
    'admins/owners can delete any item in the org. Confirm with the user ' +
    'before calling this tool.',
  inputSchema: z.object({
    itemId: z.string().describe('The Convex id of the item to delete'),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    const { orgId, userId } = parseScope(ctx.userId)
    return await ctx.runMutation(internal.agentTools.deleteItemInternal, {
      orgId,
      actorUserId: userId,
      itemId: input.itemId as Id<'items'>,
    })
  },
})

export const itemTools = {
  listItems,
  createItem,
  updateItem,
  deleteItem,
}
