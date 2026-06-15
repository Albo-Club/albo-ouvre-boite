'use client'

import { Loader2Icon, SendIcon, SquareIcon } from 'lucide-react'
import type { ComponentProps, FormEvent, KeyboardEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

/**
 * Minimal Prompt Input — a deliberately trimmed subset of Vercel AI Elements'
 * prompt-input. Upstream ships attachments + a model picker, which pull in
 * command / hover-card / input-group / nanoid; this skeleton only needs a
 * multiline composer and a submit/stop button, so we vendor a small version.
 * See KNOWN_ISSUES.md "AI Elements (AI panel) — trimmed vendoring".
 */

export type PromptInputMessage = { text: string }

export type PromptInputProps = Omit<ComponentProps<'form'>, 'onSubmit'> & {
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void
}

export function PromptInput({ className, onSubmit, ...props }: PromptInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = String(new FormData(event.currentTarget).get('message') ?? '')
    onSubmit({ text }, event)
  }
  return (
    <form
      className={cn('bg-muted/40 flex flex-col rounded-xl border', className)}
      onSubmit={handleSubmit}
      {...props}
    />
  )
}

export type PromptInputBodyProps = ComponentProps<'div'>
export function PromptInputBody({ className, ...props }: PromptInputBodyProps) {
  return <div className={cn('flex flex-col', className)} {...props} />
}

export type PromptInputTextareaProps = ComponentProps<typeof Textarea>
export function PromptInputTextarea({
  className,
  onKeyDown,
  ...props
}: PromptInputTextareaProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter submits; Shift+Enter inserts a newline. Ignore IME composition.
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
    onKeyDown?.(event)
  }
  return (
    <Textarea
      name="message"
      className={cn(
        'resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
        className,
      )}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export type PromptInputFooterProps = ComponentProps<'div'>
export function PromptInputFooter({
  className,
  ...props
}: PromptInputFooterProps) {
  return (
    <div
      className={cn('flex items-center gap-1 p-1', className)}
      {...props}
    />
  )
}

export type PromptInputSubmitProps = Omit<
  ComponentProps<typeof Button>,
  'onClick'
> & {
  status?: 'submitted' | 'streaming' | 'error' | undefined
  onStop?: () => void
}
export function PromptInputSubmit({
  status,
  onStop,
  className,
  ...props
}: PromptInputSubmitProps) {
  const streaming = status === 'streaming'
  return (
    <Button
      {...props}
      type={streaming ? 'button' : 'submit'}
      size="icon"
      onClick={streaming ? onStop : undefined}
      className={cn('size-8 rounded-full', className)}
    >
      {streaming ? (
        <SquareIcon className="size-4" />
      ) : status === 'submitted' ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SendIcon className="size-4" />
      )}
    </Button>
  )
}
