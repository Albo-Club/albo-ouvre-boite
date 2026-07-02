import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { SidebarMenuButton } from '~/components/ui/sidebar'
import { CHANGELOG_ENTRIES, LATEST_CHANGELOG_ID } from '~/lib/changelog'

const STORAGE_KEY = 'changelog-last-seen'

/** How many recent entries the dialog previews before "See all". */
const PREVIEW_COUNT = 3

/**
 * "What's new" entry point in the sidebar footer. Shows a dot until the
 * latest changelog entry has been seen (tracked in localStorage), and opens
 * a dialog previewing the most recent entries newest-first — date, title,
 * short description — with a link to the full changelog page.
 */
export function WhatsNew({ currentSlug }: { currentSlug: string }) {
  const { t, i18n } = useTranslation('changelog')
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    setHasUnread(localStorage.getItem(STORAGE_KEY) !== LATEST_CHANGELOG_ID)
  }, [])

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      localStorage.setItem(STORAGE_KEY, LATEST_CHANGELOG_ID)
      setHasUnread(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <SidebarMenuButton tooltip={t('title')}>
          <Megaphone />
          <span>{t('button')}</span>
          {hasUnread && (
            <span
              className="bg-primary ml-auto inline-block size-2 rounded-full"
              aria-hidden="true"
            />
          )}
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="max-h-[80svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {CHANGELOG_ENTRIES.slice(0, PREVIEW_COUNT).map((entry) => (
            <article key={entry.id} className="space-y-1">
              <p className="text-muted-foreground text-xs">
                {formatDate(entry.date)}
              </p>
              <h3 className="text-sm font-medium">
                {t(`entries.${entry.id}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t(`entries.${entry.id}.body`)}
              </p>
            </article>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" asChild>
            <Link
              to="/app/$orgSlug/changelog"
              params={{ orgSlug: currentSlug }}
              onClick={() => setOpen(false)}
            >
              {t('seeAll')}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
