// Conteúdo escrito à mão pelo agente architecture-mapper (§6.12): o que o scanner não consegue
// inferir do código. Todo caminho citado aqui precisa existir no grafo gerado
// (garantido por src/dev/architecture/architecture.test.ts).

import type {
  AllowedDependency,
  ArchitectureFinding,
  CompositionNote,
  DecisionInfo,
  Flow,
  LayerInfo,
  PackageSource,
  PlannedDomainFunction,
  PlannedFlow,
  PlannedTable,
  PlannedUiField,
  RequirementInfo,
  RouteNote,
  ScreenComposition,
} from '@/dev/architecture/types'

// ---------- camadas (§6.2) ----------

export const LAYERS: readonly LayerInfo[] = [
  {
    id: 'config',
    label: 'Configuração',
    folder: '(raiz)',
    description:
      'index.html (script inline do tema, metatags do iOS), vite.config.ts (plugins, VitePWA, alias, Vitest), tsconfig, oxlint, Prettier e scripts/ (gerador de ícones).',
    position: { x: 130, y: 16 },
  },
  {
    id: 'entry',
    label: 'Entrada',
    folder: 'src/main.tsx',
    description:
      'Registra o service worker (registerPwa(registerSW)), monta o React no #root e importa o CSS global.',
    position: { x: 390, y: 16 },
  },
  {
    id: 'app',
    label: 'App',
    folder: 'src/app',
    description:
      'App.tsx, rotas (createBrowserRouter), páginas lazy, rotas DEV, layout com barra inferior, provider de tema e PWA (registro do SW, avisos de atualização e de instalação — §6.2, §6.9).',
    position: { x: 390, y: 112 },
  },
  {
    id: 'features',
    label: 'Features',
    folder: 'src/features',
    description:
      'Uma pasta por funcionalidade (home, transactions, tags, views, charts, recurrings, backup, settings).',
    position: { x: 390, y: 216 },
  },
  {
    id: 'components',
    label: 'UI',
    folder: 'src/components/ui',
    description:
      'Primitivos genéricos sem conhecimento de domínio (Page, TabBar, NavList, BackLink, Notice…).',
    position: { x: 130, y: 330 },
  },
  {
    id: 'repositories',
    label: 'Repositórios',
    folder: 'src/repositories',
    description:
      'Único acesso ao Dexie: funções e hooks com useLiveQuery (§2.7). Vazio até a Fase 2.',
    position: { x: 390, y: 330 },
  },
  {
    id: 'stores',
    label: 'Stores',
    folder: 'src/stores',
    description:
      'Zustand só para estado de interface (§6.7). uiStore desde a Fase 1 (updateAvailable); filtros e visões nas Fases 5 e 7.',
    position: { x: 650, y: 330 },
  },
  {
    id: 'lib',
    label: 'Lib',
    folder: 'src/lib',
    description:
      'Utilitários puros e adaptadores de APIs do navegador (tema, localStorage, modo instalado; cripto e backup depois).',
    position: { x: 130, y: 450 },
  },
  {
    id: 'db',
    label: 'Banco (Dexie)',
    folder: 'src/db',
    description: 'Classe Dexie, versões e SCHEMA_VERSION (§6.4). Vazio até a Fase 2.',
    position: { x: 390, y: 450 },
  },
  {
    id: 'domain',
    label: 'Domínio',
    folder: 'src/domain',
    description: 'Funções puras e tipos, sem React e sem Dexie (§2.6). Vazio até a Fase 2.',
    position: { x: 650, y: 450 },
  },
  {
    id: 'test',
    label: 'Apoio a testes',
    folder: 'src/test',
    description:
      'Setup do Vitest, dublê de matchMedia e renderApp (arquivos *.test.* ficam junto do código).',
    position: { x: 740, y: 112 },
  },
  {
    id: 'dev',
    label: 'Somente DEV',
    folder: 'src/dev',
    description:
      'Esta página (§6.12). Carregada só por import dinâmico atrás de import.meta.env.DEV.',
    position: { x: 740, y: 216 },
  },
]

/**
 * Direções de dependência permitidas entre camadas (código de produção; testes e src/test
 * ficam de fora). Uma dependência observada no código que não esteja aqui aparece em
 * vermelho na página.
 */
export const ALLOWED_DEPENDENCIES: readonly AllowedDependency[] = [
  { from: 'config', to: 'entry', status: 'allowed', reason: 'index.html carrega src/main.tsx.' },
  {
    from: 'config',
    to: 'app',
    status: 'exception',
    reason:
      'Somente vite.config.ts → src/app/pwa/pwaOptions.ts (Fase 1): as opções do vite-plugin-pwa ficam em src/ para serem testadas pelo Vitest; o módulo usa import relativo com extensão porque o tsconfig.node.json não conhece o alias @/.',
    onlyTargets: ['src/app/pwa/pwaOptions.ts'],
  },
  {
    from: 'entry',
    to: 'app',
    status: 'allowed',
    reason: 'main.tsx registra o service worker (registerPwa) e renderiza <App />.',
  },
  {
    from: 'app',
    to: 'features',
    status: 'allowed',
    reason: 'As rotas montam as páginas das features.',
  },
  {
    from: 'app',
    to: 'components',
    status: 'allowed',
    reason: 'Layout e avisos do PWA usam primitivos (TabBar, Notice).',
  },
  {
    from: 'app',
    to: 'lib',
    status: 'allowed',
    reason:
      'Provider de tema usa as regras puras do tema; useIsStandalone usa lib/displayMode; pwaOptions usa THEME_COLORS.',
  },
  {
    from: 'app',
    to: 'repositories',
    status: 'allowed',
    reason: 'Fase 2: o provider de tema lê/grava a tabela settings por um repositório.',
  },
  {
    from: 'app',
    to: 'stores',
    status: 'allowed',
    reason: 'Fase 1: registerPwa grava e usePwaUpdate lê updateAvailable (aviso de nova versão).',
  },
  {
    from: 'app',
    to: 'dev',
    status: 'exception',
    reason:
      'Somente src/app/devRoutes.tsx, por import dinâmico depois do guard import.meta.env.DEV (§6.12).',
    onlyTargets: ['src/dev/architecture/ArchitecturePage.tsx'],
  },
  {
    from: 'features',
    to: 'components',
    status: 'allowed',
    reason: 'Telas são compostas de primitivos.',
  },
  {
    from: 'features',
    to: 'repositories',
    status: 'allowed',
    reason: 'Dados persistidos só por repositórios (§2.7).',
  },
  { from: 'features', to: 'stores', status: 'allowed', reason: 'Filtros e visões (§6.7).' },
  { from: 'features', to: 'domain', status: 'allowed', reason: 'Regras puras e tipos.' },
  {
    from: 'features',
    to: 'lib',
    status: 'allowed',
    reason: 'Utilitários puros (rótulos do tema, cripto…).',
  },
  {
    from: 'features',
    to: 'app',
    status: 'debt',
    reason:
      'Proibida pela D-22: features não importam de src/app/ (criaria acoplamento e risco de ciclo app ↔ features). Dívida conhecida e tolerada até a Fase 2: features/settings/ThemeSection importa app/theme/useTheme; nessa fase useTheme/ThemeContext vão para src/repositories/ (tarefa da §7, Fase 2). Qualquer outro import features → app aparece em vermelho.',
    onlyTargets: ['src/app/theme/useTheme.ts'],
    deadline: 'Fase 2 (D-22)',
  },
  {
    from: 'components',
    to: 'domain',
    status: 'allowed',
    reason:
      'Formatação pura (ex.: MoneyInput usa digitsToCents, TagChip usa readableTextColor — §6.5).',
  },
  { from: 'components', to: 'lib', status: 'allowed', reason: 'Utilitários puros.' },
  {
    from: 'repositories',
    to: 'db',
    status: 'allowed',
    reason: 'Repositórios são os únicos clientes do Dexie.',
  },
  { from: 'repositories', to: 'domain', status: 'allowed', reason: 'Tipos e regras puras.' },
  { from: 'repositories', to: 'lib', status: 'allowed', reason: 'Utilitários puros.' },
  { from: 'db', to: 'domain', status: 'allowed', reason: 'Tipos das tabelas (§6.3).' },
  {
    from: 'stores',
    to: 'domain',
    status: 'allowed',
    reason: 'Tipos (DateString, TransactionType).',
  },
  {
    from: 'lib',
    to: 'domain',
    status: 'allowed',
    reason: 'Formato de backup usa os tipos do domínio.',
  },
  { from: 'lib', to: 'lib', status: 'allowed', reason: 'themeStorage usa as regras de theme.ts.' },
  { from: 'app', to: 'app', status: 'allowed', reason: 'Organização interna.' },
  {
    from: 'features',
    to: 'features',
    status: 'allowed',
    reason: 'Somente dentro da mesma feature.',
  },
  {
    from: 'components',
    to: 'components',
    status: 'allowed',
    reason: 'Primitivos compostos entre si.',
  },
  { from: 'dev', to: 'dev', status: 'allowed', reason: 'Organização interna da página.' },
]

