// Conteúdo escrito à mão pelo agente architecture-mapper (§6.12): o que o scanner não consegue
// inferir do código. Todo caminho citado aqui precisa existir no grafo gerado
// (garantido por src/dev/architecture/architecture.test.ts).

import type {
  AllowedDependency,
  ArchitectureFinding,
  CompositionNote,
  DecisionInfo,
  Flow,
  ForbiddenDependency,
  LayerInfo,
  PackageSource,
  PlannedDomainFunction,
  PlannedFlow,
  PlannedUiField,
  RequirementInfo,
  RouteNote,
  ScreenComposition,
  TableNote,
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
      'App.tsx, rotas (createBrowserRouter), páginas lazy, rotas DEV, layout com barra inferior, ThemeProvider (aplica o tema ao documento; a preferência vem de repositories — D-22/D-28), pedido de armazenamento persistente na abertura (app/storage, Fase 2) e PWA (registro do SW, avisos de atualização e de instalação — §6.2, §6.9).',
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
      'Primitivos genéricos sem conhecimento de domínio (Page, TabBar, NavList, BackLink, Notice, InfoList…).',
    position: { x: 130, y: 330 },
  },
  {
    id: 'repositories',
    label: 'Repositórios',
    folder: 'src/repositories',
    description:
      'Único acesso ao Dexie em produção (§2.7): funções e hooks com useLiveQuery. Fase 2: settings (getSetting/setSetting/useSetting), tema (themeRepository, useThemePreference, ThemeContext, useTheme — D-22/D-28), pedido único de persist() e SCHEMA_VERSION reexportado para a tela Sobre.',
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
      'Utilitários puros e adaptadores de APIs do navegador: tema e espelho em localStorage, modo instalado, storage (persist/persisted/estimate), formatBytes e APP_VERSION (Fase 2); cripto e backup na Fase 6.',
    position: { x: 130, y: 450 },
  },
  {
    id: 'db',
    label: 'Banco (Dexie)',
    folder: 'src/db',
    description:
      'Classe AppDatabase (Dexie, banco "money-control"), esquema versão 1 com as 5 tabelas da §6.4 e SCHEMA_VERSION = 1 (Fase 2). Importada só por repositories e, por exceção da D-30, pelas ferramentas DEV.',
    position: { x: 390, y: 450 },
  },
  {
    id: 'domain',
    label: 'Domínio',
    folder: 'src/domain',
    description:
      'Funções puras e tipos, sem React e sem Dexie (§2.6). Fase 2: types (§6.3), money, dates, balances e tagColor (§6.5), com testes de exemplo, de propriedade e de fuso. recurring (Fase 9) e installments (Fase 10) ainda não existem.',
    position: { x: 650, y: 450 },
  },
  {
    id: 'test',
    label: 'Apoio a testes',
    folder: 'src/test',
    description:
      'Setup do Vitest (fake-indexeddb, limpa as tabelas do Dexie entre testes), dublê de matchMedia, renderApp, fábricas de lançamentos, gerador com semente para testes de propriedade e a referência do script do tema (arquivos *.test.* ficam junto do código).',
    position: { x: 740, y: 112 },
  },
  {
    id: 'dev',
    label: 'Somente DEV',
    folder: 'src/dev',
    description:
      'Esta página (§6.12) e as ferramentas de dados de exemplo da tela Sobre (§6.11, D-30). Carregadas só por import dinâmico atrás de import.meta.env.DEV, cada uma com CSS próprio.',
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
      'Provider de tema usa as regras puras do tema; useIsStandalone usa lib/displayMode; registerPwa usa lib/updateCheck (D-24); pwaOptions usa THEME_COLORS.',
  },
  {
    from: 'app',
    to: 'repositories',
    status: 'allowed',
    reason:
      'Fase 2: ThemeProvider usa useThemePreference e fornece ThemeContext (D-22/D-28); usePersistentStorageRequest chama requestPersistentStorageOnce (CA-11.4).',
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
    reason:
      'Dados persistidos só por repositórios (§2.7). Fase 2: ThemeSection usa useTheme (D-22) e AboutPage lê SCHEMA_VERSION por databaseInfo.',
  },
  { from: 'features', to: 'stores', status: 'allowed', reason: 'Filtros e visões (§6.7).' },
  { from: 'features', to: 'domain', status: 'allowed', reason: 'Regras puras e tipos.' },
  {
    from: 'features',
    to: 'lib',
    status: 'allowed',
    reason:
      'Utilitários puros: rótulos do tema, storage/formatBytes/APP_VERSION na tela Sobre (Fase 2); cripto na Fase 6.',
  },
  {
    from: 'features',
    to: 'dev',
    status: 'exception',
    reason:
      'Somente src/features/settings/AboutPage.tsx → SampleDataTools, por import dinâmico (lazy) depois do guard import.meta.env.DEV (§6.11, D-30). Em produção o guard vira código morto e nada de src/dev entra no dist/.',
    onlyTargets: ['src/dev/sampleData/SampleDataTools.tsx'],
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
  {
    from: 'repositories',
    to: 'lib',
    status: 'allowed',
    reason:
      'Regras do tema, espelho em localStorage (themeStorage) e requestPersistentStorage (lib/storage).',
  },
  {
    from: 'repositories',
    to: 'repositories',
    status: 'allowed',
    reason: 'themeRepository usa settingsRepository; useTheme lê ThemeContext.',
  },
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
  {
    from: 'domain',
    to: 'domain',
    status: 'allowed',
    reason: 'balances usa money (addCents) e dates; todos usam types.',
  },
  {
    from: 'dev',
    to: 'domain',
    status: 'allowed',
    reason: 'O gerador de dados de exemplo usa os tipos da §6.3 e addMonthsClamped/today.',
  },
  {
    from: 'dev',
    to: 'db',
    status: 'exception',
    reason:
      'Exceção consciente ao princípio 7 (D-30, confirmada pelo dono): useSampleDataTools importa o db e sampleDataStore grava/apaga as quatro tabelas de dados numa transação. Vale só para src/dev, que fica fora do build de produção.',
    onlyTargets: ['src/db/database.ts'],
  },
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

/**
 * Direções proibidas (espelham as regras FORBIDDEN do scanner). Se alguma aparecer no código
 * de produção, a seta fica vermelha e o import vai para a lista de violações.
 */
export const FORBIDDEN_DEPENDENCIES: readonly ForbiddenDependency[] = [
  {
    from: 'features',
    to: 'app',
    rule: 'D-22',
    reason:
      'Features não importam de src/app/ (acoplamento e risco de ciclo app ↔ features). A única ocorrência, ThemeSection → app/theme/useTheme, foi eliminada na Fase 2: useTheme e ThemeContext estão em src/repositories/. Agora não há exceção.',
    inDiagram: true,
  },
  {
    from: 'components',
    to: 'features',
    rule: 'Qualidade de código',
    reason: 'Primitivos de components/ui não conhecem features (nem app).',
    inDiagram: true,
  },
  {
    from: 'features',
    to: 'db',
    rule: '§2.7',
    reason:
      'Componentes nunca acessam o Dexie diretamente; usam repositories (vale também para app e components).',
  },
  {
    from: 'domain',
    to: 'db',
    rule: '§2.6',
    reason:
      'Domínio e lib são puros: sem React, sem Dexie, sem stores e sem importar camadas de interface.',
  },
  {
    from: 'repositories',
    to: 'features',
    rule: 'Camadas',
    reason:
      'Acesso a dados (repositories e db) não conhece a interface (components, features, app).',
  },
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
      'Menu de subpáginas (SettingsMenu) + seção de tema (ThemeSection). Desde a Fase 2 a escolha é gravada na tabela settings (chave theme) por saveThemePreference, com espelho em localStorage para o script do index.html (D-28). Tabela tocada: settings.',
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
    requirements: ['RF-11', 'CA-11.4', 'CA-11.5', 'D-27', 'D-29', 'D-30'],
    description:
      'Fase 2: InfoList com versão do app (APP_VERSION, injetada pelo define — D-27), versão do esquema (SCHEMA_VERSION via repositories/databaseInfo) e espaço usado ("1,2 MB de 500 MB" — formatBytes, D-29); linha role="status" com o armazenamento persistente (ativo / não garantido). Dados de useStorageStatus (persisted + estimate, consultados ao abrir). Só em DEV: seção lazy com as ferramentas de dados de exemplo (SampleDataTools — D-30), que gravam em tags, transactions, recurrings e installmentGroups. A tela em si não toca em tabelas.',
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
    note: 'Fase 2: preferência vem de useThemePreference (Dexie com espelho em localStorage — D-28) + tema do sistema (useSyncExternalStore); aplica ao documento e fornece ThemeContext (de src/repositories, D-22).',
  },
  {
    component: 'InfoList',
    note: 'Compound component (Fase 2): <dl> com InfoList.Item (rótulo <dt> + valor <dd>, tabular-nums, min-h-11). Somente leitura, sem estado.',
  },
  {
    component: 'SampleDataTools',
    note: 'Somente DEV (D-30): carregado com lazy() dentro de Suspense fallback null, só quando import.meta.env.DEV. Estado (isBusy, message) em useSampleDataTools; CSS próprio (sampleData.css).',
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
  // const SampleDataTools = loadSampleDataTools(): lazy() só em DEV, dentro de uma função (D-30).
  SampleDataTools: 'src/dev/sampleData/SampleDataTools.tsx',
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
      'ThemeSection lê { preference, setPreference } de useTheme() (src/repositories, D-22); o estado fica em useThemePreference, chamado pelo ThemeProvider: useLiveQuery na chave theme da tabela settings, espelho do localStorage enquanto carrega e a escolha da sessão por cima (D-28).',
  },
  {
    route: '/ajustes/sobre',
    stateAndData:
      'Estado local em useStorageStatus ({ isLoading } até as duas consultas responderem), textos em storageStatusTexts. APP_VERSION e SCHEMA_VERSION são constantes de módulo. Nenhum useLiveQuery: a tela não lê tabelas. Em DEV, SampleDataTools tem estado próprio (useSampleDataTools).',
  },
  {
    route: '/',
    stateAndData: 'Placeholder sem estado. Na Fase 4 lerá saldos por repositórios (useLiveQuery).',
  },
]

