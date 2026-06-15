import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const roleValidator = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('member'),
)

export const invitationRoleValidator = v.union(
  v.literal('admin'),
  v.literal('member'),
)

export default defineSchema({
  users: defineTable({
    betterAuthId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id('_storage')),
    superAdmin: v.boolean(),
    preferredLanguage: v.optional(v.union(v.literal('en'), v.literal('fr'))),
    createdAt: v.number(),
    // Deprecated: the per-user "last viewed org" now lives in `userPrefs`
    // (see below) to keep it off the hot `users` row. Kept here as an
    // optional legacy field so documents written before the move still
    // validate; never written anymore, only read as a fallback by
    // `getLastOrgSlug` until `userPrefs` is populated on next navigation.
    lastOrgSlug: v.optional(v.string()),
  })
    .index('by_betterAuthId', ['betterAuthId'])
    .index('by_email', ['email']),

  // Frequently-written per-user state, isolated from `users` on purpose:
  // every query reads the caller's `users` row (requireAppUser), so writes
  // there invalidate ALL open subscriptions. See KNOWN_ISSUES.md
  // § "Hot `users` row".
  userPrefs: defineTable({
    userId: v.id('users'),
    lastOrgSlug: v.optional(v.string()),
  }).index('by_user', ['userId']),

  organizations: defineTable({
    slug: v.string(),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id('_storage')),
    createdBy: v.id('users'),
    createdAt: v.number(),
  }).index('by_slug', ['slug']),

  organizationMembers: defineTable({
    orgId: v.id('organizations'),
    userId: v.id('users'),
    role: roleValidator,
    joinedAt: v.number(),
  })
    .index('by_org', ['orgId'])
    .index('by_user', ['userId'])
    .index('by_org_and_user', ['orgId', 'userId']),

  invitations: defineTable({
    orgId: v.id('organizations'),
    email: v.string(),
    role: invitationRoleValidator,
    token: v.string(),
    invitedBy: v.id('users'),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index('by_token', ['token'])
    .index('by_org', ['orgId'])
    .index('by_email_and_org', ['email', 'orgId']),

  items: defineTable({
    orgId: v.id('organizations'),
    title: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id('users'),
    createdAt: v.number(),
  }).index('by_org', ['orgId']),
})
