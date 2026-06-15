import { ConvexError, v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import {
  abortStream,
  createThread,
  getThreadMetadata,
  listStreams,
  listUIMessages,
  syncStreams,
  updateThreadMetadata,
  vStreamArgs,
} from '@convex-dev/agent'

import { components, internal } from './_generated/api'
import {
  httpAction,
  internalAction,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { requireOrgMember } from './lib/auth'
import { chatAgent } from './agent'
import { buildInstructions } from './lib/instructions'
import { authComponent } from './auth'
import { consumeLimit } from './rateLimiters'
import type { DataModel, Id } from './_generated/dataModel'
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from 'convex/server'

type AnyCtx =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>
  | GenericActionCtx<DataModel>

function scopeKey(orgId: Id<'organizations'>, userId: Id<'users'>): string {
  return `${orgId}:${userId}`
}

// Keep the per-message system prompt bounded.
const ROUTE_CONTEXT_MAX = 200
// Auto-title a thread from its first user message.
const AUTO_TITLE_MAX = 80

export const actionAuthProbe = internalQuery({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, { orgId }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    return user
  },
})

async function authorizeThread(
  ctx: AnyCtx,
  threadId: string,
  expectedScope: string,
) {
  const meta = await getThreadMetadata(ctx, components.agent, { threadId })
  if (meta.userId !== expectedScope) {
    throw new ConvexError('forbidden')
  }
}

export const listThreads = query({
  args: {
    orgId: v.id('organizations'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { orgId, paginationOpts }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    const scope = scopeKey(orgId, user._id)
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      { userId: scope, paginationOpts },
    )
    return threads
  },
})

export const createNewThread = mutation({
  args: {
    orgId: v.id('organizations'),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, title }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    const scope = scopeKey(orgId, user._id)
    const threadId = await createThread(ctx, components.agent, {
      userId: scope,
      title,
    })
    return threadId
  },
})

export const deleteThread = mutation({
  args: { orgId: v.id('organizations'), threadId: v.string() },
  handler: async (ctx, { orgId, threadId }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    const scope = scopeKey(orgId, user._id)
    await authorizeThread(ctx, threadId, scope)
    await ctx.scheduler.runAfter(
      0,
      components.agent.threads.deleteAllForThreadIdAsync,
      { threadId },
    )
    return null
  },
})

export const renameThread = mutation({
  args: {
    orgId: v.id('organizations'),
    threadId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { orgId, threadId, title }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    const scope = scopeKey(orgId, user._id)
    await authorizeThread(ctx, threadId, scope)
    const trimmed = title.trim().slice(0, 120)
    if (!trimmed) throw new ConvexError('invalid_title')
    await updateThreadMetadata(ctx, components.agent, {
      threadId,
      patch: { title: trimmed },
    })
    return null
  },
})

export const listMessages = query({
  args: {
    orgId: v.id('organizations'),
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, { orgId, threadId, paginationOpts, streamArgs }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    const scope = scopeKey(orgId, user._id)
    await authorizeThread(ctx, threadId, scope)
    const streams = await syncStreams(ctx, components.agent, {
      threadId,
      streamArgs,
    })
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId,
      paginationOpts,
    })
    return { ...paginated, streams }
  },
})

export const sendMessage = mutation({
  args: {
    orgId: v.id('organizations'),
    threadId: v.string(),
    prompt: v.string(),
    // Where the user currently is in the app, fed into the per-message
    // system prompt so the agent can ground its answers.
    context: v.optional(v.object({ route: v.string() })),
  },
  handler: async (ctx, { orgId, threadId, prompt, context }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    await consumeLimit(ctx, 'chatSend', user._id)
    const scope = scopeKey(orgId, user._id)
    const meta = await getThreadMetadata(ctx, components.agent, { threadId })
    if (meta.userId !== scope) throw new ConvexError('forbidden')
    // Auto-title the thread from its first message.
    if (!meta.title) {
      await updateThreadMetadata(ctx, components.agent, {
        threadId,
        patch: { title: prompt.slice(0, AUTO_TITLE_MAX) },
      })
    }
    const org = await ctx.db.get('organizations', orgId)
    const { messageId } = await chatAgent.saveMessage(ctx, {
      threadId,
      prompt,
      skipEmbeddings: true,
    })
    await ctx.scheduler.runAfter(0, internal.chat.streamAsync, {
      threadId,
      promptMessageId: messageId,
      route: context?.route.slice(0, ROUTE_CONTEXT_MAX),
      orgName: org?.name,
    })
    return { messageId }
  },
})

