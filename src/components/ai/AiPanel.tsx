import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from '@tanstack/react-router'
import { useUIMessages } from '@convex-dev/agent/react'
import { usePaginatedQuery } from 'convex/react'
import { useConvexMutation } from '@convex-dev/react-query'
import { ConvexError } from 'convex/values'
import {
  Check,
  ChevronDown,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { UIMessage } from '@convex-dev/agent/react'
import type { PromptInputMessage } from '~/components/ai-elements/prompt-input'
import type { ToolPart } from '~/components/ai-elements/tool'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/ai-elements/conversation'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '~/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '~/components/ai-elements/prompt-input'
import { Suggestion } from '~/components/ai-elements/suggestion'
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
} from '~/components/ai-elements/confirmation'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '~/components/ai-elements/tool'
import { getToolRenderer } from '~/components/ai/toolRenderers'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
import { cn } from '~/lib/utils'

function errorCode(err: unknown): string {
  const data = err instanceof ConvexError ? err.data : null
  if (typeof data === 'string') return data
  if (data && typeof data === 'object' && 'code' in data) {
    return (data as { code: string }).code
  }
  return ''
}

/** Parts of an assistant message: text (markdown) + tool calls. */
function MessageParts({
  message,
  onRespondApproval,
  respondingApprovalId,
}: {
  message: UIMessage
  /** Approve (true) or deny (false) a tool approval request. */
  onRespondApproval: (approvalId: string, approved: boolean) => void
  /** Approval whose response is being sent (buttons disabled). */
  respondingApprovalId: string | null
}) {
  const { t } = useTranslation(['chat'])

  function stateLabel(state: ToolPart['state']): string | undefined {
    switch (state) {
      case 'input-streaming':
        return t('chat:tool.statePending')
      case 'input-available':
        return t('chat:tool.stateRunning')
      case 'approval-requested':
        return t('chat:tool.stateApprovalRequested')
      case 'approval-responded':
        return t('chat:tool.stateApprovalResponded')
      case 'output-available':
        return t('chat:tool.stateCompleted')
      case 'output-denied':
        return t('chat:tool.stateDenied')
      case 'output-error':
        return t('chat:tool.stateError')
      default:
        return undefined
    }
  }

  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return <MessageResponse key={i}>{part.text}</MessageResponse>
        }
        if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
          const toolPart = part as ToolPart
          const approvalId = toolPart.approval?.id
          const responding =
            approvalId !== undefined && approvalId === respondingApprovalId
          // Tool name: `tool-listItems` → `listItems`; `dynamic-tool` →
          // `toolName`. A rich renderer (toolRenderers.tsx) shows below the
          // collapsible block once the tool completed with an output;
          // otherwise the JSON in the collapsible stands alone.
          const toolName =
            toolPart.type === 'dynamic-tool'
              ? toolPart.toolName
              : toolPart.type.slice('tool-'.length)
          const Renderer = getToolRenderer(toolName)
          // The renderer is defensive itself (null on unexpected shape); the
          // `output-available` state guarantees `output` is present.
          const rich =
            Renderer && toolPart.state === 'output-available' ? (
              <Renderer output={toolPart.output} />
            ) : null
          return (
            <div key={i} className="space-y-2">
              <Tool className="mb-0">
                {toolPart.type === 'dynamic-tool' ? (
                  <ToolHeader
                    type={toolPart.type}
                    toolName={toolPart.toolName}
                    state={toolPart.state}
                    statusLabel={stateLabel(toolPart.state)}
                    className="p-2"
                  />
                ) : (
                  <ToolHeader
                    type={toolPart.type}
                    state={toolPart.state}
                    statusLabel={stateLabel(toolPart.state)}
                    className="p-2"
                  />
                )}
                <ToolContent className="space-y-3 p-3">
                  {toolPart.input !== undefined && (
                    <ToolInput
                      input={toolPart.input}
                      label={t('chat:tool.parameters')}
                    />
                  )}
                  <Confirmation
                    approval={toolPart.approval}
                    state={toolPart.state}
                  >
                    <ConfirmationRequest className="text-muted-foreground">
                      {t('chat:approval.pending')}
                    </ConfirmationRequest>
                    <ConfirmationActions>
                      <ConfirmationAction
                        disabled={responding}
                        onClick={() =>
                          approvalId && onRespondApproval(approvalId, true)
                        }
                      >
                        {t('chat:approval.approve')}
                      </ConfirmationAction>
                      <ConfirmationAction
                        variant="outline"
                        disabled={responding}
                        onClick={() =>
                          approvalId && onRespondApproval(approvalId, false)
                        }
                      >
                        {t('chat:approval.deny')}
                      </ConfirmationAction>
                    </ConfirmationActions>
                    <ConfirmationAccepted className="text-muted-foreground">
                      {t('chat:approval.accepted')}
                    </ConfirmationAccepted>
                    <ConfirmationRejected className="text-muted-foreground">
                      {t('chat:approval.denied')}
                    </ConfirmationRejected>
                  </Confirmation>
                  <ToolOutput
                    output={toolPart.output}
                    errorText={toolPart.errorText}
                    label={t('chat:tool.result')}
                    errorLabel={t('chat:tool.error')}
                  />
                </ToolContent>
              </Tool>
              {rich}
            </div>
          )
        }
        return null
      })}
    </>
  )
}