// ---------- fluxos ----------

const THEME_SCRIPT_TEST = 'src/app/theme/indexHtmlThemeScript.test.ts'
const THEME_SECTION_TEST = 'src/features/settings/ThemeSection.test.tsx'
const THEME_PREFERENCE_TEST = 'src/repositories/themePreference.test.ts'

export const FLOWS: readonly Flow[] = [
  {
    id: 'theme-boot',
    title: 'Abertura do app sem piscar o tema (Dexie + espelho)',
    summary:
      'O script inline do index.html aplica o tema lido do espelho em localStorage antes do bundle. Depois o ThemeProvider chama useThemePreference: enquanto o IndexedDB carrega vale o mesmo espelho (sem troca visível); uma única vez, um tema que só exista no espelho (Fase 0) é copiado para o Dexie numa transação; quando o useLiveQuery entrega settings.theme, ele vira a fonte da verdade e o espelho é corrigido (D-28).',
    requirements: ['CA-09.1', 'CA-09.2', 'CA-09.3', 'CA-09.4', 'D-28'],
    participants: [
      { id: 'browser', label: 'Navegador' },
      { id: 'html', label: 'index.html (script)', module: 'index.html' },
      { id: 'mirror', label: 'localStorage (espelho)' },
      { id: 'main', label: 'main.tsx', module: 'src/main.tsx' },
      { id: 'provider', label: 'ThemeProvider', module: 'src/app/theme/ThemeProvider.tsx' },
      {
        id: 'prefHook',
        label: 'useThemePreference',
        module: 'src/repositories/useThemePreference.ts',
      },
      { id: 'themeStorage', label: 'themeStorage', module: 'src/lib/themeStorage.ts' },
      { id: 'repo', label: 'themeRepository', module: 'src/repositories/themeRepository.ts' },
      {
        id: 'settingsRepo',
        label: 'settingsRepository',
        module: 'src/repositories/settingsRepository.ts',
      },
      { id: 'dexie', label: 'Dexie: settings', module: 'src/db/database.ts' },
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
        to: 'mirror',
        label: "getItem('theme')",
        detail:
          'Lê o espelho do valor salvo no Dexie (§6.9, D-28), dentro de try/catch (modo privado pode lançar exceção). O IndexedDB é assíncrono e não serve aqui.',
        refs: ['CA-09.2', 'D-28'],
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
        detail: 'App envolve o RouterProvider com o ThemeProvider (continua em src/app/theme).',
        refs: ['RF-09'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'prefHook',
        label: 'useThemePreference()',
        detail: 'Devolve { preference, setPreference }; o provider não sabe de onde vem o valor.',
        refs: ['D-28'],
        kind: 'call',
      },
      {
        from: 'prefHook',
        to: 'themeStorage',
        label: 'readThemeMirror()',
        detail:
          'useState(readThemeMirror): o mesmo valor que o script aplicou. Vale enquanto o IndexedDB carrega, então a 1ª renderização não troca o tema.',
        refs: ['CA-09.3', 'D-28'],
        kind: 'call',
      },
      {
        from: 'prefHook',
        to: 'repo',
        label: 'useLiveQuery(getStoredThemePreference)',
        detail: 'undefined enquanto carrega; null se não houver valor válido no Dexie.',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'settingsRepo',
        label: "getSetting('theme')",
        detail: 'Valida com isThemePreference; lixo na tabela vira null.',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'settingsRepo',
        to: 'dexie',
        label: "settings.get('theme')",
        detail: 'Único ponto de leitura da tabela settings para o tema.',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'prefHook',
        to: 'repo',
        label: 'migrateThemePreferenceFromMirror()',
        detail:
          'useEffect com [], uma vez por abertura. Fase 0 → Fase 2: se o espelho tem tema e o Dexie não, copia. Falha do IndexedDB é ignorada (a escolha continua valendo).',
        refs: ['D-28'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('rw'): get + put",
        detail:
          'Leitura e escrita na mesma transação: duas chamadas simultâneas (StrictMode) não sobrescrevem um valor gravado no meio do caminho. Nas aberturas seguintes não faz nada.',
        refs: ['D-28'],
        kind: 'call',
      },
      {
        from: 'dexie',
        to: 'prefHook',
        label: 'liveQuery emite settings.theme',
        detail: 'O valor do Dexie passa a valer: chosen ?? stored ?? mirrored ?? system.',
        refs: ['CA-09.2'],
        kind: 'return',
      },
      {
        from: 'prefHook',
        to: 'themeStorage',
        label: 'writeThemeMirror(stored)',
        detail:
          'Corrige o espelho para o valor do Dexie (ex.: localStorage apagado e IndexedDB preservado), para a próxima abertura também não piscar.',
        refs: ['CA-09.3', 'D-28'],
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
    tests: [
      THEME_SCRIPT_TEST,
      THEME_PREFERENCE_TEST,
      'src/repositories/themeRepository.test.ts',
      'src/lib/themeStorage.test.ts',
      'src/lib/theme.test.ts',
    ],
  },
  {
    id: 'theme-change',
    title: 'Troca de tema em Ajustes (grava no Dexie e no espelho)',
    summary:
      'O usuário escolhe Automático/Claro/Escuro. A escolha vale na hora (estado da sessão), o espelho em localStorage é atualizado primeiro e a tabela settings depois; o useLiveQuery devolve o mesmo valor (D-28).',
    requirements: ['CA-09.1', 'CA-09.2', 'CA-09.3', 'CA-09.4', 'D-22', 'D-28'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'radio', label: 'ThemeRadio.Option', module: 'src/components/ui/createRadioGroup.tsx' },
      { id: 'section', label: 'ThemeSection', module: 'src/features/settings/ThemeSection.tsx' },
      { id: 'hook', label: 'useTheme', module: 'src/repositories/useTheme.ts' },
      { id: 'provider', label: 'ThemeProvider', module: 'src/app/theme/ThemeProvider.tsx' },
      {
        id: 'prefHook',
        label: 'useThemePreference',
        module: 'src/repositories/useThemePreference.ts',
      },
      { id: 'repo', label: 'themeRepository', module: 'src/repositories/themeRepository.ts' },
      { id: 'themeStorage', label: 'themeStorage', module: 'src/lib/themeStorage.ts' },
      {
        id: 'settingsRepo',
        label: 'settingsRepository',
        module: 'src/repositories/settingsRepository.ts',
      },
      { id: 'dexie', label: 'Dexie: settings', module: 'src/db/database.ts' },
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
        detail:
          'ThemeSection só repassa. Importa de src/repositories (não mais de src/app — D-22 quitada).',
        refs: ['RF-09', 'D-22'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'provider',
        label: 'use(ThemeContext)',
        detail:
          'ThemeContext fica em src/repositories/ThemeContext.ts; o valor é fornecido pelo ThemeProvider. Erro claro fora do provider.',
        refs: ['D-22'],
        kind: 'call',
      },
      {
        from: 'provider',
        to: 'prefHook',
        label: 'setPreference(next)',
        detail: 'Função devolvida por useThemePreference.',
        refs: ['RF-09'],
        kind: 'call',
      },
      {
        from: 'prefHook',
        to: 'provider',
        label: 'setChosenPreference(next)',
        detail: 'A escolha da sessão vale na hora, sem esperar a gravação no IndexedDB.',
        refs: ['CA-09.3', 'D-28'],
        kind: 'return',
      },
      {
        from: 'prefHook',
        to: 'repo',
        label: 'saveThemePreference(next)',
        detail: '.catch ignora falha do IndexedDB: o tema continua valendo na sessão e no espelho.',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'themeStorage',
        label: 'writeThemeMirror(next)',
        detail: 'Primeiro o espelho: a próxima abertura já sai sem piscar (try/catch).',
        refs: ['CA-09.3', 'D-28'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'settingsRepo',
        label: "setSetting('theme', next)",
        detail: 'Fonte da verdade (§6.7, D-28).',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'settingsRepo',
        to: 'dexie',
        label: 'settings.put({ key, value })',
        detail: 'Uma escrita, um registro: não precisa de transação explícita.',
        refs: ['CA-09.2'],
        kind: 'call',
      },
      {
        from: 'dexie',
        to: 'prefHook',
        label: 'liveQuery re-emite',
        detail: 'Mesmo valor da escolha; o espelho já está igual.',
        refs: [],
        kind: 'return',
      },
      {
        from: 'provider',
        to: 'apply',
        label: 'resolveTheme → aplicar',
        detail: 'Alterna .dark no <html> e atualiza a meta theme-color.',
        refs: ['CA-09.3', 'CA-09.4'],
        kind: 'call',
      },
    ],
    tests: [
      THEME_SECTION_TEST,
      THEME_PREFERENCE_TEST,
      'src/repositories/themeRepository.test.ts',
      'src/repositories/settingsRepository.test.ts',
      'src/components/ui/createRadioGroup.test.tsx',
    ],
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
          'Chama checkForUpdatesPeriodically: checagem imediata ao abrir, listeners de visibilitychange, focus e online com { signal } do AbortController e intervalo de 30 min (ver o fluxo "Checagem de versão nova (D-24)"). Se a limpeza já tiver rodado, não liga nada.',
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
    title: 'Checagem de versão nova (D-24)',
    summary:
      'O navegador só procura versões novas ao navegar, e no iPhone o app instalado abre do zero ou volta do segundo plano sem navegação nova; o visibilitychange nem sempre dispara (item C 9 do teste da Fase 2: o aviso só apareceu depois de recarregar). O registerPwa pede registration.update() ao abrir, no visibilitychange visível, no focus, no online e a cada 30 min, sempre online, visível e com ≥ 1 min entre checagens (shouldCheckForUpdate), ignorando falhas. Nada recarrega sozinho: a troca é pelo toque em "Atualizar".',
    requirements: ['RF-11', 'CA-11.3', 'CA-12.3', 'D-24'],
    participants: [
      { id: 'plugin', label: 'registerSW (plugin)' },
      { id: 'register', label: 'registerPwa', module: 'src/app/pwa/registerPwa.ts' },
      { id: 'env', label: 'document / window' },
      { id: 'lib', label: 'lib/updateCheck', module: 'src/lib/updateCheck.ts' },
      { id: 'registration', label: 'SW registration' },
      { id: 'network', label: 'Rede (Cloudflare Pages)' },
      { id: 'store', label: 'uiStore', module: 'src/stores/uiStore.ts' },
      { id: 'notice', label: 'UpdateNotice', module: 'src/app/pwa/UpdateNotice.tsx' },
      { id: 'user', label: 'Usuário' },
    ],
    steps: [
      {
        from: 'register',
        to: 'plugin',
        label: 'registerSW({ immediate: true, … })',
        detail:
          'registerPwa(registerSW) é chamado pelo main.tsx antes do createRoot e cria o AbortController que desliga tudo na limpeza.',
        refs: ['RF-11'],
        kind: 'call',
      },
      {
        from: 'plugin',
        to: 'register',
        label: 'onRegisteredSW(registration)',
        detail:
          'Sem registration (navegador sem service worker) não faz nada. Com ela, chama checkForUpdatesPeriodically(registration, signal).',
        refs: ['D-24'],
        kind: 'return',
      },
      {
        from: 'register',
        to: 'register',
        label: 'checkForUpdatesPeriodically',
        detail:
          'Se o signal já foi abortado (limpeza antes de o registro terminar), sai sem ligar nada. Guarda lastCheckAt = null na closure.',
        refs: ['D-24'],
        kind: 'call',
      },
      {
        from: 'register',
        to: 'env',
        label: 'listeners + setInterval(30 min)',
        detail:
          'visibilitychange (document), focus e online (window), todos com { signal }; setInterval com UPDATE_CHECK_INTERVAL_MS (30 min). O abort do signal também faz clearInterval.',
        refs: ['D-24'],
        kind: 'call',
      },
      {
        from: 'register',
        to: 'register',
        label: 'gatilho: abertura',
        detail:
          'Checagem imediata ao terminar o registro, sem esperar evento: é a correção do item C 9 (teste "procura versão nova logo ao abrir, sem esperar visibilitychange").',
        refs: ['D-24', 'CA-11.3'],
        kind: 'event',
      },
      {
        from: 'env',
        to: 'register',
        label: 'visibilitychange · focus · online · 30 min',
        detail:
          'Demais gatilhos. Focus e visibilitychange costumam disparar juntos ao voltar do segundo plano; o intervalo mínimo transforma os dois numa checagem só.',
        refs: ['D-24'],
        kind: 'event',
      },
      {
        from: 'register',
        to: 'lib',
        label: 'shouldCheckForUpdate({ isOnline, isVisible, now, lastCheckAt })',
        detail:
          'isOnline = navigator.onLine; isVisible = document.visibilityState === "visible"; now = Date.now(). Função pura, testada em updateCheck.test.ts.',
        refs: ['D-24'],
        kind: 'call',
      },
      {
        from: 'lib',
        to: 'register',
        label: 'false → nada',
        detail:
          'Offline, documento oculto ou menos de MIN_UPDATE_CHECK_GAP_MS (1 min) desde a última checagem. Primeira checagem (lastCheckAt null) online e visível → true.',
        refs: ['D-24'],
        kind: 'return',
      },
      {
        from: 'register',
        to: 'registration',
        label: 'true → registration.update()',
        detail: 'Antes grava lastCheckAt = now. Pede ao navegador que baixe o sw.js de novo.',
        refs: ['D-24'],
        kind: 'call',
      },
      {
        from: 'registration',
        to: 'network',
        label: 'GET /sw.js',
        detail:
          'Chega ao Cloudflare Pages (hoje sem restrição de acesso — D-26). Se o sw.js mudou, o SW novo instala e fica em waiting (registerType "prompt").',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'network',
        to: 'register',
        label: 'falha → .catch(() => undefined)',
        detail:
          'Sem rede: falha esperada, o próximo gatilho tenta de novo. Se a Fase 12 (opcional) ativar o Access, a sessão expirada cai no mesmo caminho (CA-12.3).',
        refs: ['CA-12.3', 'D-24'],
        kind: 'return',
      },
      {
        from: 'plugin',
        to: 'register',
        label: 'versão nova → onNeedRefresh()',
        detail: 'O plugin avisa que há um SW em espera. Nada recarrega sozinho.',
        refs: ['CA-11.3'],
        kind: 'event',
      },
      {
        from: 'register',
        to: 'store',
        label: 'setUpdateAvailable(true)',
        detail: 'Único efeito do onNeedRefresh.',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'store',
        to: 'notice',
        label: 'updateAvailable → "Nova versão disponível"',
        detail:
          'UpdateNotice lê pelo usePwaUpdate (fachada); o AppLayout reserva o espaço do aviso acima da barra.',
        refs: ['CA-11.3'],
        kind: 'event',
      },
      {
        from: 'user',
        to: 'notice',
        label: 'toca "Atualizar"',
        detail: 'Só o toque troca a versão.',
        refs: ['CA-11.3'],
        kind: 'event',
      },
      {
        from: 'notice',
        to: 'register',
        label: 'applyUpdate → applyPwaUpdate()',
        detail:
          'applyPwaUpdate chama updateSW(true): o SW em espera assume e o plugin recarrega a página.',
        refs: ['CA-11.3'],
        kind: 'call',
      },
      {
        from: 'register',
        to: 'env',
        label: 'limpeza: abort() + clearInterval',
        detail:
          'A função devolvida por registerPwa aborta o AbortController: remove visibilitychange, focus e online e para o intervalo. Funciona mesmo se o registro terminar depois dela.',
        refs: ['D-24'],
        kind: 'call',
      },
    ],
    tests: ['src/app/pwa/registerPwa.test.ts', 'src/lib/updateCheck.test.ts'],
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
    title: 'Navegação offline (e pontos prontos para o Access da Fase 12)',
    summary:
      'O SW responde às navegações com o index.html do precache (o app abre offline em qualquer rota — aprovado no iPhone). Prontos para a Fase 12 (opcional, D-26): /cdn-cgi/ vai à rede para o login do Access funcionar e o manifest é pedido com credenciais. Hoje o site não tem restrição de acesso.',
    requirements: ['CA-11.2', 'CA-12.1', 'CA-12.3', 'RNF-03'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'browser', label: 'Navegador' },
      { id: 'sw', label: 'Service worker' },
      { id: 'html', label: 'index.html', module: 'index.html' },
      { id: 'options', label: 'PWA_OPTIONS', module: 'src/app/pwa/pwaOptions.ts' },
      { id: 'access', label: 'Cloudflare Access (Fase 12, opcional)' },
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
          'Pronto para a Fase 12: a denylist tira /cdn-cgi/ do SW, então login e callback do Access sempre chegarão ao Cloudflare. Sem efeito enquanto o Access não existir.',
        refs: ['CA-12.3'],
        kind: 'call',
      },
      {
        from: 'html',
        to: 'access',
        label: 'manifest com credenciais',
        detail:
          'Pronto para a Fase 12: <link rel="manifest" crossorigin="use-credentials"> injetado pelo plugin (useCredentials: true), para o manifest ser entregue com o cookie da sessão quando houver Access. Hoje é inofensivo.',
        refs: ['CA-12.1', 'CA-11.1'],
        kind: 'call',
      },
      {
        from: 'access',
        to: 'browser',
        label: 'Fase 12: sessão expirada',
        detail:
          'Só se a Fase 12 for feita: aberto pelo cache, o app não passa pelo Access e não força o relogin; só a procura de versão nova falha (ignorada). Verificar no item 4 do roteiro da Fase 12 (CA-12.3).',
        refs: ['CA-12.3'],
        kind: 'return',
      },
    ],
    tests: ['src/app/pwa/pwaOptions.test.ts', 'src/app/pwa/indexHtmlPwaTags.test.ts'],
  },
  {
    id: 'persistent-storage',
    title: 'Pedido de armazenamento persistente na abertura (persist())',
    summary:
      'Na primeira abertura o app pede ao navegador para não apagar os dados. O registro persistRequested é gravado ANTES do pedido, numa transação que lê e grava junto, para o pedido acontecer uma única vez mesmo com o StrictMode ou duas abas (D-28).',
    requirements: ['RF-11', 'CA-11.4', 'D-28', 'RNF-09'],
    participants: [
      { id: 'app', label: 'App', module: 'src/app/App.tsx' },
      {
        id: 'hook',
        label: 'usePersistentStorageRequest',
        module: 'src/app/storage/usePersistentStorageRequest.ts',
      },
      {
        id: 'repo',
        label: 'persistentStorageRepository',
        module: 'src/repositories/persistentStorageRepository.ts',
      },
      { id: 'dexie', label: 'Dexie: settings', module: 'src/db/database.ts' },
      { id: 'lib', label: 'lib/storage', module: 'src/lib/storage.ts' },
      { id: 'browser', label: 'navigator.storage' },
    ],
    steps: [
      {
        from: 'app',
        to: 'hook',
        label: 'usePersistentStorageRequest()',
        detail:
          'Chamado no corpo do App, fora do RouterProvider: roda uma vez por abertura (useEffect com []), em qualquer rota.',
        refs: ['CA-11.4'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'repo',
        label: 'requestPersistentStorageOnce()',
        detail: '.catch ignora a falha: sem IndexedDB não há o que proteger nem onde registrar.',
        refs: ['CA-11.4'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('rw'): get('persistRequested')",
        detail: 'Já pedido → devolve false e para: nunca pede duas vezes.',
        refs: ['CA-11.4', 'D-28'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: 'put(persistRequested = ISO 8601)',
        detail:
          'Gravado antes do pedido, na mesma transação da leitura (StrictMode e duas abas não duplicam). Chave local: não vai para o backup.',
        refs: ['D-28'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'lib',
        label: 'requestPersistentStorage()',
        detail:
          'Fora da transação: persist() não é operação do IndexedDB e a encerraria. Injetável por parâmetro nos testes.',
        refs: ['CA-11.4'],
        kind: 'call',
      },
      {
        from: 'lib',
        to: 'browser',
        label: 'persist()',
        detail:
          'Sem a API ou fora de contexto seguro (RNF-09) → false; exceção → false. Nunca lança.',
        refs: ['RNF-09'],
        kind: 'call',
      },
      {
        from: 'browser',
        to: 'lib',
        label: 'boolean',
        detail: 'O resultado não é gravado: a tela Sobre consulta persisted() quando abre.',
        refs: ['CA-11.4'],
        kind: 'return',
      },
    ],
    tests: [
      'src/repositories/persistentStorageRepository.test.ts',
      'src/repositories/persistentStorage.navigator.test.ts',
      'src/lib/storage.test.ts',
      'src/lib/storage.navigator.test.ts',
    ],
  },
  {
    id: 'about-screen',
    title: 'Tela Sobre: versão, esquema e armazenamento',
    summary:
      'Ajustes → Sobre mostra a versão do app (define do Vite — D-27), a versão do esquema (SCHEMA_VERSION por repositories), o espaço usado e se o armazenamento é persistente, consultados ao abrir a tela.',
    requirements: ['RF-11', 'CA-11.4', 'CA-11.5', 'D-27', 'D-29'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'page', label: 'AboutPage', module: 'src/features/settings/AboutPage.tsx' },
      { id: 'version', label: 'lib/appVersion', module: 'src/lib/appVersion.ts' },
      { id: 'dbinfo', label: 'databaseInfo', module: 'src/repositories/databaseInfo.ts' },
      {
        id: 'status',
        label: 'useStorageStatus',
        module: 'src/features/settings/useStorageStatus.ts',
      },
      { id: 'lib', label: 'lib/storage', module: 'src/lib/storage.ts' },
      { id: 'browser', label: 'navigator.storage' },
      {
        id: 'texts',
        label: 'storageStatusTexts',
        module: 'src/features/settings/storageStatusTexts.ts',
      },
      { id: 'bytes', label: 'formatBytes', module: 'src/lib/formatBytes.ts' },
      { id: 'info', label: 'InfoList', module: 'src/components/ui/InfoList.tsx' },
    ],
    steps: [
      {
        from: 'user',
        to: 'page',
        label: 'Ajustes → Sobre',
        detail: 'Rota /ajustes/sobre, carregada com React.lazy (lazyPages).',
        refs: ['RF-11'],
        kind: 'event',
      },
      {
        from: 'page',
        to: 'version',
        label: 'APP_VERSION',
        detail:
          'Constante __APP_VERSION__ injetada pelo define do vite.config.ts a partir do package.json (tipo em src/globals.d.ts). Só a string entra no bundle.',
        refs: ['CA-11.5', 'D-27'],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'dbinfo',
        label: 'SCHEMA_VERSION',
        detail: 'Reexport de src/db/database.ts: a feature não importa o banco (princípio 7).',
        refs: ['CA-11.5'],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'status',
        label: 'useStorageStatus()',
        detail: '{ isLoading: true } até as duas consultas responderem.',
        refs: ['CA-11.4', 'CA-11.5'],
        kind: 'call',
      },
      {
        from: 'status',
        to: 'lib',
        label: 'isStoragePersisted() + getStorageEstimate()',
        detail:
          'Promise.all no useEffect, com guarda isMounted. As duas têm fallback null e nunca rejeitam.',
        refs: ['CA-11.4', 'CA-11.5'],
        kind: 'call',
      },
      {
        from: 'lib',
        to: 'browser',
        label: 'persisted() / estimate()',
        detail: 'Sem a API ou fora de contexto seguro → null ("Indisponível neste navegador").',
        refs: ['RNF-09'],
        kind: 'call',
      },
      {
        from: 'status',
        to: 'page',
        label: '{ isPersisted, estimate }',
        detail: 'usage/quota viram usageBytes/quotaBytes.',
        refs: [],
        kind: 'return',
      },
      {
        from: 'page',
        to: 'texts',
        label: 'describeStorageUsage / describePersistence',
        detail:
          '"Carregando…", "Indisponível neste navegador", "Armazenamento persistente: ativo" ou "não garantido" (sem a API não dá para afirmar).',
        refs: ['CA-11.4', 'CA-11.5'],
        kind: 'call',
      },
      {
        from: 'texts',
        to: 'bytes',
        label: 'formatStorageUsage(usage, quota)',
        detail: 'Unidades decimais (1 KB = 1.000 B), uma casa: "1,2 MB de 500 MB".',
        refs: ['CA-11.5', 'D-29'],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'info',
        label: 'InfoList.Item × 3 + <p role="status">',
        detail:
          'Versão do app, versão do esquema, espaço usado; o status do persistente é lido por leitores de tela.',
        refs: ['CA-11.4', 'RNF-06'],
        kind: 'call',
      },
    ],
    tests: [
      'src/features/settings/AboutPage.test.tsx',
      'src/lib/formatBytes.test.ts',
      'src/lib/appVersion.test.ts',
      'src/lib/storage.test.ts',
      'src/db/database.schema.test.ts',
    ],
  },
  {
    id: 'sample-data',
    title: 'Dados de exemplo: gerar e apagar (somente DEV)',
    summary:
      'Em DEV, a tela Sobre carrega com lazy() uma seção extra. "Gerar" substitui tags, lançamentos, recorrentes e parcelamentos por uma massa determinística; "Apagar" limpa essas quatro tabelas e mantém settings. As duas pedem confirmação e gravam numa única transação. Acessa o db diretamente: exceção ao princípio 7 só para src/dev (D-30, confirmada pelo dono).',
    requirements: ['D-30', 'RNF-02'],
    participants: [
      { id: 'dev', label: 'Desenvolvedor' },
      { id: 'page', label: 'AboutPage', module: 'src/features/settings/AboutPage.tsx' },
      { id: 'tools', label: 'SampleDataTools', module: 'src/dev/sampleData/SampleDataTools.tsx' },
      {
        id: 'hook',
        label: 'useSampleDataTools',
        module: 'src/dev/sampleData/useSampleDataTools.ts',
      },
      { id: 'build', label: 'buildSampleData', module: 'src/dev/sampleData/buildSampleData.ts' },
      { id: 'rng', label: 'seededRandom', module: 'src/dev/sampleData/seededRandom.ts' },
      { id: 'store', label: 'sampleDataStore', module: 'src/dev/sampleData/sampleDataStore.ts' },
      { id: 'dexie', label: 'Dexie (4 tabelas)', module: 'src/db/database.ts' },
    ],
    steps: [
      {
        from: 'page',
        to: 'tools',
        label: 'lazy(import()) só em DEV',
        detail:
          'loadSampleDataTools(): guard import.meta.env.DEV antes do import dinâmico; em produção vira código morto e src/dev não entra no dist/. Suspense fallback null; CSS próprio (sampleData.css).',
        refs: ['D-30'],
        kind: 'call',
      },
      {
        from: 'dev',
        to: 'tools',
        label: 'toca "Gerar dados de exemplo"',
        detail: 'Botões desabilitados enquanto isBusy.',
        refs: ['D-30'],
        kind: 'event',
      },
      {
        from: 'tools',
        to: 'hook',
        label: 'generate()',
        detail: 'O componente só renderiza; estado e ações ficam no hook.',
        refs: [],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'dev',
        label: 'window.confirm(...)',
        detail: 'Cancelar não faz nada.',
        refs: ['D-30'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'build',
        label: 'buildSampleData(today())',
        detail:
          'Função pura: semente fixa + data de referência → 12 tags, 5.000 lançamentos em 36 meses, 4 recorrentes e 3 parcelamentos (§6.11).',
        refs: ['D-30', 'RNF-02'],
        kind: 'call',
      },
      {
        from: 'build',
        to: 'rng',
        label: 'createSeededRandom (mulberry32)',
        detail:
          'IDs UUID v4 derivados do gerador (não crypto.randomUUID), para os dados serem determinísticos.',
        refs: ['D-30'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'store',
        label: 'replaceWithSampleData(db, data)',
        detail: 'useSampleDataTools importa o db (exceção da D-30) e o passa à função.',
        refs: ['D-30'],
        kind: 'call',
      },
      {
        from: 'store',
        to: 'dexie',
        label: "transaction('rw', 4 tabelas): clear + bulkAdd",
        detail:
          'Tudo ou nada (princípio 8). settings fica de fora: tema e persistRequested são mantidos.',
        refs: ['D-30'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'tools',
        label: 'mensagem em role="status"',
        detail: '"Dados de exemplo gerados: 12 tags, 5.000 lançamentos, …" ou "Erro: …".',
        refs: [],
        kind: 'return',
      },
      {
        from: 'dev',
        to: 'tools',
        label: 'toca "Apagar todos os dados"',
        detail: 'Mesmo caminho: confirm → clearAllData(db).',
        refs: ['D-30'],
        kind: 'event',
      },
      {
        from: 'store',
        to: 'dexie',
        label: "transaction('rw', 4 tabelas): clear",
        detail: 'Apaga tags, transactions, recurrings e installmentGroups; mantém settings.',
        refs: ['D-30'],
        kind: 'call',
      },
    ],
    tests: [
      'src/dev/sampleData/buildSampleData.test.ts',
      'src/dev/sampleData/buildSampleData.model.test.ts',
      'src/dev/sampleData/sampleDataStore.test.ts',
    ],
  },
]

/** Fluxos exigidos pela §6.12 que ainda não existem no código. */
export const PLANNED_FLOWS: readonly PlannedFlow[] = [
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

// ---------- modelo de dados, estado e domínio ----------

/** Esquema da §6.4 (para comparar com o esquema que o scanner lê de src/db/database.ts). */
export const SPEC_SCHEMA_VERSION = 1

/**
 * O que o scanner não sabe sobre cada tabela (§6.3/§6.4/§6.8). Índices, versão e
 * leitores/escritores vêm de module-graph.json (schema e tables).
 */
export const TABLE_NOTES: readonly TableNote[] = [
  {
    name: 'tags',
    type: 'Tag',
    inBackup: 'sim',
    usedFromPhase: 3,
    note: 'Sem repositório de produção até a Fase 3. Hoje só as ferramentas DEV gravam (sampleDataStore, com o db passado por useSampleDataTools — D-30). &nameKey garante nome único (CA-03.4).',
  },
  {
    name: 'transactions',
    type: 'Transaction',
    inBackup: 'sim',
    usedFromPhase: 4,
    note: 'Sem repositório de produção até a Fase 4. Hoje só as ferramentas DEV gravam (5.000 lançamentos de exemplo — D-30). Índice composto [recurringId+recurringPeriod] para as pendências (Fase 9).',
  },
  {
    name: 'recurrings',
    type: 'Recurring',
    inBackup: 'sim',
    usedFromPhase: 9,
    note: 'Sem repositório de produção até a Fase 9. Hoje só as ferramentas DEV gravam (4 recorrentes — D-30).',
  },
  {
    name: 'installmentGroups',
    type: 'InstallmentGroup',
    inBackup: 'sim',
    usedFromPhase: 10,
    note: 'Sem repositório de produção até a Fase 10. Hoje só as ferramentas DEV gravam (3 parcelamentos — D-30).',
  },
  {
    name: 'settings',
    type: 'Setting',
    inBackup: 'só a chave theme (lastBackupAt e persistRequested são locais)',
    usedFromPhase: 2,
    note: 'Fase 2: chave theme (fonte da verdade do tema, com espelho em localStorage — D-28) e persistRequested (data do pedido de persist(), gravada antes do pedido — D-28). lastBackupAt entra na Fase 6. "Apagar todos os dados" (DEV) mantém esta tabela (D-30).',
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
  { id: 'RF-12', title: 'Acesso restrito (opcional — D-26)', phases: [12] },
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
    title: 'Cloudflare Pages + Access (o Access ficou opcional — D-26)',
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
    title: 'Features não importam de src/app/ (cumprida na Fase 2: tema em repositories)',
    status: 'confirmed',
    impacts: [
      'src/features/settings/ThemeSection.tsx',
      'src/repositories/useTheme.ts',
      'src/repositories/ThemeContext.ts',
      'src/app/theme/ThemeProvider.tsx',
      '.claude/skills/atualizar-arquitetura/scan-architecture.mjs',
    ],
  },
  {
    id: 'D-23',
    title: 'Aviso fora do modo instalado no layout, só texto, sem fechar',
    status: 'confirmed',
    impacts: [
      'src/app/layout/AppLayout.tsx',
      'src/app/pwa/InstallHint.tsx',
      'src/app/pwa/useIsStandalone.ts',
      'src/lib/displayMode.ts',
    ],
  },
  {
    id: 'D-24',
    title:
      'Procurar versão nova (registration.update()) ao abrir, ao ficar visível, no foco, no online e a cada 30 min — online, ≥ 1 min entre checagens (ampliada na spec 1.10)',
    status: 'confirmed',
    impacts: ['src/app/pwa/registerPwa.ts', 'src/lib/updateCheck.ts'],
  },
  {
    id: 'D-25',
    title: 'Ícones provisórios gerados com módulos nativos; favicon.svg removido',
    status: 'confirmed',
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
  {
    id: 'D-26',
    title: 'Acesso restrito (RF-12) opcional, na Fase 12; site sem restrição até lá',
    status: 'confirmed',
    impacts: ['docs/SPEC.md', 'README.md', 'src/app/pwa/pwaOptions.ts'],
  },
  {
    id: 'D-27',
    title: 'Versão do app via define (__APP_VERSION__ do package.json)',
    status: 'confirmed',
    impacts: [
      'vite.config.ts',
      'src/globals.d.ts',
      'src/lib/appVersion.ts',
      'src/features/settings/AboutPage.tsx',
    ],
  },
  {
    id: 'D-28',
    title: 'Tema no Dexie com espelho em localStorage; persistRequested gravado antes do pedido',
    status: 'confirmed',
    impacts: [
      'src/repositories/themeRepository.ts',
      'src/repositories/useThemePreference.ts',
      'src/repositories/useTheme.ts',
      'src/repositories/ThemeContext.ts',
      'src/app/theme/ThemeProvider.tsx',
      'src/lib/themeStorage.ts',
      'src/repositories/persistentStorageRepository.ts',
      'src/app/storage/usePersistentStorageRequest.ts',
    ],
  },
  {
    id: 'D-29',
    title:
      'Dinheiro e bytes em texto (U+00A0, U+2212, 10 dígitos — D-31, Map nos grupos, KB decimal)',
    status: 'confirmed',
    impacts: ['src/domain/money.ts', 'src/domain/balances.ts', 'src/lib/formatBytes.ts'],
  },
  {
    id: 'D-30',
    title: 'Ferramentas DEV de dados de exemplo (semente, substituir, apagar mantendo settings)',
    status: 'confirmed',
    impacts: [
      'src/dev/sampleData/buildSampleData.ts',
      'src/dev/sampleData/seededRandom.ts',
      'src/dev/sampleData/sampleDataStore.ts',
      'src/dev/sampleData/useSampleDataTools.ts',
      'src/dev/sampleData/SampleDataTools.tsx',
      'src/dev/sampleData/sampleData.css',
      'src/features/settings/AboutPage.tsx',
    ],
  },
  {
    id: 'D-31',
    title: 'Campo de valor com no máximo 10 dígitos (MAX_AMOUNT_DIGITS = 10, teto do RF-01)',
    status: 'confirmed',
    impacts: ['src/domain/money.ts', 'src/domain/money.test.ts', 'src/domain/balances.test.ts'],
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
    title: 'Pendente (dono): confirmar no iPhone que o aviso de versão nova aparece sem recarregar',
    severity: 'warn',
    detail:
      'Item C 9 do roteiro da Fase 2: o aviso "Nova versão disponível" só apareceu depois de recarregar a página no app instalado no iPhone, porque o visibilitychange nem sempre dispara. Corrigido em 19/10/2026 (spec 1.10, D-24 ampliada): checagem ao abrir, no visibilitychange, no focus, no online e a cada 30 min, decidida por shouldCheckForUpdate. Os testes automáticos (registerPwa.test.ts, inclusive "procura versão nova logo ao abrir, sem esperar visibilitychange") passam, mas falta a verificação manual: depois de um deploy, abrir ou voltar ao app instalado no iPhone e ver o aviso sem recarregar. Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'src/app/pwa/registerPwa.ts',
      'src/app/pwa/registerPwa.test.ts',
      'src/lib/updateCheck.ts',
      'src/app/pwa/UpdateNotice.tsx',
    ],
  },
  {
    title: 'D-27 a D-30 aguardavam confirmação do dono',
    severity: 'warn',
    detail:
      'Registradas na §8.1 em 19/10/2026 durante a Fase 2 (spec 1.8), ainda sem "Confirmado pelo dono": versão do app pelo define (D-27); tema no Dexie com espelho e persistRequested gravado antes do pedido (D-28); formatos de dinheiro e bytes (D-29); ferramentas DEV de dados de exemplo, inclusive "Apagar todos os dados" mantendo a tabela settings e o acesso direto ao db como exceção ao princípio 7 (D-30).',
    modules: [
      'docs/SPEC.md',
      'src/lib/appVersion.ts',
      'src/repositories/useThemePreference.ts',
      'src/repositories/persistentStorageRepository.ts',
      'src/domain/money.ts',
      'src/lib/formatBytes.ts',
      'src/dev/sampleData/sampleDataStore.ts',
    ],
    resolved: 'Confirmadas pelo dono em 19/10/2026 (spec 1.9, §8.1).',
  },
  {
    title: 'Spec: exemplo do CA-05.3 não vai de segunda a domingo',
    severity: 'warn',
    detail:
      'O CA-05.3 diz que a semana vai de segunda a domingo e dava o exemplo "13 a 19 de out. de 2026", mas 13/10/2026 é uma terça. A semana correta é "12 a 18 de out. de 2026" (weekRange com weekStartsOn: 1, princípio 3). O código e os testes seguem a regra, com comentário sobre o exemplo; faltava o dono corrigir o texto da spec.',
    modules: [
      'docs/SPEC.md',
      'src/domain/dates.ts',
      'src/domain/dates.test.ts',
      'src/domain/dates.calendar.test.ts',
    ],
    resolved:
      'Spec 1.9 (19/10/2026): o exemplo do CA-05.3 passou a ser "12 a 18 de out. de 2026"; os comentários dos testes de weekRange foram atualizados.',
  },
  {
    title: 'Spec: limite de dígitos do valor diverge (10 × 11)',
    severity: 'warn',
    detail:
      'O RF-01 limita o valor a 9.999.999.999 centavos (R$ 99.999.999,99, 10 dígitos); a §6.5 e a §6.11 falavam em limite de 11 dígitos no MoneyInput/digitsToCents. O código seguia a §6.5 (MAX_AMOUNT_DIGITS = 11, MAX_AMOUNT_CENTS) e a D-29 deixava o teto do RF-01 para a validação do formulário na Fase 4.',
    modules: ['docs/SPEC.md', 'src/domain/money.ts', 'src/domain/money.test.ts'],
    resolved:
      'Resolvido pela D-31 (confirmada pelo dono em 19/10/2026, spec 1.9): a máscara aceita no máximo 10 dígitos (MAX_AMOUNT_DIGITS = 10), o mesmo teto do RF-01; §6.5 e §6.11 corrigidas e testes de money/balances ajustados.',
  },
  {
    title: 'Pacote principal com 423 kB (135 kB gzip) por causa do Dexie',
    severity: 'info',
    detail:
      'Na Fase 2 o index-*.js passou a incluir o Dexie e o dexie-react-hooks (o ThemeProvider e o pedido de persist() rodam na abertura, então o banco vai no pacote principal). O revisor considerou não bloqueante; recomendou medir o tempo de abertura no iPhone na Fase 4 ou na Fase 11 (RNF-02). Tamanho atual dos chunks no cartão "Artefatos do último build" (seção PWA).',
    modules: ['src/db/database.ts', 'src/app/App.tsx', 'src/app/theme/ThemeProvider.tsx'],
  },
  {
    title: 'Ferramentas DEV acessam o db diretamente (exceção ao princípio 7)',
    severity: 'info',
    detail:
      'useSampleDataTools importa o db e sampleDataStore grava/apaga as quatro tabelas de dados. É uma exceção consciente, documentada na D-30 (confirmada pelo dono) e válida só para src/dev, que não entra no build (verificado no dist/). Na regra de camadas aparece como exceção dev → db restrita a src/db/database.ts. O scanner só vê as escritas em sampleDataStore (o hook passa o db como parâmetro).',
    modules: [
      'src/dev/sampleData/useSampleDataTools.ts',
      'src/dev/sampleData/sampleDataStore.ts',
      'src/db/database.ts',
    ],
  },
  {
    title: 'Domínio pronto antes das telas: balances e tagColor sem uso em produção',
    severity: 'info',
    detail:
      'src/domain/balances.ts e src/domain/tagColor.ts só são importados por testes (aparecem como órfãos na saúde) e formatBRL/digitsToCents ainda não têm tela. Esperado: a Fase 2 entrega o domínio e as telas que o usam vêm nas Fases 3 (TagChip), 4 (saldos, MoneyInput) e 7–8 (visões e gráficos).',
    modules: ['src/domain/balances.ts', 'src/domain/tagColor.ts', 'src/domain/money.ts'],
  },
  {
    title: 'usePersistentStorageRequest sem teste próprio',
    severity: 'info',
    detail:
      'O hook tem 10 linhas e só chama requestPersistentStorageOnce num useEffect; a regra (pedido único, registro antes do pedido) é coberta pelos testes do repositório. O renderApp dos testes monta as rotas sem o App, então nenhum teste passa pelo hook.',
    modules: [
      'src/app/storage/usePersistentStorageRequest.ts',
      'src/repositories/persistentStorageRepository.test.ts',
      'src/test/renderApp.tsx',
    ],
  },
  {
    title: 'Fase 12 (opcional): risco do CA-12.3 — sessão do Access expirada não força o relogin',
    severity: 'info',
    optionalPhase: 12,
    detail:
      'Só vale se o Access for configurado na Fase 12 (D-26); hoje o site não tem restrição e o risco não existe. Com Access: o SW serve o index.html do precache para toda navegação (exceto /cdn-cgi/), então, com a sessão expirada, o app aberto pelo ícone não passa pelo Cloudflare e não pede login; a procura de versão nova (registration.update()) falha em silêncio (D-24) e o app deixa de receber atualizações até um login por outro caminho. Verificar no item 4 do roteiro da Fase 12.',
    modules: ['src/app/pwa/pwaOptions.ts', 'src/app/pwa/registerPwa.ts'],
  },
  {
    title: 'Fase 12 (opcional): configurar o acesso restrito',
    severity: 'info',
    optionalPhase: 12,
    detail:
      'Tarefas humanas da Fase 12: verificar se o Cloudflare Access (Zero Trust) existe no plano gratuito (senão, avaliar Vercel Authentication ou outra opção gratuita e registrar na §8) e configurar produção e previews (§6.10, README.md). O código já está pronto para a Fase 12: manifest com crossorigin="use-credentials" (useCredentials: true) e o SW sem responder a /cdn-cgi/. Até lá o site fica sem restrição de acesso; os dados continuam só no aparelho (princípio 5).',
    modules: ['README.md', 'src/app/pwa/pwaOptions.ts'],
  },
  {
    title: 'D-23, D-24 e D-25 aguardavam confirmação do dono',
    severity: 'warn',
    detail:
      'Registradas na §8.1 em 18/10/2026 durante a Fase 1 (posição do aviso de instalação, procura de versão ao ficar visível, ícones provisórios e remoção do favicon.svg), ainda sem "Confirmado pelo dono".',
    modules: [
      'docs/SPEC.md',
      'src/app/pwa/InstallHint.tsx',
      'src/app/pwa/registerPwa.ts',
      'scripts/generate-icons.mjs',
    ],
    resolved: 'Confirmadas pelo dono em 19/10/2026 (§8.1).',
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
      'D-22 proíbe features → app. Única ocorrência tolerada até a Fase 2: src/features/settings/ThemeSection.tsx importava src/app/theme/useTheme.ts (e o contexto ficava em src/app/theme/ThemeContext.ts).',
    modules: [
      'src/features/settings/ThemeSection.tsx',
      'src/repositories/useTheme.ts',
      'src/repositories/ThemeContext.ts',
    ],
    resolved:
      'Quitada na Fase 2 (19/10/2026, não commitado): useTheme e ThemeContext foram para src/repositories/; o ThemeProvider continua em src/app/theme e importa de repositories. features → app agora é direção proibida, sem exceção (vermelho na página e regra FORBIDDEN no scanner).',
  },
  {
    title: 'Tema ainda em localStorage',
    severity: 'info',
    detail:
      'Persistência temporária prevista pela Fase 0; a §6.7 manda o tema para a tabela settings na Fase 2, mantendo localStorage só como espelho para o script inline.',
    modules: ['src/lib/themeStorage.ts', 'index.html'],
    resolved:
      'Fase 2 (19/10/2026, não commitado): a tabela settings (chave theme) é a fonte da verdade; src/lib/themeStorage.ts só lê e grava o espelho; migração única do espelho para o Dexie numa transação (D-28).',
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
  {
    title: 'Pendência humana da Fase 1: Cloudflare Pages + Access',
    severity: 'info',
    detail:
      'Única tarefa desmarcada da Fase 1: criar o projeto no Cloudflare Pages, publicar e configurar o Access (passo a passo no README.md, §6.10). Até lá, CA-12.1, CA-12.2 e CA-12.3 não podiam ser verificados.',
    modules: ['README.md'],
    resolved:
      'Resolvido em 19/10/2026: o dono criou o projeto no Cloudflare Pages e publicou; o roteiro da Fase 1 passou no iPhone (instalação, offline e aviso de nova versão). A configuração do Access saiu da Fase 1 e virou a Fase 12 opcional (D-26).',
  },
  {
    title: 'Versão da spec não foi incrementada com D-23 a D-25',
    severity: 'warn',
    detail:
      'docs/SPEC.md ganhou D-23, D-24 e D-25 e as tarefas da Fase 1 foram marcadas, mas o cabeçalho continuava em "1.4 — 17/10/2026".',
    modules: ['docs/SPEC.md'],
    resolved:
      'Cabeçalho em 1.6 — 19/10/2026 (D-26), com a 1.5 — 18/10/2026 registrando D-23 a D-25.',
  },
  {
    title: 'src/stores/.gitkeep continuava versionado',
    severity: 'info',
    detail:
      'A pasta deixou de estar vazia com o uiStore.ts (Fase 1); o .gitkeep da Fase 0 não era mais necessário.',
    modules: ['src/stores/uiStore.ts'],
    resolved: 'Removido pelo orquestrador; a remoção entrou no commit 38ae487 (18/10/2026).',
  },
]

// ---------- notas por módulo ----------

export const MODULE_NOTES: Readonly<Record<string, string>> = {
  'index.html':
    'Script inline (único) que aplica tema e theme-color antes do bundle (CA-09.3). Duplica regras de src/lib/theme.ts; a sincronia é garantida por indexHtmlThemeScript.test.ts. Fase 1: favicon.png, apple-touch-icon e metatags do iOS (capable, status-bar-style, title "Gastos" — D-25); o <link rel="manifest" crossorigin="use-credentials"> NÃO fica aqui: é injetado no build pelo plugin (indexHtmlPwaTags.test.ts impede a duplicata).',
  'vite.config.ts':
    'Plugins: React + React Compiler (via Babel) + Tailwind + VitePWA(PWA_OPTIONS) (importado de src/app/pwa/pwaOptions.ts por caminho relativo). Alias @/ → src/. Vitest no mesmo arquivo (jsdom, setup, cobertura ≥ 90% em domain/lib). Fase 2: define { __APP_VERSION__ } com o version do package.json (D-27), que vale também nos testes.',
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
    'Recebe o registerSW por parâmetro (testável sem o módulo virtual). onNeedRefresh → setUpdateAvailable(true); applyPwaUpdate → updateSW(true). checkForUpdatesPeriodically (D-24, ampliada na spec 1.10): registration.update() ao abrir, no visibilitychange, no focus, no online e a cada 30 min, decidido por shouldCheckForUpdate (lib/updateCheck) e com falhas ignoradas. Listeners atrelados a um AbortController e intervalo parado com clearInterval no abort; a função devolvida faz a limpeza, inclusive se o registro terminar depois dela.',
  'src/app/pwa/pwaOptions.ts':
    'PWA_OPTIONS (§6.9): registerType prompt, injectRegister false, useCredentials true, includeManifestIcons false (os ícones já entram pelo globPatterns), manifest e workbox (precache, navigateFallback, denylist /cdn-cgi/). useCredentials e a denylist /cdn-cgi/ estão prontos para a Fase 12 (acesso restrito, opcional — D-26); hoje o site não tem Access. Protegido por pwaOptions.test.ts.',
  'src/app/pwa/usePwaUpdate.ts':
    'Fachada do aviso: { isUpdateAvailable, applyUpdate }. Componentes não importam o uiStore nem o registerPwa diretamente.',
  'src/app/pwa/useIsStandalone.ts':
    'Lê matchMedia e navigator.standalone uma vez (useState com inicializador) e delega a regra a lib/displayMode.',
  'src/app/pwa/UpdateNotice.tsx':
    'Região viva sempre montada; o aviso usa a altura --update-notice-height, a mesma que o AppLayout reserva.',
  'src/app/pwa/InstallHint.tsx':
    'Texto exato do CA-11.6; posição definida pela D-23 (confirmada pelo dono).',
  'src/stores/uiStore.ts':
    'Primeira store Zustand: só updateAvailable/setUpdateAvailable. INITIAL_UI_STATE é exportado para src/test/setup.ts resetar o estado entre testes. transactionFilters (Fase 5) e viewGranularity/viewAnchorDate (Fase 7) ainda não existem.',
  'src/components/ui/Notice.tsx':
    'Primitivo genérico (sem conhecimento de PWA). Sem teste próprio: coberto pelos testes de UpdateNotice e InstallHint.',
  'src/lib/updateCheck.ts':
    'Regra pura da D-24: shouldCheckForUpdate({ isOnline, isVisible, now, lastCheckAt }) só libera online, visível e com ≥ MIN_UPDATE_CHECK_GAP_MS (1 min) desde a última checagem; UPDATE_CHECK_INTERVAL_MS (30 min) é o intervalo do registerPwa. Relógio injetado (now), sem acesso a navigator/document. Criado na correção do item C 9 (Fase 2).',
  'src/lib/displayMode.ts':
    'Regra pura do modo instalado + a constante da media query (reusada pelo dublê src/test/matchMedia.ts).',
  'src/styles/utilities.css':
    'Variante dark e utilitários de safe area, compartilhados com a página DEV. Fase 1: pb-below-nav soma var(--update-notice-space, 0px); reserve-update-notice define esse espaço; bottom-above-nav posiciona o aviso logo acima da barra.',
  'src/index.css':
    "Tailwind + utilities.css, @source not './dev'. Variáveis --bottom-nav-height e --update-notice-height (Fase 1) como fonte única das alturas.",
  'src/app/App.tsx':
    'Cria o router uma vez no nível do módulo e põe o ThemeProvider por fora do RouterProvider (o tema vale também para rotas fora do layout, como esta página). Fase 2: chama usePersistentStorageRequest() no corpo, para o pedido de persist() valer em qualquer rota (CA-11.4).',
  'src/app/routes.tsx':
    'Árvore de rotas exportada sem o router, para os testes usarem createMemoryRouter (src/test/renderApp.tsx).',
  'src/app/lazyPages.tsx':
    'Todas as telas, exceto o Início, com React.lazy (code splitting por rota — RNF-02).',
  'src/app/devRoutes.tsx':
    'Guard import.meta.env.DEV primeiro; lazy() declarado depois dele para o import dinâmico sumir do build.',
  'src/app/layout/navItems.ts': 'Fonte única dos 5 itens da barra (ordem da spec, RF-13).',
  'src/app/theme/ThemeProvider.tsx':
    'Continua em src/app/theme (aplica o tema ao documento). Desde a Fase 2 a preferência vem de useThemePreference (Dexie + espelho — D-28) e o contexto fornecido é o ThemeContext de src/repositories (D-22).',
  'src/app/theme/useSystemPrefersDark.ts':
    'useSyncExternalStore em vez de useEffect+useState: sem render extra e sem estado duplicado.',
  'src/lib/theme.ts':
    'Regras puras do tema (sem React e sem DOM) — cobertas por teste unitário. Fase 2: perdeu parseThemePreference; a leitura "valor salvo → preferência com padrão" que o script do index.html faz virou o helper de teste src/test/themeReference.ts (parseStoredThemePreference).',
  'src/lib/themeStorage.ts':
    'Fase 2: só o espelho (readThemeMirror/writeThemeMirror) de localStorage[theme], lido pelo script do index.html. A fonte da verdade é a tabela settings (themeRepository). Engole exceções do armazenamento indisponível.',
  'src/components/ui/createRadioGroup.tsx':
    'Fábrica tipada: cada chamada cria um contexto próprio, então Option só aceita valores do tipo T (verificado por @ts-expect-error no teste).',
  'src/components/ui/useGoBack.ts':
    "Usa location.key === 'default' para saber se a página foi aberta direto pela URL.",
  'src/features/settings/ThemeSection.tsx':
    'Usa useTheme de src/repositories (D-22 quitada na Fase 2: nenhuma feature importa de src/app).',
  'src/test/setup.ts':
    'fake-indexeddb/auto, dublê de matchMedia e limpeza de DOM/localStorage após cada teste; desde a Fase 1 reseta o uiStore (INITIAL_UI_STATE); desde a Fase 2 limpa todas as tabelas do Dexie numa transação, depois do cleanup() (gravações pendentes dos componentes terminam antes).',
  'src/test/matchMedia.ts':
    'Dublê de window.matchMedia: esquema escuro controlável (com evento change) e, desde a Fase 1, o modo instalado (setDisplayModeStandalone).',
  'src/db/database.ts':
    'AppDatabase extends Dexie, banco "money-control", version(1).stores(...) igual à §6.4 e SCHEMA_VERSION = 1. Toda mudança futura cria version(n).upgrade e incrementa a constante. database.schema.test.ts compara o esquema real com a §6.4.',
  'src/domain/types.ts':
    'Tipos da §6.3 (Cents, DateString, PeriodString, Tag, Transaction, Recurring, InstallmentGroup, Setting).',
  'src/domain/money.ts':
    'Centavos inteiros (princípio 1): formatBRL/formatSignedBRL (U+00A0 e U+2212 — D-29), digitsToCents (até MAX_AMOUNT_DIGITS = 10 — D-31, os mesmos dígitos de MAX_AMOUNT_CENTS, o teto do RF-01), addCents com Number.isSafeInteger.',
  'src/domain/dates.ts':
    'Datas sem fuso (princípio 2) com parseISO do date-fns; semana de segunda (weekStartsOn: 1). Testes de calendário (bissextos, virada de ano) e de fuso (dates.timezone.test.ts).',
  'src/domain/balances.ts':
    'totals, overallBalance (date ≤ hoje — D-03), groupByDay/Month/Tag (Map — D-29) e runningBalance. Ainda sem uso em produção (Fases 4, 7 e 8). Teste de propriedade em balances.properties.test.ts.',
  'src/domain/tagColor.ts':
    'readableTextColor pela luminância relativa (WCAG) — será usado pelo TagChip na Fase 3.',
  'src/repositories/settingsRepository.ts':
    'getSetting/setSetting e useSetting (useLiveQuery). Base de themeRepository; persistentStorageRepository usa o db direto porque precisa de transação com leitura e escrita.',
  'src/repositories/themeRepository.ts':
    'getStoredThemePreference, saveThemePreference (espelho primeiro, Dexie depois) e migrateThemePreferenceFromMirror (transação rw, uma vez — D-28).',
  'src/repositories/useThemePreference.ts':
    'Estado do tema: chosen (sessão) ?? stored (useLiveQuery) ?? mirrored (localStorage) ?? system. Migra o espelho uma vez e o corrige quando o Dexie entrega o valor (D-28).',
  'src/repositories/ThemeContext.ts':
    'Contexto do tema em repositories para as features não importarem de app/ (D-22).',
  'src/repositories/useTheme.ts': 'use(ThemeContext) com erro claro fora do ThemeProvider (D-22).',
  'src/repositories/persistentStorageRepository.ts':
    'requestPersistentStorageOnce: transação rw lê/grava persistRequested antes do pedido; persist() fora da transação (D-28, CA-11.4).',
  'src/repositories/databaseInfo.ts':
    'Só reexporta SCHEMA_VERSION, para a tela Sobre não importar src/db (princípio 7).',
  'src/app/storage/usePersistentStorageRequest.ts':
    'useEffect com [] no App; ignora falha do IndexedDB. Sem teste próprio (ver saúde).',
  'src/lib/storage.ts':
    'requestPersistentStorage, isStoragePersisted e getStorageEstimate com StorageManager injetável e fallback (false/null) sem a API ou fora de contexto seguro (RNF-09).',
  'src/lib/formatBytes.ts':
    'Unidades decimais com uma casa ("1,2 MB de 500 MB" — D-29); formatter criado uma vez no módulo.',
  'src/lib/appVersion.ts':
    'APP_VERSION = __APP_VERSION__ (define do Vite, tipo em src/globals.d.ts — D-27).',
  'src/globals.d.ts': 'declare const __APP_VERSION__: string (D-27).',
  'src/features/settings/AboutPage.tsx':
    'Tela Sobre (CA-11.4/11.5). loadSampleDataTools(): guard import.meta.env.DEV antes do lazy(import()) das ferramentas DEV (D-30).',
  'src/features/settings/useStorageStatus.ts':
    'Consulta persisted() e estimate() ao abrir (Promise.all, guarda isMounted).',
  'src/features/settings/storageStatusTexts.ts':
    'Textos puros do status (carregando, indisponível, ativo, não garantido).',
  'src/components/ui/InfoList.tsx':
    'Compound component <dl> + InfoList.Item. Sem teste próprio: coberto por AboutPage.test.tsx.',
  'src/dev/sampleData/buildSampleData.ts':
    'Função pura: semente + data de referência → 12 tags, 5.000 lançamentos em 36 meses, 4 recorrentes, 3 parcelamentos (D-30).',
  'src/dev/sampleData/sampleDataStore.ts':
    'replaceWithSampleData e clearAllData numa transação sobre as 4 tabelas de dados; mantém settings (D-30).',
  'src/dev/sampleData/useSampleDataTools.ts':
    'Importa o db (exceção ao princípio 7 — D-30), pede window.confirm e mostra a mensagem do resultado.',
  'src/dev/sampleData/sampleData.css':
    "CSS próprio das ferramentas DEV: @import 'tailwindcss' source(none) + @source './' + utilities.css. Nada vai para o CSS de produção.",
  'src/test/themeReference.ts':
    'parseStoredThemePreference: referência da regra do script inline do index.html (veio de lib/theme na revisão da Fase 2).',
  'src/test/factories.ts': 'makeTransaction, income e expense para os testes de domínio.',
  'src/test/propertyHelpers.ts':
    'Gerador com semente e utilitários de calendário para os testes de propriedade.',
  'src/dev/architecture/model.ts':
    'Importa o JSON gerado e expõe graph/moduleById e filtros comuns. Os índices derivados ficam em layers.ts, composition.ts, traceability.ts, health.ts e search.ts, todos calculados uma vez no carregamento.',
}