// ---------- rotas e telas (§6.6) ----------

export const ROUTE_NOTES: readonly RouteNote[] = [
  {
    route: '(layout)',
    screen: 'Layout com barra inferior',
    requirements: ['RF-13', 'CA-13.1', 'CA-11.3', 'CA-11.6', 'D-23'],
    description:
      'AppLayout: <main> com safe areas e espaço para a barra (pb-below-nav); InstallHint no topo do conteúdo quando o app está numa aba comum (CA-11.6, D-23); Suspense sem fallback para as telas lazy; UpdateNotice fixo logo acima da barra (bottom-above-nav) e, enquanto ele aparece, reserve-update-notice soma a altura do aviso ao fim do conteúdo (CA-11.3); BottomNav fixa no rodapé. Rotas fora do layout (como esta página DEV) não mostram nenhum dos dois avisos.',
    contentPhase: 0,
  },
  {
    route: '/',
    screen: 'Início',
    requirements: ['RF-02'],
    description:
      'Única tela fora do React.lazy (vai no pacote principal — RNF-02). Placeholder: saldo, totais e últimos lançamentos entram na Fase 4; pendências recorrentes na Fase 9.',
    contentPhase: 4,
  },
  {
    route: '/lancamentos',
    screen: 'Lista + filtros',
    requirements: ['RF-04'],
    description: 'Placeholder. Lista paginada, busca e filtros (Zustand) na Fase 5.',
    contentPhase: 5,
  },
  {
    route: '/lancamentos/novo',
    screen: 'Novo lançamento',
    requirements: ['RF-01', 'RF-08'],
    description:
      'Placeholder com Voltar. Formulário completo na Fase 4; opção Parcelado na Fase 10.',
    contentPhase: 4,
  },
  {
    route: '/lancamentos/:id',
    screen: 'Lançamento (editar/excluir)',
    requirements: ['RF-01', 'RF-07', 'RF-08'],
    description: 'Placeholder com Voltar. Edição e exclusão na Fase 4.',
    contentPhase: 4,
  },
  {
    route: '/visoes',
    screen: 'Visões por período',
    requirements: ['RF-05'],
    description: 'Placeholder. Dia/semana/mês/ano na Fase 7.',
    contentPhase: 7,
  },
  {
    route: '/graficos',
    screen: 'Gráficos',
    requirements: ['RF-06'],
    description: 'Placeholder. Chart.js com painel de detalhes (D-16) na Fase 8.',
    contentPhase: 8,
  },
  {
    route: '/ajustes',
    screen: 'Ajustes',
    requirements: ['RF-13', 'RF-09'],
    description:
      'Menu de subpáginas (SettingsMenu) + seção de tema (ThemeSection) — a única tela com comportamento real na Fase 0.',
    contentPhase: 0,
  },
  {
    route: '/ajustes/tags',
    screen: 'Tags',
    requirements: ['RF-03'],
    description: 'Placeholder com Voltar. CRUD de tags na Fase 3.',
    contentPhase: 3,
  },
  {
    route: '/ajustes/recorrentes',
    screen: 'Recorrentes',
    requirements: ['RF-07'],
    description: 'Placeholder com Voltar. Lista de recorrentes na Fase 9.',
    contentPhase: 9,
  },
  {
    route: '/ajustes/recorrentes/:id',
    screen: 'Recorrente (detalhes)',
    requirements: ['RF-07'],
    description:
      'Placeholder com Voltar. Alterar valor, encerrar, excluir, meses pulados na Fase 9.',
    contentPhase: 9,
  },
  {
    route: '/ajustes/backup',
    screen: 'Backup',
    requirements: ['RF-10'],
    description: 'Placeholder com Voltar. Exportar/importar criptografado na Fase 6.',
    contentPhase: 6,
  },
  {
    route: '/ajustes/sobre',
    screen: 'Sobre',
    requirements: ['RF-11'],
    description:
      'Placeholder com Voltar. Versão, esquema e armazenamento (CA-11.4/11.5) na Fase 2.',
    contentPhase: 2,
  },
  {
    route: '*',
    screen: 'Caminho desconhecido',
    requirements: ['D-21'],
    description:
      'Redireciona para o Início com replace (D-21, confirmada pelo dono). Fica depois das rotas DEV para não engoli-las.',
    contentPhase: 0,
  },
  {
    route: '/__dev/arquitetura',
    screen: 'Arquitetura e timeline (DEV)',
    requirements: ['D-17'],
    description:
      'Esta página. Registrada só em DEV por getDevRoutes(), no nível de cima (fora do AppLayout, sem barra inferior), com React.lazy. Ausente do dist/.',
    contentPhase: 0,
  },
]

// ---------- composição de componentes ----------

/** Anotações por componente (a árvore em si é derivada do JSX pelo scanner). */
export const COMPOSITION_NOTES: readonly CompositionNote[] = [
  {
    component: 'Page',
    note: 'Compound component: Page.Header (slot `leading` para o BackLink) e Page.Body. Sem estado.',
  },
  {
    component: 'TabBar',
    note: 'Compound component: TabBar.Link envolve o NavLink; o item ativo usa aria-current (negrito + traço, não só cor — RNF-06).',
  },
  { component: 'NavList', note: 'Compound component: NavList.Link é uma linha com alvo de 44 px.' },
  {
    component: 'BackLink',
    note: 'Botão Voltar; a lógica de histórico fica no hook useGoBack (CA-13.2).',
  },
  {
    component: 'ThemeRadio',
    note: 'Instância local de createRadioGroup<ThemePreference>(): { Root, Option } com contexto próprio e valores tipados.',
  },
  {
    component: 'ThemeProvider',
    note: 'Estado da preferência (useState) + tema do sistema (useSyncExternalStore); expõe ThemeContext.',
  },
  {
    component: 'Suspense',
    note: 'Fallback null: as telas lazy aparecem sem indicador para não piscar.',
  },
  { component: 'Outlet', note: 'Ponto onde o React Router injeta a tela da rota filha.' },
  {
    component: 'Notice',
    note: 'Compound component (Fase 1): Notice.Message (texto, flex-1) e Notice.Action (botão ≥ 44 px, foco branco para aparecer sobre o azul). Variantes accent (com ação) e subtle (só texto). Não decide região viva nem posição: quem usa decide.',
  },
  {
    component: 'UpdateNotice',
    note: 'Região viva role="status" aria-live="polite" sempre montada (vazia sem versão nova), fixa com bottom-above-nav; dentro, Notice accent com altura h-(--update-notice-height). Lê o estado por usePwaUpdate (não toca no Zustand diretamente).',
  },
  {
    component: 'InstallHint',
    note: 'Notice subtle sem ação nem botão de fechar (D-23); devolve null no modo instalado (useIsStandalone).',
  },
]

/** Componentes locais (não importados) e o módulo de onde vêm. */
export const LOCAL_COMPONENT_ORIGINS: Readonly<Record<string, string>> = {
  ThemeRadio: 'src/components/ui/createRadioGroup.tsx',
}

export const SCREEN_COMPOSITION: readonly ScreenComposition[] = [
  {
    route: '(layout)',
    stateAndData:
      'Sem estado próprio. O tema vem do ThemeProvider (acima do RouterProvider em App.tsx); a navegação, do React Router. updateAvailable vem do Zustand (src/stores/uiStore.ts) pelo hook usePwaUpdate, lido pelo AppLayout (classe reserve-update-notice) e pelo UpdateNotice (aviso + botão); o modo instalado vem de useIsStandalone, lido uma vez por sessão.',
  },
  {
    route: '/ajustes',
    stateAndData:
      'ThemeSection lê { preference, setPreference } de useTheme(); o estado fica no ThemeProvider e é persistido por src/lib/themeStorage.ts (localStorage até a Fase 2).',
  },
  {
    route: '/',
    stateAndData: 'Placeholder sem estado. Na Fase 4 lerá saldos por repositórios (useLiveQuery).',
  },
]

// ---------- fluxos ----------

const THEME_SCRIPT_TEST = 'src/app/theme/indexHtmlThemeScript.test.ts'
const THEME_SECTION_TEST = 'src/features/settings/ThemeSection.test.tsx'

