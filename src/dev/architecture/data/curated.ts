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
      'index.html (script inline do tema), vite.config.ts (plugins, alias, Vitest), tsconfig, oxlint, Prettier.',
    position: { x: 130, y: 16 },
  },
  {
    id: 'entry',
    label: 'Entrada',
    folder: 'src/main.tsx',
    description: 'Monta o React no #root e importa o CSS global (Tailwind + safe areas).',
    position: { x: 390, y: 16 },
  },
  {
    id: 'app',
    label: 'App',
    folder: 'src/app',
    description:
      'App.tsx, rotas (createBrowserRouter), páginas lazy, rotas DEV, layout com barra inferior e o provider de tema (§6.2).',
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
      'Primitivos genéricos sem conhecimento de domínio (Page, TabBar, NavList, BackLink…).',
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
    description: 'Zustand só para estado de interface (§6.7). Vazio até a Fase 1.',
    position: { x: 650, y: 330 },
  },
  {
    id: 'lib',
    label: 'Lib',
    folder: 'src/lib',
    description:
      'Utilitários puros e adaptadores de APIs do navegador (tema, localStorage; cripto e backup depois).',
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
  { from: 'entry', to: 'app', status: 'allowed', reason: 'main.tsx renderiza <App />.' },
  {
    from: 'app',
    to: 'features',
    status: 'allowed',
    reason: 'As rotas montam as páginas das features.',
  },
  { from: 'app', to: 'components', status: 'allowed', reason: 'Layout usa primitivos (TabBar).' },
  {
    from: 'app',
    to: 'lib',
    status: 'allowed',
    reason: 'Provider de tema usa as regras puras do tema.',
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
    reason: 'Fase 1: aviso de nova versão do PWA (updateAvailable).',
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
    requirements: ['RF-13', 'CA-13.1'],
    description:
      'AppLayout: <main> com safe areas e espaço para a barra; Suspense sem fallback para as telas lazy; BottomNav fixa no rodapé.',
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
]

/** Componentes locais (não importados) e o módulo de onde vêm. */
export const LOCAL_COMPONENT_ORIGINS: Readonly<Record<string, string>> = {
  ThemeRadio: 'src/components/ui/createRadioGroup.tsx',
}

export const SCREEN_COMPOSITION: readonly ScreenComposition[] = [
  {
    route: '(layout)',
    stateAndData:
      'Sem estado próprio. O tema vem do ThemeProvider (acima do RouterProvider em App.tsx); a navegação, do React Router.',
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
]

/** Fluxos exigidos pela §6.12 que ainda não existem no código. */
export const PLANNED_FLOWS: readonly PlannedFlow[] = [
  {
    title: 'Ciclo de atualização do PWA / service worker',
    phase: 1,
    requirements: ['CA-11.3'],
    summary:
      'vite-plugin-pwa (prompt) → updateAvailable no Zustand → aviso "Nova versão" → Atualizar.',
  },
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
    impacts: ['index.html'],
  },
  { id: 'D-10', title: 'Descrição obrigatória (1–100)', status: 'confirmed', impacts: [] },
  { id: 'D-11', title: 'Lembrete de backup após 7 dias', status: 'confirmed', impacts: [] },
  { id: 'D-12', title: 'Gráficos com Chart.js', status: 'confirmed', impacts: [] },
  { id: 'D-13', title: 'Cloudflare Pages + Access', status: 'confirmed', impacts: [] },
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
    'Script inline (único) que aplica tema e theme-color antes do bundle (CA-09.3). Duplica regras de src/lib/theme.ts; a sincronia é garantida por indexHtmlThemeScript.test.ts. Metatags de PWA/iOS entram na Fase 1.',
  'vite.config.ts':
    'Plugins: React + React Compiler (via Babel) + Tailwind. Alias @/ → src/. Vitest no mesmo arquivo (jsdom, setup, cobertura ≥ 90% em domain/lib).',
  'src/main.tsx':
    'Entrada do bundle: StrictMode + App + CSS global (src/index.css, que exclui src/dev da varredura do Tailwind).',
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
    'fake-indexeddb/auto, dublê de matchMedia e limpeza de DOM/localStorage após cada teste.',
  'src/dev/architecture/model.ts':
    'Importa o JSON gerado e expõe graph/moduleById e filtros comuns. Os índices derivados ficam em layers.ts, composition.ts, traceability.ts, health.ts e search.ts, todos calculados uma vez no carregamento.',
}
