import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server'
import type { DataModel, Doc } from '../_generated/dataModel'

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
type MutCtx = GenericMutationCtx<DataModel>

/**
 * `lastOrgSlug` lives in `userPrefs`, NOT on the `users` row: every query
 * reads the caller's `users` row via `requireAppUser`/`safeAppUser`, so a
 * write there re-runs ALL open subscriptions. `userPrefs` is only read by
 * `users.me`, so updating it invalidates that single cheap query.
 * See KNOWN_ISSUES.md § "Hot `users` row".
 */
export async function getLastOrgSlug(
  ctx: Ctx,
  user: Doc<'users'>,
): Promise<string | null> {
  const prefs = await ctx.db
    .query('userPrefs')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique()
  return prefs?.lastOrgSlug ?? null
}

export async function setLastOrgSlug(
  ctx: MutCtx,
  user: Doc<'users'>,
  slug: string,
): Promise<void> {
  const prefs = await ctx.db
    .query('userPrefs')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique()
  if (!prefs) {
    await ctx.db.insert('userPrefs', { userId: user._id, lastOrgSlug: slug })
  } else if (prefs.lastOrgSlug !== slug) {
    await ctx.db.patch('userPrefs', prefs._id, { lastOrgSlug: slug })
  }
}
