import { useEffect, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { SidebarMenuButton } from '~/components/ui/sidebar'

const THEMES = [
  { id: 'neutral', swatch: 'oklch(0.205 0 0)' },
  { id: 'blue', swatch: 'oklch(0.55 0.2 250)' },
  { id: 'emerald', swatch: 'oklch(0.55 0.16 160)' },
  { id: 'violet', swatch: 'oklch(0.55 0.21 290)' },
] as const

type ThemeId = (typeof THEMES)[number]['id']
const STORAGE_KEY = 'app-color-theme'

function applyTheme(theme: ThemeId) {
  const html = document.documentElement
  if (theme === 'neutral') {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', theme)
  }
}

export function ThemePicker() {
  const { t } = useTranslation('nav')
  const [theme, setTheme] = useState<ThemeId>('neutral')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null
    if (saved && THEMES.some((opt) => opt.id === saved)) {
      setTheme(saved)
      applyTheme(saved)
    }
  }, [])

  function change(next: ThemeId) {
    setTheme(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const current = THEMES.find((opt) => opt.id === theme) ?? THEMES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton tooltip={t('theme.colorTheme')}>
          <Palette />
          <span>{t('theme.label')}</span>
          <span
            className="ml-auto inline-block size-3 rounded-full border"
            style={{ background: current.swatch }}
          />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="min-w-44">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {t('theme.colorTheme')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onSelect={() => change(opt.id)}
            className="gap-2"
          >
            <span
              className="inline-block size-4 rounded-full border"
              style={{ background: opt.swatch }}
            />
            <span>{t(`theme.${opt.id}`)}</span>
            {opt.id === theme && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
