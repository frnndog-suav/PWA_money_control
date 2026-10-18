import { getThemeColor, type ResolvedTheme } from '@/lib/theme'

// Mesmo efeito do script inline do index.html, repetido a cada troca de tema (CA-09.3/09.4).
export function applyThemeToDocument(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getThemeColor(theme))
}