export const FLOWS: readonly Flow[] = [
  {
    id: 'theme-boot',
    title: 'Abertura do app sem piscar o tema',
    summary:
      'O script inline do index.html aplica a classe .dark e o theme-color antes do bundle; depois o ThemeProvider chega ao mesmo resultado e reaplica sem mudança visível.',
    requirements: ['CA-09.2', 'CA-09.3', 'CA-09.4'],
    participants: [
      { id: 'browser', label: 'Navegador' },
      { id: 'html', label: 'index.html (script)', module: 'index.html' },
      { id: 'storage', label: 'localStorage' },
      { id: 'main', label: 'main.tsx', module: 'src/main.tsx' },
      { id: 'provider', label: 'ThemeProvider', module: 'src/app/theme/ThemeProvider.tsx' },
      { id: 'themeStorage', label: 'themeStorage', module: 'src/lib/themeStorage.ts' },
      { id: 'theme', label: 'lib/theme', module: 'src/lib/theme.ts' },
      {
        id: 'apply',
        label: 'applyThemeToDocument',
        module: 'src/app/theme/applyThemeToDocument.ts',
      },
    ],
    steps: [
      {
        from: 'browser',
        to: 'html',
        label: 'carrega o HTML',
        detail: 'O script inline roda antes do CSS/JS do bundle.',
        refs: ['CA-09.3'],
        kind: 'event',
      },
      {
        from: 'html',
        to: 'storage',
        label: "getItem('theme')",
        detail: 'Dentro de try/catch (modo privado pode lançar exceção).',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'html',
        to: 'browser',
        label: 'matchMedia(dark)',
        detail: 'Automático ou valor inválido seguem o sistema.',
        refs: ['CA-09.1'],
        kind: 'call',
      },
      {
        from: 'html',
        to: 'browser',
        label: '.dark + theme-color',
        detail: 'Aplica a classe no <html> e a cor da barra de status antes da 1ª pintura.',
        refs: ['CA-09.3', 'CA-09.4'],
        kind: 'call',
      },
      {
        from: 'browser',
        to: 'main',
        label: 'carrega o bundle',
        detail: '<script type="module" src="/src/main.tsx">; createRoot().render(<App />).',
        refs: [],
        kind: 'event',
      },
      {
        from: 'main',
        to: 'provider',
        label: 'render <App/>',
        detail: 'App envolve o RouterProvider com o ThemeProvider.',
        refs: ['RF-09'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'themeStorage',
        label: 'readThemePreference()',
        detail: 'Estado inicial do useState; único ponto de leitura de localStorage[theme].',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'theme',
        label: 'resolveTheme()',
        detail: 'Preferência + useSystemPrefersDark() → light | dark.',
        refs: ['CA-09.1'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'apply',
        label: 'useEffect → aplicar',
        detail: 'Mesmo resultado do script inline: nenhuma troca visível.',
        refs: ['CA-09.3', 'CA-09.4'],
        kind: 'call',
      },
    ],
    tests: [THEME_SCRIPT_TEST, 'src/lib/theme.test.ts', 'src/lib/themeStorage.test.ts'],
  },
  {
    id: 'theme-change',
    title: 'Troca de tema em Ajustes',
    summary:
      'O usuário escolhe Automático/Claro/Escuro; a preferência é gravada e aplicada imediatamente ao documento.',
    requirements: ['CA-09.1', 'CA-09.2', 'CA-09.3', 'CA-09.4'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'radio', label: 'ThemeRadio.Option', module: 'src/components/ui/createRadioGroup.tsx' },
      { id: 'section', label: 'ThemeSection', module: 'src/features/settings/ThemeSection.tsx' },
      { id: 'hook', label: 'useTheme', module: 'src/app/theme/useTheme.ts' },
      { id: 'provider', label: 'ThemeProvider', module: 'src/app/theme/ThemeProvider.tsx' },
      { id: 'themeStorage', label: 'themeStorage', module: 'src/lib/themeStorage.ts' },
      { id: 'theme', label: 'lib/theme', module: 'src/lib/theme.ts' },
      {
        id: 'apply',
        label: 'applyThemeToDocument',
        module: 'src/app/theme/applyThemeToDocument.ts',
      },
    ],
    steps: [
      {
        from: 'user',
        to: 'radio',
        label: 'toca numa opção',
        detail: 'Input radio nativo dentro de <label> com alvo ≥ 44 px.',
        refs: ['CA-09.1'],
        kind: 'event',
      },
      {
        from: 'radio',
        to: 'section',
        label: 'onValueChange(value)',
        detail: 'Valor tipado como ThemePreference, sem cast.',
        refs: [],
        kind: 'call',
      },
      {
        from: 'section',
        to: 'hook',
        label: 'setPreference',
        detail: 'ThemeSection só repassa; não guarda estado.',
        refs: ['RF-09'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'provider',
        label: 'contexto',
        detail: 'useTheme lê ThemeContext (erro claro fora do provider).',
        refs: [],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'themeStorage',
        label: 'writeThemePreference()',
        detail: 'Grava localStorage[theme] (try/catch); migra para o Dexie na Fase 2.',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'theme',
        label: 'resolveTheme()',
        detail: 'Novo estado → tema efetivo.',
        refs: ['CA-09.1'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'apply',
        label: 'useEffect → aplicar',
        detail: 'Alterna .dark no <html> e atualiza a meta theme-color.',
        refs: ['CA-09.3', 'CA-09.4'],
        kind: 'call',
      },
    ],
    tests: [THEME_SECTION_TEST, 'src/components/ui/createRadioGroup.test.tsx'],
  },
  {
    id: 'theme-system',
    title: 'Sistema troca de tema com o app aberto (Automático)',
    summary:
      'useSystemPrefersDark assina a media query com useSyncExternalStore; o ThemeProvider re-renderiza e reaplica.',
    requirements: ['CA-09.1', 'CA-09.4'],
    participants: [
      { id: 'os', label: 'Sistema / matchMedia' },
      {
        id: 'hook',
        label: 'useSystemPrefersDark',
        module: 'src/app/theme/useSystemPrefersDark.ts',
      },
      { id: 'provider', label: 'ThemeProvider', module: 'src/app/theme/ThemeProvider.tsx' },
      { id: 'theme', label: 'lib/theme', module: 'src/lib/theme.ts' },
      {
        id: 'apply',
        label: 'applyThemeToDocument',
        module: 'src/app/theme/applyThemeToDocument.ts',
      },
    ],
    steps: [
      {
        from: 'os',
        to: 'hook',
        label: "evento 'change'",
        detail: 'Listener registrado no subscribe do useSyncExternalStore.',
        refs: ['CA-09.1'],
        kind: 'event',
      },
      {
        from: 'hook',
        to: 'provider',
        label: 'novo snapshot',
        detail: 'getSnapshot() → matches; React re-renderiza o provider.',
        refs: [],
        kind: 'return',
      },
      {
        from: 'provider',
        to: 'theme',
        label: 'resolveTheme()',
        detail: 'Com Claro/Escuro escolhido, o sistema é ignorado.',
        refs: ['CA-09.1'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'apply',
        label: 'aplicar',
        detail: 'Classe .dark e theme-color acompanham o sistema.',
        refs: ['CA-09.4'],
        kind: 'call',
      },
    ],
    tests: [THEME_SECTION_TEST],
  },
  {
    id: 'navigate-tab',
    title: 'Navegar pela barra inferior',
    summary:
      'NavLink empilha uma entrada no histórico; o roteador casa a rota, carrega a tela sob demanda e marca a aba ativa.',
    requirements: ['RF-13', 'CA-13.1', 'CA-13.2'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'tab', label: 'TabBar.Link', module: 'src/components/ui/TabBar.tsx' },
      { id: 'routes', label: 'routes.tsx', module: 'src/app/routes.tsx' },
      { id: 'lazy', label: 'lazyPages', module: 'src/app/lazyPages.tsx' },
      { id: 'layout', label: 'AppLayout', module: 'src/app/layout/AppLayout.tsx' },
      { id: 'page', label: 'Tela (feature)', module: 'src/features/charts/ChartsPage.tsx' },
    ],
    steps: [
      {
        from: 'user',
        to: 'tab',
        label: 'toca na aba',
        detail: 'Itens e ordem vêm de src/app/layout/navItems.ts (RF-13).',
        refs: ['RF-13'],
        kind: 'event',
      },
      {
        from: 'tab',
        to: 'routes',
        label: 'pushState',
        detail: 'createBrowserRouter usa o histórico real do navegador.',
        refs: ['CA-13.2'],
        kind: 'call',
      },
      {
        from: 'routes',
        to: 'lazy',
        label: 'casa a rota',
        detail: 'Rotas filhas do AppLayout; todas lazy exceto o Início.',
        refs: ['RNF-02'],
        kind: 'call',
      },
      {
        from: 'lazy',
        to: 'page',
        label: 'import() da tela',
        detail: 'React.lazy baixa o chunk da feature na primeira visita.',
        refs: ['RNF-02'],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'layout',
        label: '<Outlet/> em Suspense',
        detail: 'Fallback null; barra inferior permanece montada.',
        refs: ['CA-13.1'],
        kind: 'return',
      },
      {
        from: 'routes',
        to: 'tab',
        label: 'aria-current=page',
        detail: 'Sub-rotas mantêm a aba pai ativa (end só no Início).',
        refs: ['RF-13'],
        kind: 'return',
      },
    ],
    tests: ['src/app/layout/BottomNav.test.tsx', 'src/app/routes.test.tsx'],
  },
  {
    id: 'go-back',
    title: 'Voltar numa subpágina',
    summary:
      'Com entrada anterior no histórico do app volta de verdade (POP); aberta direto pela URL, vai para a tela pai com replace.',
    requirements: ['CA-13.2'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'back', label: 'BackLink', module: 'src/components/ui/BackLink.tsx' },
      { id: 'hook', label: 'useGoBack', module: 'src/components/ui/useGoBack.ts' },
      { id: 'router', label: 'React Router' },
    ],
    steps: [
      {
        from: 'user',
        to: 'back',
        label: 'toca em Voltar',
        detail: 'Botão com aria-label "Voltar" e alvo de 44 px.',
        refs: ['RNF-06'],
        kind: 'event',
      },
      {
        from: 'back',
        to: 'hook',
        label: 'goBack()',
        detail: 'fallbackTo = tela pai (ex.: /ajustes).',
        refs: ['CA-13.2'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'router',
        label: "location.key ≠ 'default'",
        detail: 'Há tela anterior dentro do app → navigate(-1) (POP).',
        refs: ['CA-13.2'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'router',
        label: 'senão: replace na tela pai',
        detail:
          'navigate(fallbackTo, { replace: true }) — o voltar do navegador não retorna à subpágina.',
        refs: ['CA-13.2'],
        kind: 'call',
      },
    ],
    tests: ['src/components/ui/BackLink.test.tsx', 'src/app/routes.test.tsx'],
  },
  {
    id: 'unknown-path',
    title: 'Caminho desconhecido',
    summary: 'A rota * redireciona para o Início com replace (D-21).',
    requirements: ['D-21'],
    participants: [
      { id: 'browser', label: 'Navegador' },
      { id: 'routes', label: 'routes.tsx', module: 'src/app/routes.tsx' },
      { id: 'home', label: 'HomePage', module: 'src/features/home/HomePage.tsx' },
    ],
    steps: [
      {
        from: 'browser',
        to: 'routes',
        label: 'abre /qualquer-coisa',
        detail: 'O Cloudflare Pages serve o index.html para qualquer caminho (§6.10).',
        refs: ['D-21'],
        kind: 'event',
      },
      {
        from: 'routes',
        to: 'home',
        label: '<Navigate to="/" replace>',
        detail: 'Evita a tela de erro padrão do React Router (em inglês).',
        refs: ['D-21'],
        kind: 'call',
      },
    ],
    tests: ['src/app/routes.test.tsx'],
  },
  {
    id: 'dev-page',
    title: 'Abrir esta página (somente DEV)',
    summary:
      'getDevRoutes() só devolve a rota em DEV; em produção o guard vira código morto e o import dinâmico some do build.',
    requirements: ['D-17'],
    participants: [
      { id: 'dev', label: 'Desenvolvedor' },
      { id: 'routes', label: 'routes.tsx', module: 'src/app/routes.tsx' },
      { id: 'devRoutes', label: 'devRoutes.tsx', module: 'src/app/devRoutes.tsx' },
      {
        id: 'page',
        label: 'ArchitecturePage',
        module: 'src/dev/architecture/ArchitecturePage.tsx',
      },
      { id: 'css', label: 'architecture.css', module: 'src/dev/architecture/architecture.css' },
      { id: 'model', label: 'model.ts', module: 'src/dev/architecture/model.ts' },
    ],
    steps: [
      {
        from: 'dev',
        to: 'routes',
        label: 'abre /__dev/arquitetura',
        detail: 'Sem link na interface; digitar a URL com npm run dev.',
        refs: ['D-17'],
        kind: 'event',
      },
      {
        from: 'routes',
        to: 'devRoutes',
        label: 'getDevRoutes()',
        detail: 'Em produção import.meta.env.DEV = false → devolve [] e o * redireciona.',
        refs: ['D-17'],
        kind: 'call',
      },
      {
        from: 'devRoutes',
        to: 'page',
        label: 'React.lazy(import())',
        detail: 'Declarado dentro da função, depois do guard.',
        refs: ['D-17'],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'css',
        label: "import './architecture.css'",
        detail:
          "CSS próprio da página: @import 'tailwindcss' source(none) + @source './' (varre só src/dev/architecture) + src/styles/utilities.css. O CSS do app tem @source not './dev', então nenhuma classe desta página entra no CSS de produção.",
        refs: ['D-17'],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'model',
        label: 'grafo + curadoria',
        detail:
          'module-graph.json (gerado) + curated.ts + timeline.ts → índices em layers/composition/traceability/health/search.',
        refs: [],
        kind: 'call',
      },
    ],
    tests: ['src/dev/architecture/architecture.test.ts'],
  },
  {
    id: 'pwa-update',
    title: 'Registro do service worker e ciclo de atualização',
    summary:
      'main.tsx registra o SW pelo registerPwa; com registerType "prompt", uma versão nova só liga updateAvailable no Zustand. O aviso aparece acima da barra, o conteúdo reserva o espaço dele, e a troca só acontece quando o usuário toca "Atualizar".',
    requirements: ['RF-11', 'CA-11.2', 'CA-11.3', 'D-24'],
    participants: [
      { id: 'main', label: 'main.tsx', module: 'src/main.tsx' },
      { id: 'register', label: 'registerPwa', module: 'src/app/pwa/registerPwa.ts' },
      { id: 'plugin', label: 'registerSW (plugin)' },
      { id: 'sw', label: 'Service worker' },
      { id: 'store', label: 'uiStore', module: 'src/stores/uiStore.ts' },
      { id: 'hook', label: 'usePwaUpdate', module: 'src/app/pwa/usePwaUpdate.ts' },
      { id: 'layout', label: 'AppLayout', module: 'src/app/layout/AppLayout.tsx' },
      { id: 'notice', label: 'UpdateNotice', module: 'src/app/pwa/UpdateNotice.tsx' },
      { id: 'user', label: 'Usuário' },
    ],
    steps: [
      {
        from: 'main',
        to: 'register',
        label: 'registerPwa(registerSW)',
        detail:
          'Antes do createRoot. registerSW vem de virtual:pwa-register e é injetado para poder ser testado; no npm run dev o plugin entrega um registro vazio. Devolve a limpeza (AbortController).',
        refs: ['RF-11'],
        kind: 'call',
      },
      {
        from: 'register',
        to: 'plugin',
        label: 'registerSW({ immediate, … })',
        detail:
          'immediate: true, onNeedRefresh e onRegisteredSW. injectRegister: false em PWA_OPTIONS: o registro é do app, não um script injetado no HTML.',
        refs: ['RF-11'],
        kind: 'call',
      },
      {
        from: 'plugin',
        to: 'sw',
        label: "register('/sw.js')",
        detail:
          'O SW (Workbox, gerado no build) faz o precache de todo o dist/ (globPatterns) — base do funcionamento offline.',
        refs: ['CA-11.2'],
        kind: 'call',
      },
      {
        from: 'plugin',
        to: 'register',
        label: 'onRegisteredSW(registration)',
        detail:
          'Liga o listener de visibilitychange com { signal } do AbortController (ver o fluxo D-24). Se a limpeza já tiver rodado, não liga nada.',
        refs: ['D-24'],
        kind: 'return',
      },
      {
        from: 'sw',
        to: 'plugin',
        label: 'versão nova em espera',
        detail:
          'registerType: "prompt": o SW novo fica em waiting; nada recarrega sozinho enquanto o usuário usa.',
        refs: ['CA-11.3'],
        kind: 'event',
      },
      {
        from: 'plugin',
        to: 'register',
        label: 'onNeedRefresh()',
        detail: 'Único efeito: ligar o aviso. updateSW ainda não é chamado.',
        refs: ['CA-11.3'],
        kind: 'event',
      },
      {
        from: 'register',
        to: 'store',
        label: 'setUpdateAvailable(true)',
        detail: 'useUiStore.getState() fora do React (registerPwa não é componente).',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'store',
        to: 'hook',
        label: 'updateAvailable',
        detail: 'Seletor (state) => state.updateAvailable: só re-renderiza quando esse campo muda.',
        refs: [],
        kind: 'return',
      },
      {
        from: 'hook',
        to: 'layout',
        label: 'reserve-update-notice',
        detail:
          'Com isUpdateAvailable, o <main> ganha reserve-update-notice: --update-notice-space = --update-notice-height, somado por pb-below-nav; o fim do conteúdo não fica atrás do aviso (§2.10).',
        refs: ['CA-11.3'],
        kind: 'return',
      },
      {
        from: 'hook',
        to: 'notice',
        label: '"Nova versão disponível"',
        detail:
          'Notice accent dentro da região viva sempre montada (role="status", aria-live="polite"), fixa com bottom-above-nav e altura h-(--update-notice-height).',
        refs: ['CA-11.3', 'RNF-06'],
        kind: 'return',
      },
      {
        from: 'user',
        to: 'notice',
        label: 'toca "Atualizar"',
        detail: 'Notice.Action: alvo ≥ 44 px, foco visível branco sobre o azul nos dois temas.',
        refs: ['CA-11.3', 'RNF-06'],
        kind: 'event',
      },
      {
        from: 'notice',
        to: 'register',
        label: 'applyPwaUpdate()',
        detail: 'Via applyUpdate de usePwaUpdate.',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'register',
        to: 'plugin',
        label: 'updateSW(true)',
        detail: 'Função devolvida pelo registerSW, guardada no registro.',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'plugin',
        to: 'sw',
        label: 'SKIP_WAITING',
        detail: 'postMessage para o SW em espera assumir o controle.',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'sw',
        to: 'plugin',
        label: 'controllerchange → reload',
        detail: 'O plugin recarrega a página já com a versão nova; o aviso some (estado novo).',
        refs: ['CA-11.3'],
        kind: 'return',
      },
    ],
    tests: [
      'src/app/pwa/registerPwa.test.ts',
      'src/app/pwa/UpdateNotice.test.tsx',
      'src/app/layout/AppLayout.test.tsx',
      'src/stores/uiStore.test.ts',
      'src/app/pwa/pwaOptions.test.ts',
    ],
  },
  {
    id: 'pwa-visibility-check',
    title: 'Procura de versão nova ao voltar a ficar visível (D-24)',
    summary:
      'O app instalado no iPhone volta do segundo plano sem navegar, e o navegador só procura versões novas ao navegar. O registerPwa pede ao SW que procure ao ficar visível e online, ignorando falhas.',
    requirements: ['CA-11.3', 'CA-12.3', 'D-24'],
    participants: [
      { id: 'doc', label: 'document / navigator' },
      { id: 'register', label: 'registerPwa', module: 'src/app/pwa/registerPwa.ts' },
      { id: 'registration', label: 'SW registration' },
      { id: 'network', label: 'Rede / Access' },
    ],
    steps: [
      {
        from: 'doc',
        to: 'register',
        label: 'visibilitychange',
        detail: 'Listener registrado com { signal }: a limpeza (abort) remove-o.',
        refs: ['D-24'],
        kind: 'event',
      },
      {
        from: 'register',
        to: 'doc',
        label: 'visible && onLine?',
        detail: 'Indo para o segundo plano ou sem internet: não faz nada.',
        refs: ['D-24'],
        kind: 'call',
      },
      {
        from: 'register',
        to: 'registration',
        label: 'registration.update()',
        detail: 'Pede ao navegador que baixe o sw.js de novo.',
        refs: ['D-24'],
        kind: 'call',
      },
      {
        from: 'registration',
        to: 'network',
        label: 'GET /sw.js',
        detail:
          'Com a sessão do Access válida, chega ao Cloudflare Pages; se o sw.js mudou, segue o ciclo de atualização (onNeedRefresh).',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'network',
        to: 'register',
        label: 'falha → .catch(() => undefined)',
        detail:
          'Sem rede ou sessão do Access expirada (redirect para o login): falha esperada, tenta de novo na próxima vez que o app ficar visível.',
        refs: ['CA-12.3', 'D-24'],
        kind: 'return',
      },
    ],
    tests: ['src/app/pwa/registerPwa.test.ts'],
  },
  {
    id: 'pwa-install-hint',
    title: 'Detecção do modo instalado',
    summary:
      'Em toda tela do layout, InstallHint mostra um aviso discreto quando o app está numa aba comum do navegador; aberto pelo ícone, não mostra nada.',
    requirements: ['CA-11.6', 'D-23'],
    participants: [
      { id: 'layout', label: 'AppLayout', module: 'src/app/layout/AppLayout.tsx' },
      { id: 'hint', label: 'InstallHint', module: 'src/app/pwa/InstallHint.tsx' },
      { id: 'hook', label: 'useIsStandalone', module: 'src/app/pwa/useIsStandalone.ts' },
      { id: 'browser', label: 'Navegador' },
      { id: 'lib', label: 'lib/displayMode', module: 'src/lib/displayMode.ts' },
      { id: 'notice', label: 'Notice', module: 'src/components/ui/Notice.tsx' },
    ],
    steps: [
      {
        from: 'layout',
        to: 'hint',
        label: '<InstallHint /> no topo',
        detail:
          'No layout e não só no Início, porque o app pode ser aberto por qualquer URL (D-23).',
        refs: ['D-23'],
        kind: 'call',
      },
      {
        from: 'hint',
        to: 'hook',
        label: 'useIsStandalone()',
        detail: 'useState com inicializador: lido uma vez (o modo não muda durante a sessão).',
        refs: ['CA-11.6'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'browser',
        label: 'matchMedia + navigator.standalone',
        detail:
          "matchMedia('(display-mode: standalone)').matches (Chrome, Edge, iOS atual) e navigator.standalone (só Safari no iOS).",
        refs: ['CA-11.6'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'lib',
        label: 'isStandaloneDisplay(signals)',
        detail: 'Função pura, sem DOM: quem chama lê o navegador e passa os valores.',
        refs: ['CA-11.6'],
        kind: 'call',
      },
      {
        from: 'lib',
        to: 'hook',
        label: 'boolean',
        detail: 'matchesStandaloneMedia || navigatorStandalone === true.',
        refs: [],
        kind: 'return',
      },
      {
        from: 'hint',
        to: 'notice',
        label: 'Notice subtle (ou null)',
        detail:
          'Fora do modo instalado: faixa só de texto, sem botão de fechar; instalado: não renderiza nada.',
        refs: ['CA-11.6', 'D-23'],
        kind: 'call',
      },
    ],
    tests: ['src/app/pwa/InstallHint.test.tsx', 'src/lib/displayMode.test.ts'],
  },
  {
    id: 'pwa-offline-access',
    title: 'Navegação offline e Cloudflare Access',
    summary:
      'O SW responde às navegações com o index.html do precache (o app abre offline em qualquer rota), exceto /cdn-cgi/, que vai à rede para o login do Access funcionar. O manifest é pedido com o cookie da sessão.',
    requirements: ['CA-11.2', 'CA-12.1', 'CA-12.3', 'RNF-03'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'browser', label: 'Navegador' },
      { id: 'sw', label: 'Service worker' },
      { id: 'html', label: 'index.html', module: 'index.html' },
      { id: 'options', label: 'PWA_OPTIONS', module: 'src/app/pwa/pwaOptions.ts' },
      { id: 'access', label: 'Cloudflare Access' },
    ],
    steps: [
      {
        from: 'user',
        to: 'browser',
        label: 'abre o app pelo ícone',
        detail: 'start_url "/" ou qualquer rota, com ou sem internet.',
        refs: ['CA-11.1', 'CA-11.2'],
        kind: 'event',
      },
      {
        from: 'browser',
        to: 'sw',
        label: 'navegação (mode: navigate)',
        detail: 'O SW controla todo o scope "/".',
        refs: ['CA-11.2'],
        kind: 'call',
      },
      {
        from: 'sw',
        to: 'options',
        label: 'NavigationRoute',
        detail:
          'Regra gerada no build a partir de navigateFallback: "index.html" e navigateFallbackDenylist: [/^\\/cdn-cgi\\//].',
        refs: ['CA-11.2', 'CA-12.3'],
        kind: 'call',
      },
      {
        from: 'sw',
        to: 'html',
        label: 'index.html do precache',
        detail:
          'Sem ir à rede: o app abre offline em qualquer rota e o React Router resolve a tela (RNF-03).',
        refs: ['CA-11.2', 'RNF-03'],
        kind: 'return',
      },
      {
        from: 'browser',
        to: 'access',
        label: '/cdn-cgi/access/… pela rede',
        detail:
          'A denylist tira /cdn-cgi/ do SW: login e callback do Access sempre chegam ao Cloudflare.',
        refs: ['CA-12.3'],
        kind: 'call',
      },
      {
        from: 'html',
        to: 'access',
        label: 'manifest com credenciais',
        detail:
          '<link rel="manifest" crossorigin="use-credentials"> injetado pelo plugin (useCredentials: true): o manifest só é entregue com o cookie da sessão.',
        refs: ['CA-12.1', 'CA-11.1'],
        kind: 'call',
      },
      {
        from: 'access',
        to: 'browser',
        label: 'risco: sessão expirada',
        detail:
          'Aberto pelo cache, o app não passa pelo Access e não força o relogin; só a procura de versão nova falha (ignorada). Confirmar no roteiro do iPhone (CA-12.3).',
        refs: ['CA-12.3'],
        kind: 'return',
      },
    ],
    tests: ['src/app/pwa/pwaOptions.test.ts', 'src/app/pwa/indexHtmlPwaTags.test.ts'],
  },
]

/** Fluxos exigidos pela §6.12 que ainda não existem no código. */
export const PLANNED_FLOWS: readonly PlannedFlow[] = [
  {
    title: 'persist() e estimate()',
    phase: 2,
    requirements: ['CA-11.4', 'CA-11.5'],
    summary: 'lib/storage.ts na primeira abertura; settings.persistRequested; tela Sobre.',
  },
  {
    title: 'Criar/editar/excluir tag (com bloqueio)',
    phase: 3,
    requirements: ['RF-03', 'D-02'],
    summary: 'Formulário → repositório de tags (nameKey único) → bloqueio se houver uso.',
  },
  {
    title: 'Lançar transação',
    phase: 4,
    requirements: ['RF-01'],
    summary:
      'MoneyInput (centavos) → validação zod → repositório → useLiveQuery atualiza o Início.',
  },
  {
    title: 'Editar/excluir lançamento',
    phase: 4,
    requirements: ['RF-01'],
    summary: 'Detalhe → repositório → confirmação de exclusão.',
  },
  {
    title: 'Filtrar lista',
    phase: 5,
    requirements: ['RF-04'],
    summary: 'transactionFilters no Zustand → consulta por índice → lista paginada.',
  },
  {
    title: 'Exportar e importar backup (criptografia)',
    phase: 6,
    requirements: ['RF-10', 'RNF-05'],
    summary: 'Leitura em transação → PBKDF2/AES-GCM → Web Share/download; importação atômica.',
  },
  {
    title: 'Navegar nas visões',
    phase: 7,
    requirements: ['RF-05'],
    summary: 'viewGranularity/viewAnchorDate no Zustand → períodos de domain/dates.',
  },
  {
    title: 'Seleção nos gráficos',
    phase: 8,
    requirements: ['RF-06', 'D-16'],
    summary: 'Toque na coluna/fatia → painel fixo de detalhes (sem tooltip).',
  },
  {
    title: 'Confirmar/pular recorrente e alterar valor',
    phase: 9,
    requirements: ['RF-07', 'D-14', 'D-15'],
    summary: 'pendingOccurrences → modal de confirmação → lançamento vinculado.',
  },
  {
    title: 'Criar/excluir parcelamento',
    phase: 10,
    requirements: ['RF-08', 'D-06'],
    summary: 'splitInstallments → lançamentos gerados numa transação Dexie.',
  },
]

// ---------- modelo de dados, estado e domínio previstos ----------

export const PLANNED_SCHEMA_VERSION = 1

export const PLANNED_TABLES: readonly PlannedTable[] = [
  { name: 'tags', indexes: 'id, &nameKey', type: 'Tag', inBackup: 'sim', phase: 2 },
  {
    name: 'transactions',
    indexes:
      'id, date, type, tagId, recurringId, [recurringId+recurringPeriod], installmentGroupId',
    type: 'Transaction',
    inBackup: 'sim',
    phase: 2,
  },
  { name: 'recurrings', indexes: 'id', type: 'Recurring', inBackup: 'sim', phase: 2 },
  { name: 'installmentGroups', indexes: 'id', type: 'InstallmentGroup', inBackup: 'sim', phase: 2 },
  {
    name: 'settings',
    indexes: 'key',
    type: 'Setting',
    inBackup: 'só a chave theme (lastBackupAt e persistRequested são locais)',
    phase: 2,
  },
]

export const PLANNED_UI_FIELDS: readonly PlannedUiField[] = [
  { name: 'updateAvailable', type: 'boolean', actions: ['setUpdateAvailable'], phase: 1 },
  {
    name: 'transactionFilters',
    type: '{ text, type, tagId, from, to }',
    actions: ['setFilters', 'clearFilters'],
    phase: 5,
  },
  {
    name: 'viewGranularity',
    type: "'day' | 'week' | 'month' | 'year'",
    actions: ['setGranularity'],
    phase: 7,
  },
  {
    name: 'viewAnchorDate',
    type: 'DateString',
    actions: ['goPrev', 'goNext', 'goToday'],
    phase: 7,
  },
]

export const PLANNED_DOMAIN: readonly PlannedDomainFunction[] = [
  { module: 'domain/money.ts', names: ['formatBRL', 'formatSignedBRL', 'digitsToCents'], phase: 2 },
  {
    module: 'domain/dates.ts',
    names: [
      'today',
      'periodOf',
      'weekRange',
      'monthRange',
      'yearRange',
      'addMonthsClamped',
      'periodsBetween',
    ],
    phase: 2,
  },
  {
    module: 'domain/balances.ts',
    names: [
      'totals',
      'overallBalance',
      'groupByDay',
      'groupByMonth',
      'groupByTag',
      'runningBalance',
    ],
    phase: 2,
  },
  { module: 'domain/tagColor.ts', names: ['readableTextColor'], phase: 2 },
  { module: 'lib/storage.ts', names: ['persist', 'estimate'], phase: 2 },
  { module: 'lib/crypto.ts + lib/backupFormat.ts + lib/share.ts', names: ['(backup)'], phase: 6 },
  {
    module: 'domain/recurring.ts',
    names: ['amountFor', 'isActiveIn', 'pendingOccurrences', 'setAmountFrom', 'projected'],
    phase: 9,
  },
  {
    module: 'domain/installments.ts',
    names: ['splitInstallments', 'buildInstallmentTransactions'],
    phase: 10,
  },
]

// ---------- rastreabilidade ----------

export const REQUIREMENTS: readonly RequirementInfo[] = [
  { id: 'RF-01', title: 'Lançamentos (criar, editar, excluir)', phases: [4] },
  { id: 'RF-02', title: 'Tela inicial', phases: [4, 9] },
  { id: 'RF-03', title: 'Tags', phases: [3, 4] },
  { id: 'RF-04', title: 'Lista, busca e filtros', phases: [5] },
  { id: 'RF-05', title: 'Visões por período', phases: [7, 9] },
  { id: 'RF-06', title: 'Gráficos', phases: [8] },
  { id: 'RF-07', title: 'Recorrentes', phases: [9] },
  { id: 'RF-08', title: 'Compras parceladas', phases: [10] },
  { id: 'RF-09', title: 'Tema claro e escuro', phases: [0, 2] },
  { id: 'RF-10', title: 'Backup criptografado', phases: [6, 9, 10] },
  { id: 'RF-11', title: 'PWA, instalação e offline', phases: [1, 2] },
  { id: 'RF-12', title: 'Acesso restrito', phases: [1] },
  { id: 'RF-13', title: 'Navegação e Ajustes', phases: [0] },
  { id: 'RNF-01', title: 'Plataforma (iPhone/Safari)', phases: [1] },
  { id: 'RNF-02', title: 'Desempenho', phases: [0, 11] },
  { id: 'RNF-03', title: 'Offline', phases: [1] },
  { id: 'RNF-04', title: 'Privacidade', phases: [11] },
  { id: 'RNF-05', title: 'Segurança do backup', phases: [6] },
  { id: 'RNF-06', title: 'Acessibilidade', phases: [0, 11] },
  { id: 'RNF-07', title: 'Qualidade (strict, lint, cobertura)', phases: [0] },
  { id: 'RNF-08', title: 'Custo zero', phases: [1] },
  { id: 'RNF-09', title: 'Contexto seguro (HTTPS)', phases: [1] },
]

export const DECISIONS: readonly DecisionInfo[] = [
  { id: 'D-01', title: 'Exatamente uma tag por lançamento', status: 'confirmed', impacts: [] },
  { id: 'D-02', title: 'Tag em uso não pode ser excluída', status: 'confirmed', impacts: [] },
  { id: 'D-03', title: 'Saldo geral só com data ≤ hoje', status: 'confirmed', impacts: [] },
  { id: 'D-04', title: 'Recorrentes mensais, sem dia fixo', status: 'confirmed', impacts: [] },
  { id: 'D-05', title: 'Pendências só no Previsto', status: 'confirmed', impacts: [] },
  { id: 'D-06', title: 'Parcelamento só para saídas', status: 'confirmed', impacts: [] },
  { id: 'D-07', title: 'Importação substitui tudo', status: 'confirmed', impacts: [] },
  { id: 'D-08', title: 'Criptografia só no arquivo de backup', status: 'confirmed', impacts: [] },
  {
    id: 'D-09',
    title: 'Nome provisório "Meus Gastos"',
    status: 'confirmed',
    impacts: ['index.html', 'src/app/pwa/pwaOptions.ts'],
  },
  { id: 'D-10', title: 'Descrição obrigatória (1–100)', status: 'confirmed', impacts: [] },
  { id: 'D-11', title: 'Lembrete de backup após 7 dias', status: 'confirmed', impacts: [] },
  { id: 'D-12', title: 'Gráficos com Chart.js', status: 'confirmed', impacts: [] },
  {
    id: 'D-13',
    title: 'Cloudflare Pages + Access',
    status: 'confirmed',
    impacts: ['README.md', 'src/app/pwa/pwaOptions.ts', 'src/app/pwa/registerPwa.ts'],
  },
  { id: 'D-14', title: 'Data padrão ao confirmar recorrente', status: 'confirmed', impacts: [] },
  { id: 'D-15', title: 'Recorrente com histórico é encerrado', status: 'confirmed', impacts: [] },
  { id: 'D-16', title: 'Gráficos sem tooltip flutuante', status: 'confirmed', impacts: [] },
  {
    id: 'D-17',
    title: 'Página de arquitetura e timeline só em DEV',
    status: 'confirmed',
    impacts: ['src/app/devRoutes.tsx', 'src/dev/architecture/ArchitecturePage.tsx'],
  },
  { id: 'D-18', title: 'Pacotes pré-autorizados', status: 'confirmed', impacts: ['package.json'] },
  {
    id: 'D-19',
    title: 'oxlint + Prettier',
    status: 'confirmed',
    impacts: ['.oxlintrc.json', '.prettierrc.json', '.prettierignore', 'package.json'],
  },
  {
    id: 'D-20',
    title: 'Pacote react-router; versões fixas',
    status: 'confirmed',
    impacts: ['package.json', 'src/app/App.tsx', 'src/app/routes.tsx'],
  },
  {
    id: 'D-21',
    title: 'Rota * redireciona para o Início',
    status: 'confirmed',
    impacts: ['src/app/routes.tsx'],
  },
  {
    id: 'D-22',
    title: 'Features não importam de src/app/ (tema vai para repositories na Fase 2)',
    status: 'confirmed',
    impacts: [
      'src/features/settings/ThemeSection.tsx',
      'src/app/theme/useTheme.ts',
      'src/app/theme/ThemeContext.ts',
    ],
  },
  {
    id: 'D-23',
    title: 'Aviso fora do modo instalado no layout, só texto, sem fechar',
    status: 'pending',
    impacts: [
      'src/app/layout/AppLayout.tsx',
      'src/app/pwa/InstallHint.tsx',
      'src/app/pwa/useIsStandalone.ts',
      'src/lib/displayMode.ts',
    ],
  },
  {
    id: 'D-24',
    title: 'Procurar versão nova ao ficar visível e online (registration.update())',
    status: 'pending',
    impacts: ['src/app/pwa/registerPwa.ts'],
  },
  {
    id: 'D-25',
    title: 'Ícones provisórios gerados com módulos nativos; favicon.svg removido',
    status: 'pending',
    impacts: [
      'scripts/generate-icons.mjs',
      'public/pwa-192x192.png',
      'public/pwa-512x512.png',
      'public/pwa-maskable-512x512.png',
      'public/apple-touch-icon.png',
      'public/favicon.png',
      'index.html',
    ],
  },
]

// ---------- dependências externas ----------

/** Origem da autorização de cada pacote do package.json. */
export const PACKAGE_SOURCES: Readonly<Record<string, PackageSource>> = {
  react: '§6.1',
  'react-dom': '§6.1',
  'react-router': 'D-20',
  vite: '§6.1',
  typescript: '§6.1',
  tailwindcss: '§6.1',
  '@tailwindcss/vite': 'D-18',
  vitest: '§6.1',
  '@testing-library/react': '§6.1',
  'fake-indexeddb': '§6.1',
  jsdom: 'D-18',
  '@vitest/coverage-v8': 'D-18',
  oxlint: 'D-19',
  prettier: 'D-19',
  '@vitejs/plugin-react': 'template Vite',
  '@rolldown/plugin-babel': 'template Vite',
  '@babel/core': 'template Vite',
  'babel-plugin-react-compiler': 'template Vite',
  '@types/babel__core': 'template Vite',
  '@types/node': 'template Vite',
  '@types/react': 'template Vite',
  '@types/react-dom': 'template Vite',
  dexie: '§6.1',
  'dexie-react-hooks': '§6.1',
  zustand: '§6.1',
  'react-hook-form': '§6.1',
  '@hookform/resolvers': '§6.1',
  zod: '§6.1',
  'date-fns': '§6.1',
  'chart.js': '§6.1',
  'react-chartjs-2': '§6.1',
  'vite-plugin-pwa': '§6.1',
  'react-router-dom': 'D-18',
}

// ---------- achados de arquitetura (reportados, não corrigidos) ----------

export const ARCHITECTURE_FINDINGS: readonly ArchitectureFinding[] = [
  {
    title: 'Risco do CA-12.3: sessão do Access expirada não força o relogin',
    severity: 'warn',
    detail:
      'O SW serve o index.html do precache para toda navegação (exceto /cdn-cgi/), então, com a sessão do Access expirada, o app aberto pelo ícone não passa pelo Cloudflare e não pede login. A procura de versão nova (registration.update()) falha em silêncio (D-24) e o app deixa de receber atualizações até o usuário fazer login por outro caminho. Só se confirma no roteiro do iPhone, depois do deploy.',
    modules: ['src/app/pwa/pwaOptions.ts', 'src/app/pwa/registerPwa.ts'],
  },
  {
    title: 'Pendência humana da Fase 1: Cloudflare Pages + Access',
    severity: 'info',
    detail:
      'Única tarefa desmarcada da Fase 1: criar o projeto no Cloudflare Pages, publicar e configurar o Access (passo a passo no README.md, §6.10). Até lá, CA-12.1, CA-12.2 e CA-12.3 não podem ser verificados.',
    modules: ['README.md'],
  },
  {
    title: 'D-23, D-24 e D-25 aguardam confirmação do dono',
    severity: 'warn',
    detail:
      'Registradas na §8.1 em 18/10/2026 durante a Fase 1 (posição do aviso de instalação, procura de versão ao ficar visível, ícones provisórios e remoção do favicon.svg), ainda sem "Confirmado pelo dono".',
    modules: [
      'docs/SPEC.md',
      'src/app/pwa/InstallHint.tsx',
      'src/app/pwa/registerPwa.ts',
      'scripts/generate-icons.mjs',
    ],
  },
  {
    title: 'Versão da spec não foi incrementada com D-23 a D-25',
    severity: 'warn',
    detail:
      'docs/SPEC.md ganhou D-23, D-24 e D-25 e as tarefas da Fase 1 foram marcadas, mas o cabeçalho continua em "1.4 — 17/10/2026".',
    modules: ['docs/SPEC.md'],
  },
  {
    title: 'src/stores/.gitkeep continua versionado',
    severity: 'info',
    detail:
      'A pasta deixou de estar vazia com o uiStore.ts (Fase 1); o .gitkeep da Fase 0 pode sair num commit futuro.',
    modules: ['src/stores/uiStore.ts'],
  },
  {
    title: 'pwaOptions.ts roda em dois contextos (Vite/Node e Vitest)',
    severity: 'info',
    detail:
      'É importado pelo vite.config.ts (verificado pelo tsconfig.node.json, sem o alias @/) e pelo teste. Por isso usa import relativo com extensão (../../lib/theme.ts) e só pode depender de módulos puros; um import @/ ou de React quebraria o build. A exceção config → app na regra de camadas cobre só este arquivo.',
    modules: [
      'src/app/pwa/pwaOptions.ts',
      'vite.config.ts',
      'tsconfig.node.json',
      'src/lib/theme.ts',
    ],
  },
  {
    title: 'registerPwa guarda estado no nível do módulo',
    severity: 'info',
    detail:
      'activateWaitingVersion é uma variável do módulo (no-op até o registro). Funciona porque há um único registro por carga da página; um segundo registerPwa sobrescreveria a função. Os testes cobrem a limpeza dos listeners, não o estado global.',
    modules: ['src/app/pwa/registerPwa.ts', 'src/app/pwa/usePwaUpdate.ts'],
  },
  {
    title: 'Dívida conhecida: feature importa de app/ (ThemeSection → useTheme)',
    severity: 'warn',
    detail:
      'D-22 proíbe features → app. Única ocorrência tolerada até a Fase 2: src/features/settings/ThemeSection.tsx importa src/app/theme/useTheme.ts. Na Fase 2 (tarefa da §7) useTheme/ThemeContext vão para src/repositories/ junto com a leitura do tema na tabela settings; aí esta regra deixa de ter exceção e qualquer import features → app vira vermelho.',
    modules: [
      'src/features/settings/ThemeSection.tsx',
      'src/app/theme/useTheme.ts',
      'src/app/theme/ThemeContext.ts',
    ],
  },
  {
    title: 'Tema ainda em localStorage',
    severity: 'info',
    detail:
      'Persistência temporária prevista pela Fase 0; a §6.7 manda o tema para a tabela settings na Fase 2, mantendo localStorage só como espelho para o script inline.',
    modules: ['src/lib/themeStorage.ts', 'index.html'],
  },
  {
    title: 'Classes Tailwind desta página entravam no CSS de produção',
    severity: 'warn',
    detail:
      'O Tailwind v4 varria o projeto inteiro e gerava as utilidades usadas em src/dev: o CSS do build ia de ~12 kB para ~40 kB, embora nenhum JS da página fosse para o dist/.',
    modules: [
      'src/index.css',
      'src/styles/utilities.css',
      'src/dev/architecture/architecture.css',
      'src/dev/architecture/ArchitecturePage.tsx',
    ],
    resolved:
      "Resolvido em 17/10/2026 (não commitado): src/index.css tem @source not './dev'; a página importa o próprio src/dev/architecture/architecture.css (source(none) + @source './'); variante dark e utilitários de safe area foram para src/styles/utilities.css, importado pelos dois. CSS de produção: 39,7 kB → 12,2 kB.",
  },
  {
    title: 'D-21 aguardava confirmação do dono',
    severity: 'warn',
    detail: 'A rota * redireciona para o Início em vez de mostrar uma tela "não encontrado".',
    modules: ['src/app/routes.tsx', 'src/app/routes.test.tsx'],
    resolved: 'Confirmada pelo dono em 17/10/2026 (§8.1).',
  },
  {
    title: 'Versão da spec não tinha sido incrementada',
    severity: 'warn',
    detail:
      'docs/SPEC.md ganhou D-19, D-20 e D-21 (e mudanças na §6.1/RNF-07), mas o cabeçalho continuava em 1.3.',
    modules: ['docs/SPEC.md'],
    resolved: 'Cabeçalho atualizado para 1.4 (D-19 a D-22) em 17/10/2026.',
  },
]

// ---------- notas por módulo ----------

export const MODULE_NOTES: Readonly<Record<string, string>> = {
  'index.html':
    'Script inline (único) que aplica tema e theme-color antes do bundle (CA-09.3). Duplica regras de src/lib/theme.ts; a sincronia é garantida por indexHtmlThemeScript.test.ts. Fase 1: favicon.png, apple-touch-icon e metatags do iOS (capable, status-bar-style, title "Gastos" — D-25); o <link rel="manifest" crossorigin="use-credentials"> NÃO fica aqui: é injetado no build pelo plugin (indexHtmlPwaTags.test.ts impede a duplicata).',
  'vite.config.ts':
    'Plugins: React + React Compiler (via Babel) + Tailwind + VitePWA(PWA_OPTIONS) (importado de src/app/pwa/pwaOptions.ts por caminho relativo). Alias @/ → src/. Vitest no mesmo arquivo (jsdom, setup, cobertura ≥ 90% em domain/lib).',
  'tsconfig.node.json':
    'Inclui vite.config.ts e src/app/pwa/pwaOptions.ts (Fase 1), com allowImportingTsExtensions para o import relativo com .ts.',
  'tsconfig.app.json':
    'types: vite/client e vite-plugin-pwa/vanillajs (tipos do módulo virtual:pwa-register — Fase 1).',
  'scripts/generate-icons.mjs':
    'Gera os 5 PNGs provisórios de public/ montando o PNG à mão com zlib (só módulos nativos do Node — D-25). Símbolo de três barras sobre o azul blue-600; o maskable usa escala menor para caber na área segura de 80%. Rodar à mão: node scripts/generate-icons.mjs (não faz parte do build).',
  'src/main.tsx':
    'Entrada do bundle: registerPwa(registerSW) (Fase 1) antes do createRoot, depois StrictMode + App + CSS global (src/index.css, que exclui src/dev da varredura do Tailwind).',
  'src/app/layout/AppLayout.tsx':
    'Compõe InstallHint (topo do <main>), Outlet, UpdateNotice e BottomNav. Usa usePwaUpdate só para decidir a classe reserve-update-notice do <main>.',
  'src/app/pwa/registerPwa.ts':
    'Recebe o registerSW por parâmetro (testável sem o módulo virtual). onNeedRefresh → setUpdateAvailable(true); applyPwaUpdate → updateSW(true). Listener de visibilitychange (D-24) atrelado a um AbortController; a função devolvida faz a limpeza, inclusive se o registro terminar depois dela.',
  'src/app/pwa/pwaOptions.ts':
    'PWA_OPTIONS (§6.9): registerType prompt, injectRegister false, useCredentials true, includeManifestIcons false (os ícones já entram pelo globPatterns), manifest e workbox (precache, navigateFallback, denylist /cdn-cgi/). Protegido por pwaOptions.test.ts.',
  'src/app/pwa/usePwaUpdate.ts':
    'Fachada do aviso: { isUpdateAvailable, applyUpdate }. Componentes não importam o uiStore nem o registerPwa diretamente.',
  'src/app/pwa/useIsStandalone.ts':
    'Lê matchMedia e navigator.standalone uma vez (useState com inicializador) e delega a regra a lib/displayMode.',
  'src/app/pwa/UpdateNotice.tsx':
    'Região viva sempre montada; o aviso usa a altura --update-notice-height, a mesma que o AppLayout reserva.',
  'src/app/pwa/InstallHint.tsx':
    'Texto exato do CA-11.6; posição definida pela D-23 (aguardando confirmação).',
  'src/stores/uiStore.ts':
    'Primeira store Zustand: só updateAvailable/setUpdateAvailable. INITIAL_UI_STATE é exportado para src/test/setup.ts resetar o estado entre testes. transactionFilters (Fase 5) e viewGranularity/viewAnchorDate (Fase 7) ainda não existem.',
  'src/components/ui/Notice.tsx':
    'Primitivo genérico (sem conhecimento de PWA). Sem teste próprio: coberto pelos testes de UpdateNotice e InstallHint.',
  'src/lib/displayMode.ts':
    'Regra pura do modo instalado + a constante da media query (reusada pelo dublê src/test/matchMedia.ts).',
  'src/styles/utilities.css':
    'Variante dark e utilitários de safe area, compartilhados com a página DEV. Fase 1: pb-below-nav soma var(--update-notice-space, 0px); reserve-update-notice define esse espaço; bottom-above-nav posiciona o aviso logo acima da barra.',
  'src/index.css':
    "Tailwind + utilities.css, @source not './dev'. Variáveis --bottom-nav-height e --update-notice-height (Fase 1) como fonte única das alturas.",
  'src/app/App.tsx':
    'Cria o router uma vez no nível do módulo e põe o ThemeProvider por fora do RouterProvider (o tema vale também para rotas fora do layout, como esta página).',
  'src/app/routes.tsx':
    'Árvore de rotas exportada sem o router, para os testes usarem createMemoryRouter (src/test/renderApp.tsx).',
  'src/app/lazyPages.tsx':
    'Todas as telas, exceto o Início, com React.lazy (code splitting por rota — RNF-02).',
  'src/app/devRoutes.tsx':
    'Guard import.meta.env.DEV primeiro; lazy() declarado depois dele para o import dinâmico sumir do build.',
  'src/app/layout/navItems.ts': 'Fonte única dos 5 itens da barra (ordem da spec, RF-13).',
  'src/app/theme/ThemeProvider.tsx':
    'Na Fase 2 passa a ler/gravar a tabela settings por repositório, mantendo o espelho em localStorage para o script inline.',
  'src/app/theme/useSystemPrefersDark.ts':
    'useSyncExternalStore em vez de useEffect+useState: sem render extra e sem estado duplicado.',
  'src/lib/theme.ts': 'Regras puras do tema (sem React e sem DOM) — cobertas por teste unitário.',
  'src/lib/themeStorage.ts':
    'Único ponto que toca localStorage[theme]; engole exceções do armazenamento indisponível.',
  'src/components/ui/createRadioGroup.tsx':
    'Fábrica tipada: cada chamada cria um contexto próprio, então Option só aceita valores do tipo T (verificado por @ts-expect-error no teste).',
  'src/components/ui/useGoBack.ts':
    "Usa location.key === 'default' para saber se a página foi aberta direto pela URL.",
  'src/features/settings/ThemeSection.tsx':
    'Importa src/app/theme/useTheme.ts (features → app): dívida conhecida pela D-22, eliminada na Fase 2 quando useTheme/ThemeContext forem para src/repositories/.',
  'src/test/setup.ts':
    'fake-indexeddb/auto, dublê de matchMedia e limpeza de DOM/localStorage após cada teste; desde a Fase 1 também reseta o uiStore (INITIAL_UI_STATE).',
  'src/test/matchMedia.ts':
    'Dublê de window.matchMedia: esquema escuro controlável (com evento change) e, desde a Fase 1, o modo instalado (setDisplayModeStandalone).',
  'src/dev/architecture/model.ts':
    'Importa o JSON gerado e expõe graph/moduleById e filtros comuns. Os índices derivados ficam em layers.ts, composition.ts, traceability.ts, health.ts e search.ts, todos calculados uma vez no carregamento.',
}
