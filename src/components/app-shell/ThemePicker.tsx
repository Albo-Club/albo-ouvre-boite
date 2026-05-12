import { useEffect, useState } from 'react'
import { Check, Palette } from 'lucide-react'

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
  { id: 'neutral', label: 'Neutral', swatch: 'oklch(0.205 0 0)' },
  { id: 'blue', label: 'Blue', swatch: 'oklch(0.55 0.2 250)' },
  { id: 'emerald', label: 'Emerald', swatch: 'oklch(0.55 0.16 160)' },
  { id: 'violet', label: 'Violet', swatch: 'oklch(0.55 0.21 290)' },
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
  const [theme, setTheme] = useState<ThemeId>('neutral')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved)
      applyTheme(saved)
    }
  }, [])

  function change(next: ThemeId) {
    setTheme(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton tooltip="Color theme">
          <Palette />
          <span>Theme</span>
          <span
            className="ml-auto inline-block size-3 rounded-full border"
            style={{ background: current.swatch }}
          />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="min-w-44">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Color theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => change(t.id)}
            className="gap-2"
          >
            <span
              className="inline-block size-4 rounded-full border"
              style={{ background: t.swatch }}
            />
            <span>{t.label}</span>
            {t.id === theme && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
