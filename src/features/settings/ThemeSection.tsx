import { useTheme } from '@/app/theme/useTheme'
import { createRadioGroup } from '@/components/ui/createRadioGroup'
import { THEME_OPTION_LABELS } from '@/features/settings/themeOptionLabels'
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/theme'

const ThemeRadio = createRadioGroup<ThemePreference>()

// RF-09 — troca imediata; a persistência fica no ThemeProvider.
export function ThemeSection() {
  const { preference, setPreference } = useTheme()

  return (
    <section>
      <ThemeRadio.Root legend="Tema" value={preference} onValueChange={setPreference}>
        {THEME_PREFERENCES.map((option) => (
          <ThemeRadio.Option key={option} value={option}>
            {THEME_OPTION_LABELS[option]}
          </ThemeRadio.Option>
        ))}
      </ThemeRadio.Root>
    </section>
  )
}
