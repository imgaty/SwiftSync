'use client'

import { useEffect, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLanguage } from '@/components/language-provider'
import {
  Dropdown,
  DropdownLanguageSection,
  DropdownThemeSection,
  DropdownTrigger,
  DropdownUniversalShell,
} from '@/components/ui/app-dropdown'

const languages = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
] as const

export function SettingsPanel() {
  const { language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="absolute top-5 right-5 z-10">
      <Dropdown>
        <DropdownTrigger asChild>
          <button
            type="button"
            aria-label="Settings"
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-black/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition-colors"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </DropdownTrigger>

        <DropdownUniversalShell>
          <DropdownLanguageSection
            selectedLanguage={language}
            onSelectLanguage={(value) => setLanguage(value as (typeof languages)[number]['code'])}
            withSeparator
          />
          <DropdownThemeSection
            selectedTheme={mounted ? theme : undefined}
            onSelectTheme={setTheme}
          />
        </DropdownUniversalShell>
      </Dropdown>
    </div>
  )
}
