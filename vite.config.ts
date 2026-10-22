import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { PWA_OPTIONS } from './src/app/pwa/pwaOptions.ts'

// CA-11.5 — versão exibida em Ajustes → Sobre. Lida aqui e injetada pelo `define` para que
// só a string entre no bundle (importar o package.json no app levaria o arquivo inteiro).
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string
}

// D-46 — testes em dois projetos do Vitest: `unit` roda em node (sem o custo de criar o
// jsdom em cada arquivo) e `dom` roda em jsdom com o setup da Testing Library. Todo
// `*.test.ts` vai para `unit`, exceto os listados aqui, que usam DOM (document, window,
// localStorage, matchMedia ou renderHook); todo `*.test.tsx` vai para `dom`.
const DOM_TEST_FILES = [
  'src/app/pwa/registerPwa.test.ts',
  'src/app/theme/indexHtmlThemeScript.test.ts',
  'src/components/ui/useDebouncedValue.test.ts',
  'src/features/transactions/useTransactionList.test.ts',
  'src/lib/themeStorage.test.ts',
  'src/repositories/settingsRepository.test.ts',
  'src/repositories/tagsRepository.listTags.test.ts',
  'src/repositories/themePreference.test.ts',
  'src/repositories/themeRepository.test.ts',
  'src/repositories/transactionsRepository.list.properties.test.ts',
  'src/stores/uiStore.filters.test.ts',
  'src/stores/uiStore.test.ts',
]

// Vitest fica neste arquivo para herdar o alias `@/` e os plugins do Vite.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // §6.9 / RF-11 — PWA instalável e offline.
    VitePWA(PWA_OPTIONS),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // D-43 — fontes do Tailwind importadas por src/index.css: o build exclui src/dev
      // (§6.12); o servidor DEV inclui, para existir uma única folha Tailwind.
      '@tailwind-sources': fileURLToPath(
        new URL(
          `./src/styles/tailwind-sources.${command === 'build' ? 'build' : 'serve'}.css`,
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    // Os projetos herdam (extends: true) os plugins, os aliases `@/` e `@tailwind-sources` e o define.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./src/test/setup.unit.ts'],
          include: ['src/**/*.test.ts'],
          exclude: DOM_TEST_FILES,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.tsx', ...DOM_TEST_FILES],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // RNF-07: cobertura >= 90% em src/domain e src/lib.
      include: ['src/domain/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
}))
