'use client'

import { memo, useMemo } from 'react'
import type { CSSProperties, ElementType } from 'react'
import { cn } from '~/lib/utils'

// Vendored from vercel/ai-elements `shimmer.tsx`, minus `motion/react` (a
// dependency we do not ship): the same two-layer background (a moving
// highlight over muted text, clipped to the glyphs) runs on the CSS
// keyframes of `.ai-shimmer` in `src/styles/app.css`. Re-apply after any
// reinstall from the registry — see KNOWN_ISSUES.md "AI Elements (AI panel)".

export interface TextShimmerProps {
  children: string
  as?: ElementType
  className?: string
  duration?: number
  spread?: number
}

const ShimmerComponent = ({
  children,
  as: Component = 'p',
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const dynamicSpread = useMemo(
    () => children.length * spread,
    [children, spread],
  )

  return (
    <Component
      className={cn('ai-shimmer', className)}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          animationDuration: `${duration}s`,
        } as CSSProperties
      }
    >
      {children}
    </Component>
  )
}

export const Shimmer = memo(ShimmerComponent)
