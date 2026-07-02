import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { CHANGELOG_ENTRIES } from '~/lib/changelog'
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'

export const Route = createFileRoute('/app/$orgSlug/changelog')({
  component: ChangelogPage,
  head: () => ({
    meta: [
      {
        title: getI18n(getLocale()).getFixedT(null, 'changelog')('metaTitle'),
      },
    ],
  }),
})

/**
 * Full "What's new" page: the complete release history, newest first. The
 * sidebar dialog shows a short preview and links here. Entries come from
 * CHANGELOG_ENTRIES (metadata) with bilingual copy resolved from the
 * `changelog` i18n namespace, keyed by `id`.
 */
function ChangelogPage() {
  const { t, i18n } = useTranslation('changelog')

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 p-6 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      <div className="space-y-8">
        {CHANGELOG_ENTRIES.map((entry) => (
          <article key={entry.id} className="space-y-1">
            <p className="text-muted-foreground text-xs">
              {formatDate(entry.date)}
            </p>
            <h2 className="text-base font-semibold">
              {t(`entries.${entry.id}.title`)}
            </h2>
            <p className="text-foreground/90 text-sm leading-relaxed">
              {t(`entries.${entry.id}.body`)}
            </p>
          </article>
        ))}
      </div>
    </main>
  )
}
