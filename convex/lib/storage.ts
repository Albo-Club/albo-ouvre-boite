import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server'

import type { DataModel, Doc } from '../_generated/dataModel'

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>

export async function resolveAvatarUrl(
  ctx: AnyCtx,
  user: Doc<'users'>,
): Promise<string | null> {
  if (user.avatarStorageId) {
    const url = await ctx.storage.getUrl(user.avatarStorageId)
    if (url) return url
  }
  return user.avatarUrl ?? null
}

export async function resolveLogoUrl(
  ctx: AnyCtx,
  org: Doc<'organizations'>,
): Promise<string | null> {
  if (org.logoStorageId) {
    const url = await ctx.storage.getUrl(org.logoStorageId)
    if (url) return url
  }
  return org.logoUrl ?? null
}
