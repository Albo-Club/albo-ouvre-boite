/**
 * The tool calls of an assistant message, rendered with AI Elements'
 * Chain of Thought: a quiet header ("3 sources consultées", or the running
 * tool's label under a Shimmer while the answer is being built), then one
 * step per run of calls to the same tool — a burst of 40 `listValuations`
 * is one step whose description counts the calls, never 40 rows.
 *
 * Each step's label is the tool's human name (`chat:tool.labels.*`, falling
 * back to the name split into words). Under the step, every call is an
 * AI Elements `Tool` block (status, parameters, raw JSON) folded by default,
 * and the Confirm / Reject buttons of a write sit right there.
 *
 * Open while the message streams (the steps appear one by one), folded once
 * it is done; forced open while a tool needs the user (approval, error,
 * refusal). Rich renderers (`toolRenderers.tsx`) still show below the block.
 */

import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2Icon, PencilIcon, SearchIcon, XCircleIcon } from 'lucide-react'
import type { TFunction } from 'i18next'
import type { LucideIcon, LucideProps } from 'lucide-react'
import type { ToolPart } from '~/components/ai-elements/tool'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '~/components/ai-elements/chain-of-thought'
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
} from '~/components/ai-elements/confirmation'
import { Shimmer } from '~/components/ai-elements/shimmer'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '~/components/ai-elements/tool'
import { getToolRenderer } from '~/components/ai/toolRenderers'
import { cn } from '~/lib/utils'

/** `tool-listDeals` → `listDeals`; `dynamic-tool` → its `toolName`. */
function toolName(part: ToolPart): string {
  return part.type === 'dynamic-tool'
    ? part.toolName
    : part.type.slice('tool-'.length)
}

/** `listDeals` → "List deals": the fallback for a tool with no label yet. */
function humanize(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Human label of a tool (`chat:tool.labels.<name>`), never the raw name. */
function toolLabel(t: TFunction, name: string): string {
  return t(`chat:tool.labels.${name}`, { defaultValue: humanize(name) })
}

function isRunning(part: ToolPart): boolean {
  return part.state === 'input-streaming' || part.state === 'input-available'
}

function needsAttention(part: ToolPart): boolean {
  return (
    part.state === 'approval-requested' ||
    part.state === 'output-error' ||
    part.state === 'output-denied'
  )
}

/** The step icon while one of its calls runs (a Lucide-shaped spinner). */
const SpinnerIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <Loader2Icon
      ref={ref}
      className={cn('animate-spin', className)}
      {...props}
    />
  ),
)
SpinnerIcon.displayName = 'SpinnerIcon'

/** A read tool lists, gets or searches; everything else writes. */
function stepIcon(name: string, error: boolean): LucideIcon {
  if (error) return XCircleIcon
  return /^(list|get|search)/.test(name) ? SearchIcon : PencilIcon
}

/**
 * Number of items in a list result: a bare array, or an object whose single
 * array field carries the rows (`{ rows, totals }`). Anything else: none.
 */
function resultCount(output: unknown): number | null {
  if (Array.isArray(output)) return output.length
  if (typeof output !== 'object' || output === null) return null
  const arrays = Object.values(output).filter(Array.isArray)
  return arrays.length === 1 ? arrays[0].length : null
}

function stateLabel(t: TFunction, state: ToolPart['state']): string {
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
  }
}

/** One call of a tool: the AI Elements `Tool` block plus its approval. */
function ToolCall({
  part,
  title,
  onRespondApproval,
  respondingApprovalId,
}: {
  part: ToolPart
  title: string
  onRespondApproval: (approvalId: string, approved: boolean) => void
  respondingApprovalId: string | null
}) {
  const { t } = useTranslation(['chat'])
  const approvalId = part.approval?.id
  const responding =
    approvalId !== undefined && approvalId === respondingApprovalId
  return (
    <div className="space-y-2">
      <Confirmation approval={part.approval} state={part.state}>
        <ConfirmationRequest className="text-muted-foreground">
          {t('chat:approval.pending')}
        </ConfirmationRequest>
        <ConfirmationActions>
          <ConfirmationAction
            disabled={responding}
            onClick={() => approvalId && onRespondApproval(approvalId, true)}
          >
            {t('chat:approval.approve')}
          </ConfirmationAction>
          <ConfirmationAction
            variant="outline"
            disabled={responding}
            onClick={() => approvalId && onRespondApproval(approvalId, false)}
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
      <Tool className="mb-0">
        {part.type === 'dynamic-tool' ? (
          <ToolHeader
            type={part.type}
            toolName={part.toolName}
            state={part.state}
            title={title}
            statusLabel={stateLabel(t, part.state)}
            className="p-2"
          />
        ) : (
          <ToolHeader
            type={part.type}
            state={part.state}
            title={title}
            statusLabel={stateLabel(t, part.state)}
            className="p-2"
          />
        )}
        <ToolContent className="space-y-3 p-3">
          {part.input !== undefined && (
            <ToolInput input={part.input} label={t('chat:tool.parameters')} />
          )}
          <ToolOutput
            output={part.output}
            errorText={part.errorText}
            label={t('chat:tool.result')}
            errorLabel={t('chat:tool.error')}
          />
        </ToolContent>
      </Tool>
    </div>
  )
}

