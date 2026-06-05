import { ConvexError, v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireAppUser, requireOrgRole } from './lib/auth'
import type { GenericMutationCtx } from 'convex/server'

import type { DataModel, Id } from './_generated/dataModel'

const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]

async function validateImage(
  ctx: GenericMutationCtx<DataModel>,
  storageId: Id<'_storage'>,
): Promise<void> {
  const meta = await ctx.db.system.get("_storage", storageId)
  if (!meta) throw new ConvexError('not_found')
  if (meta.size > MAX_BYTES) {
    await ctx.storage.delete(storageId)
    throw new ConvexError('too_large')
  }
  if (meta.contentType && !ALLOWED_IMAGE_TYPES.includes(meta.contentType)) {
    await ctx.storage.delete(storageId)
    throw new ConvexError('invalid_type')
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAppUser(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const setMyAvatar = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const user = await requireAppUser(ctx)
    await validateImage(ctx, storageId)
    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId)
    }
    await ctx.db.patch("users", user._id, {
      avatarStorageId: storageId,
      avatarUrl: undefined,
    })
    return null
  },
})

export const removeMyAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAppUser(ctx)
    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId)
    }
    await ctx.db.patch("users", user._id, {
      avatarStorageId: undefined,
      avatarUrl: undefined,
    })
    return null
  },
})

export const setOrgLogo = mutation({
  args: { orgId: v.id('organizations'), storageId: v.id('_storage') },
  handler: async (ctx, { orgId, storageId }) => {
    await requireOrgRole(ctx, orgId, 'admin')
    await validateImage(ctx, storageId)
    const org = await ctx.db.get("organizations", orgId)
    if (org?.logoStorageId) {
      await ctx.storage.delete(org.logoStorageId)
    }
    await ctx.db.patch("organizations", orgId, {
      logoStorageId: storageId,
      logoUrl: undefined,
    })
    return null
  },
})

export const removeOrgLogo = mutation({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, { orgId }) => {
    await requireOrgRole(ctx, orgId, 'admin')
    const org = await ctx.db.get("organizations", orgId)
    if (org?.logoStorageId) {
      await ctx.storage.delete(org.logoStorageId)
    }
    await ctx.db.patch("organizations", orgId, {
      logoStorageId: undefined,
      logoUrl: undefined,
    })
    return null
  },
})
