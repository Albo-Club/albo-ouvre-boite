import { Loader2 } from 'lucide-react'

import { cn } from '~/lib/utils'

/**
 * Indeterminate spinner. Drop inside a Button next to the label during async
 * actions, or use standalone for inline loading affordances.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
    />
  )
}