type Step = { name: string; parts: Array<ToolPart> }

/** Consecutive calls to the same tool form one step. */
function toSteps(parts: Array<ToolPart>): Array<Step> {
  const steps: Array<Step> = []
  for (const part of parts) {
    const name = toolName(part)
    const last = steps.at(-1)
    if (last?.name === name) last.parts.push(part)
    else steps.push({ name, parts: [part] })
  }
  return steps
}

function stepDescription(t: TFunction, step: Step): string {
  const calls = step.parts.length
  const items = step.parts
    .map((p) => (p.state === 'output-available' ? resultCount(p.output) : null))
    .filter((n): n is number => n !== null)
  const itemsText =
    items.length > 0
      ? t('chat:tool.items', { count: items.reduce((a, b) => a + b, 0) })
      : ''
  if (calls === 1) return itemsText
  const callsText = t('chat:tool.calls', { count: calls })
  return itemsText ? `${callsText} · ${itemsText}` : callsText
}

export function ToolGroup({
  parts,
  live,
  onRespondApproval,
  respondingApprovalId,
}: {
  /** Consecutive tool parts of one assistant message. */
  parts: Array<ToolPart>
  /**
   * The message is still streaming and nothing follows this group: the
   * header carries the activity (running tool, or "Réflexion…" between
   * two calls) and the block stays open.
   */
  live: boolean
  onRespondApproval: (approvalId: string, approved: boolean) => void
  respondingApprovalId: string | null
}) {
  const { t } = useTranslation(['chat'])
  const steps = toSteps(parts)
  const runningPart = parts.find(isRunning)
  const attention = parts.some(needsAttention)
  const awaitingApproval = parts.some((p) => p.state === 'approval-requested')
  const busy = live || attention
  const [open, setOpen] = useState(busy)
  // Open while the answer is being built or a tool needs the user, folded
  // once the answer is done; the user may toggle it afterwards.
  useEffect(() => {
    setOpen(busy)
  }, [busy])

  const header = runningPart ? (
    <Shimmer as="span">{`${toolLabel(t, toolName(runningPart))}…`}</Shimmer>
  ) : awaitingApproval ? (
    t('chat:sources.approval')
  ) : live ? (
    <Shimmer as="span">{t('chat:thinking')}</Shimmer>
  ) : (
    t('chat:sources.done', { count: steps.length })
  )

  return (
    <>
      <ChainOfThought open={open} onOpenChange={setOpen} className="space-y-0">
        <ChainOfThoughtHeader>{header}</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          {steps.map((step) => {
            const active = step.parts.some(
              (p) => isRunning(p) || p.state === 'approval-requested',
            )
            const error = step.parts.some(
              (p) => p.state === 'output-error' || p.state === 'output-denied',
            )
            const Icon = stepIcon(step.name, error)
            return (
              <ChainOfThoughtStep
                key={step.parts[0].toolCallId}
                icon={step.parts.some(isRunning) ? SpinnerIcon : Icon}
                label={toolLabel(t, step.name)}
                description={stepDescription(t, step) || undefined}
                status={active ? 'active' : 'complete'}
                className={error ? 'text-destructive' : undefined}
              >
                {step.parts.map((part, n) => (
                  <ToolCall
                    key={part.toolCallId}
                    part={part}
                    title={
                      step.parts.length > 1
                        ? t('chat:tool.call', { n: n + 1 })
                        : t('chat:tool.details')
                    }
                    onRespondApproval={onRespondApproval}
                    respondingApprovalId={respondingApprovalId}
                  />
                ))}
              </ChainOfThoughtStep>
            )
          })}
        </ChainOfThoughtContent>
      </ChainOfThought>
      {parts.map((part) => {
        // The renderer is defensive itself (null on unexpected shape); the
        // `output-available` state guarantees `output` is present.
        const Renderer = getToolRenderer(toolName(part))
        return Renderer && part.state === 'output-available' ? (
          <Renderer key={part.toolCallId} output={part.output} />
        ) : null
      })}
    </>
  )
}
