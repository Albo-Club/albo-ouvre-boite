'use client'

import { createContext, useContext } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type { ToolPart } from '~/components/ai-elements/tool'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

// Approval block for a tool call (Confirm / Reject buttons). Modeled on
// upstream vercel/ai-elements: no hardcoded strings, all user-facing copy
// arrives as children from the call site (which has `t()`). `state` and the
// `approval` field come from the AI SDK tool parts (cf. ToolPart in tool.tsx).

/** Approval carried by a tool part: id + (after response) approved/reason. */
type ToolApproval = NonNullable<Extract<ToolPart, { approval: object }>['approval']>

type ConfirmationContextValue = {
  approval: ToolApproval | undefined
  state: ToolPart['state']
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null)

function useConfirmation() {
  const ctx = useContext(ConfirmationContext)
  if (!ctx) {
    throw new Error('Confirmation components must be used within <Confirmation>')
  }
  return ctx
}

export type ConfirmationProps = ComponentProps<'div'> & {
  approval: ToolApproval | undefined
  state: ToolPart['state']
}

export const Confirmation = ({
  approval,
  state,
  className,
  children,
  ...props
}: ConfirmationProps) => {
  // Nothing to show while the input streams or when the tool does not
  // await approval (no `approval` object).
  if (!approval || state === 'input-streaming' || state === 'input-available') {
    return null
  }

  return (
    <ConfirmationContext.Provider value={{ approval, state }}>
      <div className={cn('space-y-2', className)} {...props}>
        {children}
      </div>
    </ConfirmationContext.Provider>
  )
}

export type ConfirmationRequestProps = ComponentProps<'div'>

export const ConfirmationRequest = ({
  className,
  children,
  ...props
}: ConfirmationRequestProps) => {
  const { state } = useConfirmation()
  if (state !== 'approval-requested') return null
  return (
    <div className={cn('text-sm', className)} {...props}>
      {children}
    </div>
  )
}

export type ConfirmationAcceptedProps = ComponentProps<'div'>

export const ConfirmationAccepted = ({
  className,
  children,
  ...props
}: ConfirmationAcceptedProps) => {
  const { approval, state } = useConfirmation()
  const responded =
    state === 'approval-responded' ||
    state === 'output-available' ||
    state === 'output-denied'
  if (!responded || approval?.approved !== true) return null
  return (
    <div className={cn('text-sm', className)} {...props}>
      {children}
    </div>
  )
}

export type ConfirmationRejectedProps = ComponentProps<'div'>

export const ConfirmationRejected = ({
  className,
  children,
  ...props
}: ConfirmationRejectedProps) => {
  const { approval, state } = useConfirmation()
  const responded =
    state === 'approval-responded' ||
    state === 'output-available' ||
    state === 'output-denied'
  if (!responded || approval?.approved !== false) return null
  return (
    <div className={cn('text-sm', className)} {...props}>
      {children}
    </div>
  )
}

export type ConfirmationActionsProps = ComponentProps<'div'>

export const ConfirmationActions = ({
  className,
  children,
  ...props
}: ConfirmationActionsProps) => {
  const { state } = useConfirmation()
  if (state !== 'approval-requested') return null
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  )
}

export type ConfirmationActionProps = ComponentProps<typeof Button> & {
  children: ReactNode
}

export const ConfirmationAction = ({
  className,
  variant = 'default',
  size = 'sm',
  children,
  ...props
}: ConfirmationActionProps) => (
  <Button
    className={cn(className)}
    variant={variant}
    size={size}
    type="button"
    {...props}
  >
    {children}
  </Button>
)
