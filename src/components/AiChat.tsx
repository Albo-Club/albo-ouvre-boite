import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIMessages } from '@convex-dev/agent/react'
import { useConvexMutation } from '@convex-dev/react-query'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

export function AiChat({
  orgId,
  open,
  onClose,
}: {
  orgId: Id<'organizations'>
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation(['chat'])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const createThread = useConvexMutation(api.chat.createNewThread)
  const sendMessage = useConvexMutation(api.chat.sendMessage)

  const messages = useUIMessages(
    api.chat.listMessages,
    threadId ? { orgId, threadId } : 'skip',
    { initialNumItems: 50, stream: true },
  )

  useEffect(() => {
    if (!open || threadId) return
    let cancelled = false
    void createThread({ orgId }).then((id) => {
      if (!cancelled) setThreadId(id)
    })
    return () => {
      cancelled = true
    }
  }, [open, threadId, orgId, createThread])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.results])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const prompt = input.trim()
    if (!prompt || !threadId || sending) return
    setSending(true)
    setInput('')
    try {
      await sendMessage({ orgId, threadId, prompt })
    } catch (err) {
      const data = err instanceof ConvexError ? err.data : null
      const code =
        typeof data === 'string'
          ? data
          : data && typeof data === 'object' && 'code' in data
            ? (data as { code: string }).code
            : ''
      toast.error(
        code === 'rate_limited'
          ? t('chat:errors.rate_limited')
          : t('chat:errors.default'),
      )
      setInput(prompt)
    } finally {
      setSending(false)
    }
  }

  function handleNewThread() {
    setThreadId(null)
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'bg-background fixed top-0 right-0 z-50 flex h-svh w-full max-w-md flex-col border-l shadow-xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">{t('chat:title')}</h2>
            <p className="text-muted-foreground text-xs">
              {t('chat:subtitle')}
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleNewThread}>
              {t('chat:new')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label={t('chat:close')}
            >
              ✕
            </Button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {!threadId ? (
            <p className="text-muted-foreground text-sm">
              {t('chat:loading')}
            </p>
          ) : messages.results.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('chat:emptyState')}
            </p>
          ) : (
            <ul className="space-y-4">
              {messages.results.map((m) => (
                <li
                  key={m.key}
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                  >
                    {m.text || (m.status === 'streaming' ? '…' : '')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSend} className="border-t p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat:inputPlaceholder')}
              disabled={!threadId || sending}
            />
            <Button type="submit" disabled={!input.trim() || sending}>
              {t('chat:send')}
            </Button>
          </div>
        </form>
      </aside>
    </>
  )
}