/**
 * Approve or deny a pending tool call, then RESUME generation.
 *
 * `approveToolCall` / `denyToolCall` only record the decision and return a new
 * `messageId`; the stream does NOT restart on its own. We must re-schedule
 * `streamAsync` with that `promptMessageId`, or the thread stays frozen on
 * "Confirmation required". See KNOWN_ISSUES.md "Tool approval (AI panel)".
 */
export const respondToToolApproval = mutation({
  args: {
    orgId: v.id('organizations'),
    threadId: v.string(),
    approvalId: v.string(),
    approved: v.boolean(),
    context: v.optional(v.object({ route: v.string() })),
  },
  handler: async (ctx, { orgId, threadId, approvalId, approved, context }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    await consumeLimit(ctx, 'chatSend', user._id)
    const scope = scopeKey(orgId, user._id)
    await authorizeThread(ctx, threadId, scope)
    const org = await ctx.db.get('organizations', orgId)
    const { messageId } = approved
      ? await chatAgent.approveToolCall(ctx, { threadId, approvalId })
      : await chatAgent.denyToolCall(ctx, { threadId, approvalId })
    await ctx.scheduler.runAfter(0, internal.chat.streamAsync, {
      threadId,
      promptMessageId: messageId,
      route: context?.route.slice(0, ROUTE_CONTEXT_MAX),
      orgName: org?.name,
    })
    return { messageId }
  },
})

export const stopStream = mutation({
  args: { orgId: v.id('organizations'), threadId: v.string() },
  handler: async (ctx, { orgId, threadId }) => {
    const { user } = await requireOrgMember(ctx, orgId)
    const scope = scopeKey(orgId, user._id)
    await authorizeThread(ctx, threadId, scope)
    const streams = await listStreams(ctx, components.agent, {
      threadId,
      includeStatuses: ['streaming'],
    })
    for (const s of streams) {
      await abortStream(ctx, components.agent, {
        streamId: s.streamId,
        reason: 'user_requested',
      })
    }
    return null
  },
})

export const streamAsync = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    route: v.optional(v.string()),
    orgName: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, promptMessageId, route, orgName }) => {
    const result = await chatAgent.streamText(
      ctx,
      { threadId },
      { promptMessageId, system: buildInstructions({ route, orgName }) },
      { saveStreamDeltas: { chunking: 'word', throttleMs: 100 } },
    )
    await result.consumeStream()
  },
})

/**
 * One-shot HTTP streaming endpoint at /api/chat. Useful for clients that
 * prefer plain HTTP streaming over the WebSocket delta sync (e.g. simple
 * curl tests). For the in-app chat, prefer `sendMessage` + the
 * `listMessages` query.
 */
export const streamOverHttp = httpAction(async (ctx, request) => {
  const baUser = await authComponent.safeGetAuthUser(ctx)
  if (!baUser) return new Response('Unauthorized', { status: 401 })

  const body = (await request.json()) as {
    orgId?: string
    threadId?: string
    prompt?: string
  }
  if (!body.orgId || !body.prompt) {
    return new Response('Bad request', { status: 400 })
  }

  const probeUser = await ctx.runQuery(internal.chat.actionAuthProbe, {
    orgId: body.orgId as Id<'organizations'>,
  })
  const scope = scopeKey(body.orgId as Id<'organizations'>, probeUser._id)

  const threadId =
    body.threadId ??
    (await createThread(ctx, components.agent, { userId: scope }))

  if (body.threadId) {
    await authorizeThread(ctx, body.threadId, scope)
  }

  const result = await chatAgent.streamText(
    ctx,
    { threadId },
    { prompt: body.prompt },
  )
  const response = result.toTextStreamResponse()
  if (result.promptMessageId) {
    response.headers.set('X-Message-Id', result.promptMessageId)
  }
  response.headers.set('X-Thread-Id', threadId)
  return response
})
