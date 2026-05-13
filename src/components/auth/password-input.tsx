import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>

/**
 * Password field with an inline show/hide toggle.
 *
 * Drop-in replacement for `<Input type="password" />`. Forwards every prop
 * to the underlying input (including `autoComplete`, `aria-invalid`,
 * `id`, `name`, `value`, change handlers). The eye button sits inside the
 * field, focusable via Tab so keyboard users can toggle without a mouse.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInputImpl({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false)
    const Icon = visible ? EyeOff : Eye

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    )
  },
)