// Empty-state suggestions, picked from the current route. Keys point to
// `chat:suggestions.*`. The example agent only acts on `items`, so the set is
// small; branch on the route to surface page-specific prompts as you add
// tools.
function suggestionKeys(_pathname: string): Array<string> {
  return ['listItems', 'createItem']
}

export function AiPanel({
  orgId,
  open = true,
  onClose,
}: {
  orgId: Id<'organizations'>
  /** Panel visibility (hidden via CSS by the layout): focus on open. */
  open?: boolean
  /** Closes the panel (desktop collapse / mobile overlay). */
  onClose: () => void
}) {
  const { t, i18n } = useTranslation(['chat', 'common'])
  const location = useLocation()
  const [threadId, setThreadId] = useState<string | null>(null)
  // true = the user asked for a new thread: don't re-adopt the latest
  // existing thread until they have sent something.
  const [draftNew, setDraftNew] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // true between the sendMessage acknowledgment and the first streamed
  // token: drives the "thinking" indicator.
  const [awaitingStream, setAwaitingStream] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  // Approval id whose response is being sent (disables the Confirm /
  // Reject buttons until the mutation acks).
  const [respondingApprovalId, setRespondingApprovalId] = useState<
    string | null
  >(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevOpenRef = useRef(open)

  const createThread = useConvexMutation(api.chat.createNewThread)
  const sendMessage = useConvexMutation(api.chat.sendMessage)
  const respondToToolApproval = useConvexMutation(
    api.chat.respondToToolApproval,
  )
  const renameThread = useConvexMutation(api.chat.renameThread)
  const deleteThread = useConvexMutation(api.chat.deleteThread)
  const stopStream = useConvexMutation(api.chat.stopStream)

  const threads = usePaginatedQuery(
    api.chat.listThreads,
    { orgId },
    { initialNumItems: 20 },
  )

  // On mount (or after deletion): resume the most recent thread.
  useEffect(() => {
    if (threadId || draftNew) return
    if (threads.status === 'LoadingFirstPage') return
    const latest = threads.results.at(0)
    if (latest) setThreadId(latest._id)
  }, [threadId, draftNew, threads.status, threads.results])

  const messages = useUIMessages(
    api.chat.listMessages,
    threadId ? { orgId, threadId } : 'skip',
    { initialNumItems: 50, stream: true },
  )

  // Focus the composer when the panel opens (not on initial mount: the
  // panel is open by default, don't steal the page's focus).
  useEffect(() => {
    if (open && !prevOpenRef.current) textareaRef.current?.focus()
    prevOpenRef.current = open
  }, [open])

  // The "thinking" indicator drops as soon as the response starts
  // streaming (or when switching conversations).
  useEffect(() => {
    if (messages.results.at(-1)?.role === 'assistant') {
      setAwaitingStream(false)
    }
  }, [messages.results])
  useEffect(() => {
    setAwaitingStream(false)
  }, [threadId])

  const currentThread = threads.results.find((th) => th._id === threadId)
  const currentTitle = currentThread?.title ?? t('chat:threads.untitled')
  const streaming = messages.results.at(-1)?.status === 'streaming'
  const thinking = (sending || awaitingStream) && !streaming
  const isEmpty =
    (!threadId || messages.results.length === 0) && !sending && !awaitingStream

  async function submitPrompt(prompt: string) {
    if (!prompt || sending || streaming) return
    setSending(true)
    setInput('')
    try {
      let target = threadId
      if (!target) {
        target = await createThread({ orgId })
        setThreadId(target)
        setDraftNew(false)
      }
      await sendMessage({
        orgId,
        threadId: target,
        prompt,
        context: { route: location.pathname },
      })
      setAwaitingStream(true)
    } catch (err) {
      toast.error(
        errorCode(err) === 'rate_limited'
          ? t('chat:errors.rate_limited')
          : t('chat:errors.default'),
      )
      setInput(prompt)
    } finally {
      setSending(false)
    }
  }

  function handleSend(message: PromptInputMessage) {
    void submitPrompt(message.text.trim())
  }

  async function handleRespondApproval(approvalId: string, approved: boolean) {
    if (!threadId || respondingApprovalId) return
    setRespondingApprovalId(approvalId)
    try {
      await respondToToolApproval({
        orgId,
        threadId,
        approvalId,
        approved,
        context: { route: location.pathname },
      })
      // Generation resumes through the same delta flow as sendMessage:
      // revive the "thinking" indicator until the first token.
      setAwaitingStream(true)
    } catch (err) {
      toast.error(
        errorCode(err) === 'rate_limited'
          ? t('chat:errors.rate_limited')
          : t('chat:errors.default'),
      )
    } finally {
      setRespondingApprovalId(null)
    }
  }

  function handleNewThread() {
    setThreadId(null)
    setDraftNew(true)
    textareaRef.current?.focus()
  }

  function handleSelectThread(id: string) {
    setThreadId(id)
    setDraftNew(false)
  }

  async function handleStop() {
    if (!threadId) return
    try {
      await stopStream({ orgId, threadId })
      setAwaitingStream(false)
    } catch {
      toast.error(t('chat:errors.default'))
    }
  }

  async function handleRename() {
    if (!threadId) return
    const title = renameValue.trim()
    if (!title) return
    try {
      await renameThread({ orgId, threadId, title })
      setRenameOpen(false)
    } catch {
      toast.error(t('chat:errors.default'))
    }
  }

  async function handleDelete() {
    if (!threadId) return
    try {
      await deleteThread({ orgId, threadId })
      setDeleteOpen(false)
      setThreadId(null)
      setDraftNew(false)
    } catch {
      toast.error(t('chat:errors.default'))
    }
  }

  async function handleCopy(m: UIMessage) {
    try {
      await navigator.clipboard.writeText(m.text)
      setCopiedKey(m.key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch {
      toast.error(t('chat:errors.default'))
    }
  }

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-1 border-b px-3 py-2.5">
        {/* The title IS the conversation selector (history visible in
            one click, not hidden behind an icon). */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted -ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-left"
              aria-label={t('chat:threads.history')}
              title={t('chat:threads.history')}
            >
              <h2 className="truncate text-sm font-semibold">
                {threadId ? currentTitle : t('chat:title')}
              </h2>
              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {threads.results.length === 0 ? (
              <DropdownMenuItem disabled>
                {t('chat:threads.empty')}
              </DropdownMenuItem>
            ) : (
              threads.results.map((th) => (
                <DropdownMenuItem
                  key={th._id}
                  onClick={() => handleSelectThread(th._id)}
                  className={cn(th._id === threadId && 'bg-muted')}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {th.title ?? t('chat:threads.untitled')}
                  </span>
                  <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                    {new Date(th._creationTime).toLocaleDateString(
                      i18n.language,
                    )}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={handleNewThread}
          aria-label={t('chat:new')}
          title={t('chat:new')}
        >
          <Plus className="size-4" />
        </Button>
        {threadId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label={t('chat:threads.actions')}
                title={t('chat:threads.actions')}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setRenameValue(currentThread?.title ?? '')
                  setRenameOpen(true)
                }}
              >
                <Pencil className="size-4" />
                {t('chat:threads.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                {t('common:actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={onClose}
          aria-label={t('chat:close')}
          title={t('chat:close')}
        >
          <X className="size-4" />
        </Button>
      </header>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent
          className={cn('gap-3 p-3', isEmpty && 'min-h-full')}
        >
          {isEmpty ? (
            <div className="m-auto flex flex-col items-center gap-4 px-4 text-center">
              <p className="text-muted-foreground text-sm">
                {t('chat:emptyState')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestionKeys(location.pathname).map((key) => {
                  const prompt = t(`chat:suggestions.${key}`)
                  return (
                    <Suggestion
                      key={key}
                      suggestion={prompt}
                      onClick={(s) => void submitPrompt(s)}
                    />
                  )
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.results.map((m) => (
                <Message
                  from={m.role}
                  key={m.key}
                  className={cn(m.role === 'user' && 'max-w-[85%]')}
                >
                  <MessageContent
                    className={cn(
                      m.role === 'user' && 'whitespace-pre-wrap',
                      m.role === 'assistant' && 'w-full',
                    )}
                  >
                    {m.role === 'user' ? (
                      m.text
                    ) : (
                      <>
                        <MessageParts
                          message={m}
                          onRespondApproval={(approvalId, approved) =>
                            void handleRespondApproval(approvalId, approved)
                          }
                          respondingApprovalId={respondingApprovalId}
                        />
                        {!m.text && m.status === 'streaming' && (
                          <span className="text-muted-foreground">…</span>
                        )}
                      </>
                    )}
                  </MessageContent>
                  {m.role === 'assistant' &&
                    m.status !== 'streaming' &&
                    m.text && (
                      <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageAction
                          label={t('chat:copy')}
                          tooltip={t('chat:copy')}
                          className="text-muted-foreground size-6"
                          onClick={() => void handleCopy(m)}
                        >
                          {copiedKey === m.key ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </MessageAction>
                      </MessageActions>
                    )}
                </Message>
              ))}
              {thinking && (
                <Message from="assistant">
                  <MessageContent>
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Spinner className="size-3.5" />
                      {t('chat:thinking')}
                    </span>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton aria-label={t('chat:scrollToBottom')} />
      </Conversation>

      <div className="shrink-0 border-t p-3">
        <PromptInput onSubmit={handleSend}>
          <PromptInputBody>
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder={t('chat:inputPlaceholder')}
              className="min-h-12"
            />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={
                streaming
                  ? 'streaming'
                  : sending || awaitingStream
                    ? 'submitted'
                    : undefined
              }
              onStop={() => void handleStop()}
              disabled={
                streaming ? false : sending || awaitingStream || !input.trim()
              }
              aria-label={streaming ? t('chat:stop') : t('chat:send')}
              title={streaming ? t('chat:stop') : t('chat:send')}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('chat:threads.renameTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleRename()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => void handleRename()}>
              {t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('chat:threads.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t('chat:threads.deleteConfirmBody')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              {t('common:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
