// In-app changelog ("What's new") entry metadata, newest first. The
// user-facing copy lives in the `changelog` i18n namespace, keyed by `id` —
// add the entry here AND in src/locales/{en,fr}/changelog.json.
export const CHANGELOG_ENTRIES = [
  { id: 'whats-new-panel', date: '2026-06-10' },
  { id: 'ai-formatting', date: '2026-06-10' },
  { id: 'loading-skeletons', date: '2026-06-10' },
  { id: 'friendly-errors', date: '2026-06-10' },
] as const

export const LATEST_CHANGELOG_ID = CHANGELOG_ENTRIES[0].id
