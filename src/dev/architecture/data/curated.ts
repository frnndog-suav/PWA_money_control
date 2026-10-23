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
  PipelineArrow,
  PipelineBox,
  PlannedDomainFunction,
  PlannedFlow,
  PlannedUiField,
  PrincipleInfo,
  RequirementInfo,
  RouteNote,
  ScreenComposition,
  TableNote,
  UiFieldAccess,
} from '@/dev/architecture/types'

// ---------- camadas (§6.2) ----------

export const LAYERS: readonly LayerInfo[] = [
  {
    id: 'config',
    label: 'Configuração',
    folder: '(raiz)',
    description:
      'index.html (script inline do tema, metatags do iOS), vite.config.ts (plugins, VitePWA, alias, Vitest em dois projetos — unit em node e dom em jsdom, D-46), tsconfig, oxlint, Prettier e scripts/ (gerador de ícones).',
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
    label: 'Componentes',
    folder: 'src/components',
    description:
      'Duas partes (§6.2, D-37 — confirmada em 21/10/2026). components/ui: primitivos genéricos sem conhecimento de feature nem de repositório (Page, TabBar, NavList, BackLink, Notice, InfoList; Fase 3: Modal sobre <dialog> — D-33, Button, EmptyState, ErrorAlert, TagChip; Fase 4: Field + useFieldControl, TextInput, MoneyInput, DateInput, inputClasses, SignedAmount, Toast + useToast, useToday e a variante segmented do createRadioGroup; Fase 5: LoadMore, useDebouncedValue e o slot trailing do Page.Header; Fase 6: PasswordInput, FileInput e Button com ref — D-48(d)). components/<entidade>: componentes de domínio usados por mais de uma feature, os únicos de src/components que podem usar repositories — tags/ (TagForm, TagColorPicker e useTagForm movidos de features/tags; TagPicker, CreateTagDialog, tagFormTexts) e transactions/ (TransactionForm, useTransactionForm, TransactionRow — com showDate desde a Fase 5 —, NoTagsNotice, transactionTexts; Fase 5: IncomeExpenseTotals). O scanner distingue as duas pelo caminho (grupo components/ui × components/tags… e a regra FORBIDDEN_PATHS).',
    position: { x: 130, y: 330 },
  },
  {
    id: 'repositories',
    label: 'Repositórios',
    folder: 'src/repositories',
    description:
      'Único acesso ao Dexie em produção (§2.7): funções e hooks com useLiveQuery. Fase 2: settings (getSetting/setSetting/useSetting), tema (themeRepository, useThemePreference, ThemeContext, useTheme — D-22/D-28), pedido único de persist() e SCHEMA_VERSION reexportado para a tela Sobre. Fase 3: tagsRepository (createTag, updateTag e deleteTag com transação, getTagUsage, lista com contagem por useLiveQuery, DuplicateTagNameError/TagNotFoundError). Fase 4: transactionsRepository (createTransaction/updateTransaction em transação rw [tags, transactions] com assertTagExists, deleteTransaction, saldo geral, totais do mês, últimos 5 e lançamento por id, todos com hook useLiveQuery; TransactionNotFoundError/TransactionTagNotFoundError — D-39) e listTags/useTags no tagsRepository. Fase 5: listTransactionsInPeriod (índice date crescente, invertido em memória — D-44) e countTransactions, com useTransactionsInPeriod/useTransactionCount. Fase 6: backupRepository (readBackupTables numa transação r das 5 tabelas, createBackupFile, deliverBackupFile, recordBackupDone, openBackupFile sem tocar no banco e restoreBackup numa única transação rw — D-07/D-47(e)) e useLastBackupAt no settingsRepository (fora do backupRepository, para o Início não levar cripto e zod — D-41).',
    position: { x: 390, y: 330 },
  },
  {
    id: 'stores',
    label: 'Stores',
    folder: 'src/stores',
    description:
      'Zustand só para estado de interface (§6.7). uiStore desde a Fase 1 (updateAvailable); desde a Fase 5, transactionFilters com setFilters/clearFilters, sem persist (D-45(f)); visões na Fase 7.',
    position: { x: 650, y: 330 },
  },
  {
    id: 'lib',
    label: 'Lib',
    folder: 'src/lib',
    description:
      'Utilitários puros e adaptadores de APIs do navegador: tema e espelho em localStorage, modo instalado, storage (persist/persisted/estimate), formatBytes e APP_VERSION (Fase 2); padrão de formulário do princípio 16 (formSubmit: LIVE_VALIDATION e canSubmitForm com startsValid — D-36, spec 1.13; usado pelos formulários de tag e, desde a Fase 4, de lançamento e, desde a Fase 6, de backup). Fase 6: crypto (PBKDF2-SHA-256 600k + AES-GCM 256 pela Web Crypto, envelope da §6.8, BackupDecryptionError — RNF-05/D-47(a)), backupFormat (schemas zod do envelope e do conteúdo, versão e migrações, integridade, settings só com theme — D-47(b)–(d); sem Dexie: SCHEMA_VERSION chega por parâmetro) e share (Web Share API com arquivo ou download).',
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
      'Funções puras e tipos, sem React e sem Dexie (§2.6). Fase 2: types (§6.3), money, dates, balances e tagColor (§6.5), com testes de exemplo, de propriedade e de fuso. Fase 3: tags (toTagNameKey, paleta D-32, sortByTagName, isTagInUse, TAG_NAME_MAX_LENGTH — D-35) e tagSchema (zod, único módulo do domínio com pacote externo; separado para quem só precisa das funções puras não levar o zod). Fase 4: transactionSchema (zod, RF-01: valor 1..MAX_AMOUNT_CENTS, data existente, tag, descrição 1–100 em UTF-16 — D-38(h)), transactions (compareByRecency e takeMostRecent — D-39), isValidDate/formatShortDate/formatMonthLabel em dates e signedAmount exportado em balances. Fase 5: text (foldText, também usado por toTagNameKey), transactionFilters (filtros, resumo por dia e paginação por dias inteiros — D-44), sortByRecency em transactions e formatLongDate em dates. recurring (Fase 9) e installments (Fase 10) ainda não existem.',
    position: { x: 650, y: 450 },
  },
  {
    id: 'test',
    label: 'Apoio a testes',
    folder: 'src/test',
    description:
      'Dois setups do Vitest (D-46): setup.unit.ts do projeto unit (node; só fake-indexeddb e limpeza do Dexie) e setup.ts do projeto dom (jsdom; Testing Library, fake-indexeddb, limpa as tabelas do Dexie entre testes, findBy com 3 s — D-34). Regra: *.test.tsx roda em dom; *.test.ts roda em unit, salvo os listados em DOM_TEST_FILES no vite.config.ts — um *.test.ts novo que precise de DOM (document, window, localStorage, matchMedia, renderHook) tem de entrar nessa lista. Também: dublês de matchMedia e de <dialog> (dialog.ts — D-33), seedDatabase (prepara tabelas ainda sem repositório — D-34), renderApp, fábricas de lançamentos, ações do formulário de lançamento (transactionForm.ts — Fase 4), gerador com semente para testes de propriedade e a referência do script do tema (arquivos *.test.* ficam junto do código).',
    position: { x: 740, y: 112 },
  },
  {
    id: 'dev',
    label: 'Somente DEV',
    folder: 'src/dev',
    description:
      'Esta página (§6.12) e as ferramentas de dados de exemplo da tela Sobre (§6.11, D-30). Carregadas só por import dinâmico atrás de import.meta.env.DEV. Sem folha CSS própria: as classes vêm da folha Tailwind única do app (src/index.css), que só em vite serve varre src/dev (D-43).',
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
      'Dados persistidos só por repositórios (§2.7). Fase 2: ThemeSection usa useTheme (D-22) e AboutPage lê SCHEMA_VERSION por databaseInfo. Fase 3: a tela de tags usa tagsRepository (hook da lista, create/update/delete, getTagUsage e as classes de erro). Fase 4: BalanceSummary (useOverallBalance, useMonthTotals), RecentTransactions (useRecentTransactions, useTags) e useTransactionDetail (useTransaction, deleteTransaction). Fase 6: useExportBackup (createBackupFile, deliverBackupFile), useImportBackup (openBackupFile, restoreBackup, useTheme().setPreference), LastBackupStatus e BackupReminder (useLastBackupAt; BackupReminder também useTransactionCount).',
  },
  { from: 'features', to: 'stores', status: 'allowed', reason: 'Filtros e visões (§6.7).' },
  {
    from: 'features',
    to: 'domain',
    status: 'allowed',
    reason:
      'Regras puras e tipos. Fase 3: useTagsScreen usa isTagInUse (useTagForm e TagColorPicker foram para components/tags na Fase 4 — D-37). Fase 4: BalanceSummary usa periodOf/formatMonthLabel e formatBRL. Fase 6: LastBackupStatus e BackupReminder usam backupReminder (daysSinceLastBackup, describeLastBackup, shouldShowBackupReminder — D-11); useExportBackup/useImportBackup usam backupPasswordSchema.',
  },
  {
    from: 'features',
    to: 'lib',
    status: 'allowed',
    reason:
      'Utilitários puros: rótulos do tema, storage/formatBytes/APP_VERSION na tela Sobre (Fase 2). Fase 6: features/backup usa formSubmit (useExportBackup/useImportBackup — princípio 16), backupFormat (summarizeBackup, tipos BackupSummary/BackupContent e os erros em backupTexts), crypto (BackupDecryptionError em backupTexts) e share (tipo ShareOutcome); a criptografia em si é chamada pelo backupRepository. (formSubmit passou a ser usado de components/<entidade> — useTagForm e useTransactionForm.)',
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
      'Formatação pura (§6.5): MoneyInput usa digitsToCents/formatBRL, SignedAmount usa formatSignedBRL, useToday usa today, TagChip e TagPicker usam readableTextColor, TransactionRow usa signedAmount e formatShortDate; useTagForm/useTransactionForm usam os schemas zod (tagSchema, transactionSchema).',
  },
  {
    from: 'components',
    to: 'lib',
    status: 'allowed',
    reason: 'Utilitários puros: useTagForm e useTransactionForm usam formSubmit (princípio 16).',
  },
  {
    from: 'components',
    to: 'repositories',
    status: 'exception',
    reason:
      'D-37 (confirmada em 21/10/2026): só os componentes de domínio de src/components/<entidade>/ usam repositórios — useTagForm (createTag/updateTag), TransactionForm (useTags) e useTransactionForm (createTransaction/updateTransaction). src/components/ui/ nunca importa repositories (proibição por caminho, também no scanner). Uma pasta de entidade nova precisa entrar em onlySources.',
    onlySources: ['src/components/tags/', 'src/components/transactions/'],
  },
  {
    from: 'repositories',
    to: 'db',
    status: 'allowed',
    reason: 'Repositórios são os únicos clientes do Dexie.',
  },
  {
    from: 'repositories',
    to: 'domain',
    status: 'allowed',
    reason:
      'Tipos e regras puras. Fase 4: transactionsRepository valida com transactionInputSchema e soma/ordena no domínio (overallBalance, totals, monthRange, takeMostRecent — D-39); tagsRepository ordena com sortByTagName.',
  },
  {
    from: 'repositories',
    to: 'lib',
    status: 'allowed',
    reason:
      'Regras do tema, espelho em localStorage (themeStorage) e requestPersistentStorage (lib/storage). Fase 6: backupRepository usa crypto (encryptBackupText/decryptBackupText), backupFormat (build/parse, limites e erros), share (shareOrDownloadFile, injetável nos testes) e themeStorage (writeThemeMirror depois do commit da importação — D-28).',
  },
  {
    from: 'repositories',
    to: 'repositories',
    status: 'allowed',
    reason:
      'themeRepository usa settingsRepository; useTheme lê ThemeContext. Fase 6: backupRepository usa setSetting (lastBackupAt) do settingsRepository.',
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
    reason:
      'Fase 6: backupFormat usa os tipos da §6.3, isValidDate/today (dates) e toTagNameKey (tags) para conferir o nameKey coerente.',
  },
  {
    from: 'lib',
    to: 'lib',
    status: 'allowed',
    reason:
      'themeStorage usa as regras de theme.ts. Fase 6: backupFormat usa crypto (tipo BackupEnvelope e constantes do envelope) e theme (isThemePreference em selectBackupSettings).',
  },
  {
    from: 'domain',
    to: 'domain',
    status: 'allowed',
    reason:
      'balances usa money (addCents) e dates; tagSchema usa TAG_NAME_MAX_LENGTH de tags; transactionSchema usa isValidDate (dates) e formatBRL/MAX_AMOUNT_CENTS (money); todos usam types.',
  },
  {
    from: 'dev',
    to: 'domain',
    status: 'allowed',
    reason:
      'O gerador de dados de exemplo usa os tipos da §6.3, addMonthsClamped/today e, desde a Fase 3, toTagNameKey (mesma chave das telas).',
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
    reason:
      'Primitivos compostos entre si e, desde a Fase 4, componentes de domínio (components/<entidade>) compostos de primitivos (TransactionForm usa Field, MoneyInput, DateInput, TextInput, Toast, TagPicker, CreateTagDialog). Hoje em sentido único: nenhum primitivo de components/ui importa components/<entidade>.',
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
    rule: 'D-37',
    reason:
      'Nada de src/components conhece features: nem os primitivos de components/ui nem os componentes de domínio de components/<entidade> (D-37, confirmada em 21/10/2026; antes era a regra de "Qualidade de código").',
    inDiagram: true,
  },
  {
    from: 'components',
    to: 'app',
    rule: 'D-37',
    reason:
      'Nada de src/components importa de src/app (ui nem <entidade>): o app monta as telas, não o contrário.',
  },
  {
    from: 'components',
    to: 'repositories',
    rule: 'D-37',
    onlySources: ['src/components/ui/'],
    reason:
      'Primitivos de components/ui são genéricos e nunca acessam repositórios; dentro de src/components só components/<entidade>/ pode (exceção restrita em "direções permitidas"). Regra por caminho também no scanner (FORBIDDEN_PATHS).',
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
    requirements: [
      'RF-02',
      'RF-01',
      'CA-01.1',
      'CA-01.7',
      'CA-02.1',
      'CA-02.2',
      'CA-02.3',
      'CA-02.4',
      'D-38',
      'D-39',
      'D-40',
      'D-41',
      'D-42',
      'RF-10',
      'D-11',
      'D-48',
    ],
    description:
      'Fase 4. Única tela fora do React.lazy (vai no pacote principal — RNF-02; ver o achado do bundle de 596 kB, decidido pela D-41). HomePage (useToday) compõe, de cima para baixo: BalanceSummary (saldo geral com todos os lançamentos, inclusive os futuros — D-42, em destaque; "Saldo de outubro de 2026" com entradas e saídas do mês, inclusive datas futuras do mês — CA-02.3; valores com SignedAmount — CA-02.1), a seção "Novo lançamento" com o TransactionForm rápido (Saída/Entrada, valor, data, tag, descrição e "Lançar" — CA-01.1; atalho de criar tag sem perder o digitado — CA-01.7; Toast "Lançamento salvo" — D-38(b)) e RecentTransactions (recebe today; os 5 mais recentes com data até hoje, por data e criação — D-40/D-39, TransactionRow com link para /lancamentos/:id, ou EmptyState; link "Ver todos" para /lancamentos). Tudo por useLiveQuery: um lançamento novo atualiza saldos e lista sem recarregar (CA-02.4). Pendências recorrentes (item 4 do RF-02) entram na Fase 9. Fase 6: BackupReminder no topo (antes do BalanceSummary) — Notice subtle "Último backup: há N dias. Faça um backup para não perder seus dados." + link "Fazer backup" para /ajustes/backup, só com pelo menos um lançamento e sem backup ou com 7 dias ou mais (D-11, D-48(c)); lê useLastBackupAt (settingsRepository) e useTransactionCount, sem levar a criptografia para o pacote principal (D-41/D-47(e)). Tabelas: transactions (leitura e escrita), tags (leitura; escrita pelo atalho de criar tag) e settings (leitura de lastBackupAt).',
    contentPhase: 4,
  },
  {
    route: '/lancamentos',
    screen: 'Lista + filtros',
    requirements: [
      'RF-04',
      'CA-04.1',
      'CA-04.2',
      'CA-04.3',
      'CA-04.4',
      'CA-04.5',
      'CA-04.6',
      'RNF-02',
      'D-44',
      'D-45',
    ],
    description:
      'Fase 5 (lazy). TransactionsPage compõe: Page.Header "Lançamentos" com o atalho "+ Novo" no slot trailing (NewTransactionLink → /lancamentos/novo — D-45(e)); FilterBar (role="search") com "Buscar na descrição" sempre visível, botão "Filtros (N)" e "Limpar filtros", e o painel recolhível com Tipo (Todos/Entradas/Saídas), Tag (TagPicker com "Todas") e Período (Data inicial/final, aviso de período invertido no campo final — D-44(b)); FilterSummary ("N lançamentos encontrados", resultado, entradas e saídas do conjunto filtrado inteiro — CA-04.3) só com filtro aplicado; EmptyState "Nenhum lançamento ainda…" ou "Nenhum lançamento encontrado com esses filtros." (D-45(d)); TransactionDayList com DaySection por dia (data por extenso + totais do dia — CA-04.1; TransactionRow showDate={false}) e LoadMore (50 lançamentos por página em dias inteiros, IntersectionObserver a 600 px + "Carregar mais" — CA-04.6, D-44(d)). Dados por useTransactionList: filtros do Zustand (um seletor por campo), texto com espera de 250 ms, useTransactionsInPeriod pelo índice date (crescente, invertido em memória — D-44(a)), useTransactionCount e useTags; tipo/tag/texto aplicados no domínio (summarizeTransactionList). Tocar numa linha abre /lancamentos/:id (CA-04.5) e o Voltar mantém os filtros (Zustand, sem persist — D-45(f)). Continua sendo a tela pai (fallback do useGoBack) de /lancamentos/novo e /lancamentos/:id. Tabelas: transactions e tags (só leitura).',
    contentPhase: 5,
  },
  {
    route: '/lancamentos/novo',
    screen: 'Novo lançamento',
    requirements: ['RF-01', 'RF-08', 'CA-01.1', 'CA-01.2', 'CA-01.3', 'CA-01.4', 'CA-01.7'],
    description:
      'Fase 4: Page com BackLink (fallback /lancamentos) e o mesmo TransactionForm do Início, em modo criar ("Lançar", Toast e reset mantendo tipo e data). A opção Parcelado (RF-08) entra na Fase 10. Tabelas: transactions (escrita) e tags (leitura; escrita pelo atalho CA-01.7).',
    contentPhase: 4,
  },
  {
    route: '/lancamentos/:id',
    screen: 'Lançamento (editar/excluir)',
    requirements: ['RF-01', 'RF-07', 'RF-08', 'CA-01.5', 'CA-01.6', 'D-38'],
    description:
      'Fase 4: TransactionDetailPage lê o lançamento por useTransactionDetail (useTransaction, useLiveQuery: undefined carregando, null inexistente). Com o lançamento: TransactionForm em modo edição ("Salvar" já ativo — startsValid, princípio 16) com extraAction "Excluir" e o modal ConfirmDeleteTransactionDialog ("Excluir lançamento?"). Salvar (updateTransaction) e Excluir (deleteTransaction) voltam para a tela anterior com useGoBack (tela pai /lancamentos — D-38(c)); isDone evita piscar "Lançamento não encontrado" durante a saída. Id inexistente: EmptyState "Lançamento não encontrado". Regras de recorrentes e parcelas (RF-07/RF-08) nas Fases 9 e 10. Tabelas: transactions (leitura e escrita) e tags (leitura).',
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
    requirements: [
      'RF-03',
      'CA-03.1',
      'CA-03.2',
      'CA-03.3',
      'CA-03.4',
      'CA-03.5',
      'CA-03.6',
      'D-02',
      'D-32',
      'D-33',
    ],
    description:
      'Fase 3: TagsPage com "Nova tag", lista ao vivo (TagList: TagChip com wrap + "N lançamentos", ordenada por nome — CA-03.5) ou EmptyState; tocar numa tag abre o modal de edição. Três modais <dialog> nativos (Modal — D-33), não rotas (§6.6): TagFormDialog (criar/editar com TagForm, paleta de 12 cores + seletor livre — D-32), ConfirmDeleteTagDialog (CA-03.3) e DeleteTagBlockedDialog com as contagens (CA-03.2, D-02). Estado da tela em useTagsScreen (dialog, pendingStep, deleteError); dados por useTagsWithTransactionCount (useLiveQuery). Tabelas: tags (leitura e escrita); transactions, recurrings e installmentGroups só contadas (uso da tag).',
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
    requirements: [
      'RF-10',
      'RNF-05',
      'CA-10.1',
      'CA-10.2',
      'CA-10.3',
      'CA-10.4',
      'CA-10.5',
      'CA-10.6',
      'D-07',
      'D-08',
      'D-11',
      'D-28',
      'D-47',
      'D-48',
    ],
    description:
      'Fase 6 (lazy — a criptografia e o zod do backup ficam fora do pacote principal). BackupPage: Page.Header com BackLink (fallback /ajustes) e, no Page.Body, LastBackupStatus ("Último backup: nunca / hoje / há N dias" — D-48(c)), ExportBackupSection (Senha + Confirmar senha, mínimo 8 e "As senhas não coincidem" enquanto digita; "Exportar backup" → "Gerando backup…"; resultado em role="status"; "Salvar backup" se a folha foi bloqueada por falta de toque recente — D-48(a)) e ImportBackupSection (Arquivo do backup + Senha do backup → "Verificando backup…"; erros exatos dos CA-10.2/10.3/10.5; modal "Importar backup?" com data, contagens e "Isso vai substituir todos os dados atuais." — D-48(b), D-07). Foco no botão novo ou na mensagem de resultado (D-48(e), RNF-06). Dados só pelo backupRepository e useLastBackupAt. Tabelas: lê as 5 na exportação (transação r); a importação limpa e regrava tags, transactions, recurrings e installmentGroups e troca settings.theme numa única transação rw; a exportação grava settings.lastBackupAt só depois de compartilhar ou baixar.',
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
    note: 'Compound component: Page.Header (slot `leading` para o BackLink e, desde a Fase 5, slot `trailing` para uma ação no fim da linha do título — o "+ Novo" da lista, D-45(e)) e Page.Body. Sem estado.',
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
    note: 'Instância local de createRadioGroup<ThemePreference>(): { Root, Option } com contexto próprio e valores tipados. Usa a variante padrão list (opções empilhadas).',
  },
  {
    component: 'TypeRadio',
    note: 'Fase 4: instância local de createRadioGroup<TransactionType>() no TransactionForm, com variant="segmented" (alternador Saída | Entrada lado a lado, rádio sr-only; a marcada fica preenchida e em negrito, não só pela cor — RNF-06; foco do teclado no contorno do grupo). Ligada ao RHF por Controller. Fase 5: outra instância com o mesmo nome local no TypeFilter da lista, createRadioGroup<TransactionTypeFilter>() com Todos | Entradas | Saídas, ligada ao Zustand (setFilters({ type })).',
  },
  {
    component: 'ThemeProvider',
    note: 'Fase 2: preferência vem de useThemePreference (Dexie com espelho em localStorage — D-28) + tema do sistema (useSyncExternalStore); aplica ao documento e fornece ThemeContext (de src/repositories, D-22).',
  },
  {
    component: 'InfoList',
    note: 'Compound component (Fase 2): <dl> com InfoList.Item (rótulo <dt> + valor <dd>, tabular-nums, min-h-11). Somente leitura, sem estado. Usado na tela Sobre e, desde a Fase 6, no resumo do ConfirmImportDialog (data do backup e contagens).',
  },
  {
    component: 'SampleDataTools',
    note: 'Somente DEV (D-30): carregado com lazy() dentro de Suspense fallback null, só quando import.meta.env.DEV. Estado (isBusy, message) em useSampleDataTools. Sem CSS próprio desde a D-43: usa a folha Tailwind única do app.',
  },
  {
    component: 'Suspense',
    note: 'Fallback null: as telas lazy aparecem sem indicador para não piscar.',
  },
  { component: 'Outlet', note: 'Ponto onde o React Router injeta a tela da rota filha.' },
  {
    component: 'Notice',
    note: 'Compound component (Fase 1): Notice.Message (texto, flex-1) e Notice.Action (botão ≥ 44 px, foco branco para aparecer sobre o azul). Variantes accent (com ação) e subtle (só texto). Não decide região viva nem posição: quem usa decide. Fase 6: o BackupReminder usa a variante subtle com um Link "Fazer backup" ao lado do Notice.Message.',
  },
  {
    component: 'UpdateNotice',
    note: 'Região viva role="status" aria-live="polite" sempre montada (vazia sem versão nova), fixa com bottom-above-nav; dentro, Notice accent com altura h-(--update-notice-height). Lê o estado por usePwaUpdate (não toca no Zustand diretamente).',
  },
  {
    component: 'InstallHint',
    note: 'Notice subtle sem ação nem botão de fechar (D-23); devolve null no modo instalado (useIsStandalone).',
  },
  {
    component: 'Modal',
    note: 'Compound component (Fase 3, D-33): <dialog> nativo aberto com showModal() por um useEffect que segue a prop open; title obrigatória (h2 + aria-labelledby sempre renderizado); Esc (onCancel) chama onClose e quem usa decide fechar. Slots Modal.Body (coluna com gap) e Modal.Actions (botões em largura total no celular, ação principal em cima — flex-col-reverse). Os children só existem enquanto aberto: cada abertura começa do zero. Altura limitada por max-h-dialog (safe areas).',
  },
  {
    component: 'Button',
    note: 'Primitivo (Fase 3): variantes primary, secondary, danger e danger-outline; type="button" por padrão; alvo ≥ 44 px. Estado desabilitado com disabled nativo e estilo cinza neutro com contraste AA nos dois temas (princípio 16, spec 1.13). Fase 6: aceita ref (prop do React 19, sem forwardRef) para o foco ir ao "Salvar backup" quando ele aparece (D-48(d)/(e)).',
  },
  {
    component: 'EmptyState',
    note: 'Primitivo (Fase 3): <p> centralizado com borda tracejada para lista vazia. Na tela de tags só é montado depois que a consulta respondeu (items?.length === 0), para não piscar.',
  },
  {
    component: 'ErrorAlert',
    note: 'Primitivo (Fase 3): role="alert" com o texto em pt-BR; usado no rodapé do TagForm (saveError e slot notice) e no ConfirmDeleteTagDialog. Fase 6: falha de exportação (ExportBackupSection), erro de abertura do backup (ImportBackupSection — some ao trocar arquivo ou senha) e falha da substituição (ConfirmImportDialog).',
  },
  {
    component: 'TagChip',
    note: 'Primitivo (Fase 3, CA-03.6): fundo na cor da tag, texto preto/branco por readableTextColor (domain/tagColor), contorno leve para cores parecidas com o fundo. overflow truncate (padrão, uma linha) ou wrap (nome inteiro, wrap-anywhere) — a tela de tags usa wrap na lista e na prévia.',
  },
  {
    component: 'TagFormDialog',
    note: 'Modal com título "Nova tag" ou "Editar tag" envolvendo o TagForm (key = id da tag, para recriar o formulário ao trocar de tag). Injeta no TagForm o botão "Excluir tag" (extraAction, desabilitado em checking-usage) e o ErrorAlert de falha ao conferir o uso (notice).',
  },
  {
    component: 'TagForm',
    note: 'Em src/components/tags desde a Fase 4 (D-37). Conteúdo do modal (<form className="contents">): Modal.Body com Field (Field.Label "Nome" + TextInput com register("name") + Field.Error — aria-invalid/aria-describedby pelo useFieldControl, melhoria da revisão da Fase 4), Controller → TagColorPicker, prévia TagChip (useWatch) e ErrorAlert do saveError + slot notice; Modal.Actions com extraAction | Cancelar | Salvar (disabled={!canSubmit}). onSaved recebe a Tag gravada (o atalho do CA-01.7 a seleciona). Estado em useTagForm (React Hook Form com LIVE_VALIDATION + zodResolver; canSubmit de src/lib/formSubmit.ts — princípio 16). Usado por TagFormDialog (Ajustes → Tags) e CreateTagDialog (formulário de lançamento).',
  },
  {
    component: 'TagColorPicker',
    note: 'Controlado (value/onChange via Controller): fieldset com 12 rádios nativos (sr-only + bolinha de 44 px, peer-checked) da paleta D-32 e <input type="color"> livre; a cor escolhida também aparece em texto (RNF-06).',
  },
  {
    component: 'TagList',
    note: 'Lista <ul> de botões (≥ 44 px): TagChip wrap + formatTransactionCount + ›. Sem estado; onSelect abre a edição.',
  },
  {
    component: 'ConfirmDeleteTagDialog',
    note: 'Modal "Excluir tag?" (CA-03.3): aberto quando tag ≠ null; ErrorAlert de falha ao excluir; "Excluir" (danger) desabilitado durante deleting.',
  },
  {
    component: 'DeleteTagBlockedDialog',
    note: 'Modal "Não é possível excluir" (CA-03.2, D-02): contagens por formatTagUsage ("3 lançamentos, 1 recorrente e 2 parcelamentos"); só o botão "Entendi".',
  },
  {
    component: 'Controller',
    note: 'Do react-hook-form: liga o campo color ao TagColorPicker controlado. No TransactionForm, todos os campos usam Controller (e não register), porque o React Compiler memoiza o ref do register e o reset depois de "Lançar" não limparia o campo (D-39).',
  },
  {
    component: 'TransactionForm',
    note: 'Fase 4, src/components/transactions (D-37): o mesmo formulário no Início, em /lancamentos/novo e na edição. <form noValidate> com TypeRadio segmented, Field + MoneyInput (Valor), Field + DateInput (Data), TagPicker (nada enquanto as tags carregam; sem tags, emptyState = NoTagsNotice), Field + TextInput (Descrição), ErrorAlert do saveError e a linha de ações (extraAction | "Lançar"/"Salvar" com disabled={!canSubmit} — princípio 16). CreateTagDialog e Toast ficam como irmãos do <form> (formulário aninhado não é válido e o envio de um dispararia o outro). Estado: useTransactionForm (RHF) + isCreatingTag (useState); tags por useTags (repositório, permitido para components/<entidade>).',
  },
  {
    component: 'Field',
    note: 'Fase 4, compound component: <Field error> fornece controlId/errorId/error por contexto (useFieldControl.ts); Field.Label (<label htmlFor>) e Field.Error (<p> abaixo do campo — CA-01.2). O controle (TextInput, MoneyInput, DateInput) pega id, aria-invalid e aria-describedby com useFieldControl(). Sem estado.',
  },
  {
    component: 'MoneyInput',
    note: 'Fase 4 (CA-01.3/01.4, D-31, D-38(d)): input text com inputMode="numeric", texto formatBRL(value) e valor em centavos inteiros por digitsToCents; vazio mostra o placeholder "R$ 0,00"; alinhado à direita, cursor sempre no fim (useLayoutEffect + onSelect), seleção de verdade respeitada. Controlado (value/onChange do Controller).',
  },
  {
    component: 'DateInput',
    note: 'Fase 4: <input type="date"> nativo; o valor já é YYYY-MM-DD local e passa direto, sem Date (princípio 2). Classes para o Safari do iOS alinhar à esquerda.',
  },
  {
    component: 'TextInput',
    note: 'Fase 4: input de uma linha que soma as props do useFieldControl às recebidas; usado na descrição do lançamento e, desde a revisão, no nome da tag.',
  },
  {
    component: 'TagPicker',
    note: 'Fase 4, src/components/tags (D-38(a)): <fieldset> "Tag" com chips-rádio nativos (sr-only) na cor da tag; a marcada tem contorno e "✓" (RNF-06); alvo de 44 px por chip (ajustado na revisão). Sem tags, renderiza o slot emptyState. Erro ligado por aria-describedby (aria-invalid não vale em fieldset). ref no 1º rádio para o foco de erro. Fase 5: cada chip é a parte interna TagOption (sem cor = chip neutro); com allOptionLabel (ex.: "Todas" no TagFilter da lista — CA-04.2, D-45(a)) a 1ª opção vale "" e recebe o ref.',
  },
  {
    component: 'NoTagsNotice',
    note: 'Fase 4 (CA-01.7): texto explicando que não há tags e que o digitado continua + Button secondary "Criar tag", que abre o CreateTagDialog.',
  },
  {
    component: 'CreateTagDialog',
    note: 'Fase 4 (CA-01.7): Modal "Nova tag" com o TagForm; onCreated(tag) recebe a tag gravada e o TransactionForm faz setValue("tagId"). Renderizado fora do <form> do lançamento.',
  },
  {
    component: 'Toast',
    note: 'Fase 4 (D-38(b)): região viva role="status" sempre montada, fixa no topo (pt-safe), sem receber toques; mostra a mensagem enquanto useToast a mantém (3 s). Não cobre a barra inferior, o aviso de versão nem o teclado.',
  },
  {
    component: 'SignedAmount',
    note: 'Fase 4 (CA-02.1): formatSignedBRL com verde/vermelho/neutro e tamanhos sm | md | lg; o sinal sempre no texto (a cor nunca é a única informação).',
  },
  {
    component: 'BalanceSummary',
    note: 'Fase 4 (RF-02 itens 1 e 2): recebe today do HomePage; lê useOverallBalance() (sem today: todos os lançamentos — D-42) e useMonthTotals(periodOf(today)); "—" enquanto carrega (sem R$ 0,00 falso); título "Saldo de {formatMonthLabel}" (D-38(f)). Desde a Fase 5 as entradas e saídas do mês vêm do IncomeExpenseTotals (o mesmo do cabeçalho do dia e do resumo dos filtros).',
  },
  {
    component: 'IncomeExpenseTotals',
    note: 'Fase 5, src/components/transactions (D-45(c)): <dl> "Entradas R$ X · Saídas R$ Y" em texto menor, com o rótulo escrito (a cor nunca é a única informação — RNF-06). Sem estado. Usado em BalanceSummary (saldo do mês), DaySection (totais do dia — CA-04.1) e FilterSummary (conjunto filtrado — CA-04.3).',
  },
  {
    component: 'NewTransactionLink',
    note: 'Fase 5: definido no próprio TransactionsPage; Link "+ Novo" (nome acessível "Novo lançamento", 44 px) para /lancamentos/novo, no slot trailing do Page.Header (D-45(e)).',
  },
  {
    component: 'FilterBar',
    note: 'Fase 5, compound component (CA-04.2, D-45(a)): <div role="search">. Estado local (isPanelOpen, panelId de useId e searchInputRef) compartilhado pelo FilterBarContext (filterBarContext.ts, useFilterBar com erro claro fora do FilterBar). Partes locais: .Actions (linha de botões) e .Panel (hidden enquanto fechado; começa fechado). Partes importadas: .Text, .Toggle, .Clear, .Type, .Tag e .Period, cada uma lendo e gravando o seu campo de transactionFilters no Zustand.',
  },
  {
    component: 'FilterBar.Text',
    note: 'TextFilter: Field "Buscar na descrição" + TextInput com ref = searchInputRef (recebe o foco depois de "Limpar filtros"), enterKeyHint="search"; Enter só fecha o teclado. Grava setFilters({ text }) a cada tecla; a espera de 250 ms fica no useTransactionList (D-44(c)).',
  },
  {
    component: 'FilterBar.Toggle',
    note: 'FilterToggle: Button "Filtros (N)" com aria-expanded/aria-controls; N = countActiveFilters de tipo, tag e período (o texto, sempre visível, não entra). Só lê o Zustand.',
  },
  {
    component: 'FilterBar.Clear',
    note: 'ClearFiltersButton (CA-04.4): aparece com algum filtro preenchido (pelo texto digitado, sem esperar a busca); chama clearFilters e foca o campo de busca pelo searchInputRef (RNF-06 — o botão some ao limpar).',
  },
  {
    component: 'FilterBar.Type',
    note: 'TypeFilter: instância local createRadioGroup<TransactionTypeFilter>() com variant="segmented": Todos | Entradas | Saídas; grava setFilters({ type }).',
  },
  {
    component: 'FilterBar.Tag',
    note: 'TagFilter: recebe as tags do useTransactionList (nada enquanto carregam) e reutiliza o TagPicker com allOptionLabel="Todas"; "" ↔ tagId null.',
  },
  {
    component: 'FilterBar.Period',
    note: 'PeriodFilter: <fieldset> "Período" com dois Field + DateInput (Data inicial / Data final; "" ↔ null). Período invertido → Field.Error no campo final com INVERTED_PERIOD_MESSAGE e o período não é aplicado (D-44(b)).',
  },
  {
    component: 'FilterSummary',
    note: 'Fase 5 (CA-04.3, D-45(b)): <section> com "N lançamentos encontrados" (role="status", formatResultCount com separador de milhar), Resultado (SignedAmount) e IncomeExpenseTotals. Só aparece com filtro aplicado (texto depois da espera) e depois de os dados chegarem.',
  },
  {
    component: 'TransactionDayList',
    note: 'Fase 5 (CA-04.1/CA-04.6, D-44(d)): estado itemTarget (meta de itens, começa em 50); countVisibleDays(days, itemTarget) decide quantos dias inteiros montar; LoadMore pede itemCount + 50. O TransactionsPage troca a key (filtersKey) quando os filtros aplicados mudam, o que volta à 1ª página.',
  },
  {
    component: 'DaySection',
    note: 'Fase 5 (CA-04.1, D-45(c)): <section aria-labelledby> com h2 da data por extenso (formatLongDate; 1ª letra maiúscula só pelo CSS), IncomeExpenseTotals do dia e <ul> de TransactionRow com showDate={false}.',
  },
  {
    component: 'LoadMore',
    note: 'Primitivo (Fase 5, components/ui — CA-04.6): IntersectionObserver com rootMargin de 600 px abaixo da tela, refeito a cada página (loadedCount nas deps, para avisar de novo se o fim ainda estiver à vista); botão "Carregar mais" como alternativa acessível (toque/teclado). Sem IntersectionObserver (jsdom), fica só o botão.',
  },
  {
    component: 'RecentTransactions',
    note: 'Fase 4 (RF-02 item 5, D-40): recebe today do HomePage; useRecentTransactions(today, 5) (só datas até hoje) + useTags (Map por id); EmptyState só depois da resposta (não pisca); lista de TransactionRow; link "Ver todos" (Link do react-router, 44 px).',
  },
  {
    component: 'TransactionRow',
    note: 'Fase 4, src/components/transactions: <li> com Link para /lancamentos/:id (CA-01.5 / CA-04.5); descrição truncada, TagChip (truncate), data DD/MM/AAAA (formatShortDate — D-38(f)) e SignedAmount(signedAmount). Sem estado. Fase 5: prop showDate (padrão true); a DaySection da lista passa showDate={false}, porque a data já está no cabeçalho do dia (D-45(c)). Usado em RecentTransactions (com data) e DaySection (sem data).',
  },
  {
    component: 'ConfirmDeleteTransactionDialog',
    note: 'Fase 4 (CA-01.6): Modal "Excluir lançamento?" com a descrição, ErrorAlert de falha e "Excluir" (danger) desabilitado durante a exclusão. Estado vem de useTransactionDetail.',
  },
  { component: 'Link', note: 'Do react-router: navegação por toque, sem recarregar a página.' },
  {
    component: 'PasswordInput',
    note: 'Primitivo (Fase 6, D-48(d)): <input type="password"> com autoCapitalize="none", autoCorrect="off" e spellCheck={false}; autoComplete obrigatório ("new-password" na exportação, "current-password" na importação); id/aria-invalid/aria-describedby pelo useFieldControl do Field em volta; aceita ref (Controller).',
  },
  {
    component: 'FileInput',
    note: 'Primitivo (Fase 6, D-48(d)): <input type="file"> com o botão nativo estilizado como secundário (alvo ≥ 44 px) e o nome do arquivo visível ao lado; onFileChange(file | null) em vez de value/onChange (o input de arquivo não é controlável pelo valor). Ligado ao Field pelo useFieldControl.',
  },
  {
    component: 'LastBackupStatus',
    note: 'Fase 6 (RF-10, D-48(c)): <p> "Último backup: nunca / hoje / há 1 dia / há N dias" (describeLastBackup(daysSinceLastBackup(...))) com useToday e useLastBackupAt; nada enquanto o IndexedDB carrega (sem "nunca" falso).',
  },
  {
    component: 'ExportBackupSection',
    note: 'Fase 6 (RF-10 exportar, D-48(a)): <section> com <form noValidate>: dois Controller → Field + PasswordInput (Senha, Confirmar senha), ErrorAlert da falha, <p role="status" tabIndex={-1}> do resultado e um único botão — "Exportar backup"/"Gerando backup…" (disabled={!canSubmit} — princípio 16) ou, com o arquivo à espera, "Salvar backup" (ref saveButtonRef, recebe o foco). Estado todo em useExportBackup; statusRef e saveButtonRef saem do objeto devolvido antes de ler o resto (regra react/refs).',
  },
  {
    component: 'ImportBackupSection',
    note: 'Fase 6 (RF-10 importar, D-48(b)): <section> com <form key={formKey} noValidate> (a key recria o formulário depois de importar, porque o <input type="file"> não se limpa pelo valor): Controller → Field + FileInput (accept "application/json,.json"), Controller → Field + PasswordInput (current-password), ErrorAlert do openError e "Importar backup"/"Verificando backup…". O <p role="status"> fica fora do <form> (sobrevive à recriação e recebe o foco — RNF-06) e o ConfirmImportDialog é irmão do formulário. Estado em useImportBackup.',
  },
  {
    component: 'ConfirmImportDialog',
    note: 'Fase 6 (RF-10, D-07, D-48(b)): Modal "Importar backup?" aberto quando summary ≠ null; Modal.Body com InfoList (Data do backup "17/10/2026 às 15:05", Lançamentos, Tags, Recorrentes — formatCount em pt-BR), o aviso "Isso vai substituir todos os dados atuais." em negrito e ErrorAlert da falha; Modal.Actions com "Cancelar" (secondary) e "Substituir dados"/"Substituindo…" (danger), ambos desabilitados durante a substituição. Sem estado.',
  },
  {
    component: 'BackupReminder',
    note: 'Fase 6 (RF-10 "Lembrete", D-11, D-48(c)): recebe today do HomePage; useLastBackupAt + useTransactionCount; nada enquanto carrega; com shouldShowBackupReminder, Notice subtle com a mensagem e o Link "Fazer backup" (44 px) para /ajustes/backup. Fica no topo do Início, antes do BalanceSummary.',
  },
]

/** Componentes locais (não importados) e o módulo de onde vêm. */
export const LOCAL_COMPONENT_ORIGINS: Readonly<Record<string, string>> = {
  ThemeRadio: 'src/components/ui/createRadioGroup.tsx',
  TypeRadio: 'src/components/ui/createRadioGroup.tsx',
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
    route: '/ajustes/tags',
    stateAndData:
      'Dados: useTagsWithTransactionCount (src/repositories/tagsRepository.ts, useLiveQuery) — undefined enquanto carrega (nada na tela), [] → EmptyState, senão TagList; criar/editar/excluir re-emitem a consulta e a lista atualiza sozinha. Estado da tela em useTagsScreen: dialog (closed | create | edit | confirm-delete | delete-blocked, uma união discriminada que decide qual Modal está aberto), pendingStep (checking-usage | deleting | null, desabilita o botão que disparou) e deleteError (mensagem em pt-BR no modal aberto). Estado do formulário em useTagForm (useForm com LIVE_VALIDATION + zodResolver(tagInputSchema), valores padrão da tag ou 1ª cor da paleta — D-32): erros de campo no formState (validação a cada alteração), canSubmit = canSubmitForm(formState) (princípio 16 / D-36) e saveError num useState à parte para a falha genérica de gravação.',
  },
  {
    route: '/',
    stateAndData:
      'HomePage guarda só o today de useToday (useSyncExternalStore; recalculado em visibilitychange, focus e pageshow — D-38(g)) e o passa ao BalanceSummary e ao RecentTransactions. Dados por useLiveQuery: useOverallBalance() (sem today — D-42) e useMonthTotals(período) (src/repositories/transactionsRepository.ts — D-39), useRecentTransactions(today, 5) (D-40) e useTags (tagsRepository); undefined enquanto carrega ("—" nos saldos, nada na lista). O formulário rápido tem estado próprio em useTransactionForm (useForm com LIVE_VALIDATION + zodResolver(transactionInputSchema); defaultValues Saída + hoje; saveError em useState; Toast por useToast; ref autoFilledDate para trocar a data na virada do dia só se ela ainda for a automática) e isCreatingTag no TransactionForm. Lançar grava por createTransaction e as três consultas ao vivo se atualizam sozinhas (CA-02.4). Fase 6: BackupReminder (topo) lê useLastBackupAt e useTransactionCount (useLiveQuery) e decide por shouldShowBackupReminder com o mesmo today; o 1º lançamento já faz o aviso aparecer se nunca houve backup.',
  },
  {
    route: '/lancamentos',
    stateAndData:
      'Árvore (D-45): Page.Header (trailing: NewTransactionLink) → FilterBar { .Text; .Actions { .Toggle, .Clear }; .Panel { .Type, .Tag (TagPicker com "Todas"), .Period (2 Field + DateInput) } } → FilterSummary (IncomeExpenseTotals + SignedAmount) → EmptyState → TransactionDayList { DaySection × N (IncomeExpenseTotals + TransactionRow showDate={false}), LoadMore }. Estado: os filtros ficam no Zustand (src/stores/uiStore.ts, transactionFilters, sem persist — D-45(f)); cada parte do FilterBar lê e grava o seu campo com seletor próprio; o painel aberto/fechado e o searchInputRef são estado local do FilterBar (FilterBarContext); a página da lista (itemTarget) é estado local do TransactionDayList, zerado pela troca de key (filtersKey) quando os filtros aplicados mudam. Dados: useTransactionList (src/features/transactions/useTransactionList.ts) lê os 5 campos, faz o debounce do texto (useDebouncedValue, 250 ms, "" na hora), calcula effectivePeriod, consulta useTransactionsInPeriod(from, to) (useLiveQuery no índice date; ordenado por sortByRecency no repositório), useTransactionCount e useTags, e monta summarizeTransactionList com os filtros aplicados (o React Compiler memoiza). Tag do filtro que sumiu (excluída) vale como "Todas" e setFilters({ tagId: null }) limpa o Zustand. undefined enquanto carrega: nada na tela (sem piscar estado vazio).',
  },
  {
    route: '/ajustes/backup',
    stateAndData:
      'Árvore: Page > Page.Header (leading: BackLink) > Page.Body > [ LastBackupStatus, ExportBackupSection (Field + PasswordInput × 2, ErrorAlert, status, Button "Exportar backup" ou "Salvar backup"), ImportBackupSection (Field + FileInput, Field + PasswordInput, ErrorAlert, Button; status fora do <form>; ConfirmImportDialog (Modal, InfoList, Button × 2)) ]. Sem estado na página. Exportação: useExportBackup — useForm com LIVE_VALIDATION + zodResolver(exportPasswordSchema) (a confirmação é reconferida quando a senha muda, por form.subscribe), state { message, error, pendingFile } e isDelivering em useState, statusRef e saveButtonRef; canSubmit = canSubmitForm && !isBusy (princípio 16). Importação: useImportBackup — useForm com zodResolver(importBackupSchema), openError (limpo por form.subscribe ao trocar arquivo ou senha), pending { content, summary }, isRestoring, restoreError, message (objeto novo a cada resultado, para refocar), formKey e statusRef; setPreference de useTheme aplica o tema importado. Dados: useLastBackupAt (useLiveQuery em settings.lastBackupAt) e as funções assíncronas do backupRepository (nenhum useLiveQuery para as tabelas de dados: a tela não as mostra).',
  },
  {
    route: '/lancamentos/novo',
    stateAndData:
      'Sem estado na página: todo o estado é do TransactionForm/useTransactionForm (o mesmo do Início). Tags por useTags.',
  },
  {
    route: '/lancamentos/:id',
    stateAndData:
      'useTransactionDetail(id): transaction por useTransaction (useLiveQuery: undefined carregando, null inexistente), isConfirmingDelete, isDeleting, isDone (tela saindo — não mostrar "não encontrado") e deleteError; goBack de useGoBack("/lancamentos"). O TransactionForm recebe key = id e transaction (defaultValues do lançamento, startsValid = true) e chama onUpdated (finish → goBack) depois de updateTransaction.',
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
      { id: 'css', label: 'index.css (folha única)', module: 'src/index.css' },
      { id: 'vite', label: 'vite.config.ts', module: 'vite.config.ts' },
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
        from: 'css',
        to: 'vite',
        label: "@import '@tailwind-sources'",
        detail:
          'A página não importa CSS próprio (D-43): usa a folha Tailwind única do app, src/index.css. O alias @tailwind-sources do vite.config.ts aponta, em vite serve, para src/styles/tailwind-sources.serve.css (sem @source: a detecção automática varre src/dev e gera as classes desta página).',
        refs: ['D-43'],
        kind: 'call',
      },
      {
        from: 'vite',
        to: 'css',
        label: 'build: tailwind-sources.build.css',
        detail:
          "Em vite build o mesmo alias aponta para src/styles/tailwind-sources.build.css (@source not '../dev'): nenhuma classe desta página entra no CSS do dist/ (§6.12). O teste src/styles/tailwindEntry.test.ts impede uma segunda folha com @import 'tailwindcss'.",
        refs: ['D-17', 'D-43'],
        kind: 'return',
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
          'loadSampleDataTools(): guard import.meta.env.DEV antes do import dinâmico; em produção vira código morto e src/dev não entra no dist/. Suspense fallback null; sem CSS próprio (folha Tailwind única do app — D-43).',
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
  {
    id: 'tag-create',
    title: 'Criar tag (validação ao digitar — princípio 16; nome único — CA-03.4)',
    summary:
      '"Nova tag" abre o TagFormDialog. useTagForm usa useForm com LIVE_VALIDATION (mode onChange) e zodResolver(tagInputSchema) (nome 1–30 em UTF-16 — D-35, cor #RRGGBB em maiúsculas — D-32): a cada alteração o Zod revalida, o RHF atualiza errors/isValid e canSubmitForm (src/lib/formSubmit.ts) decide se "Salvar" fica ativo (válido e fora do envio — princípio 16, D-36). Com nome vazio o botão já abre desabilitado, sem erro na tela; o erro aparece abaixo do campo enquanto o usuário digita. Salvar chama createTag, que calcula o nameKey (toTagNameKey) e grava com db.tags.add. Não há leitura prévia: o índice único &nameKey é a única checagem, e a ConstraintError vira DuplicateTagNameError → setError("name") (erro no campo; o botão volta quando o nome muda). Qualquer outra falha vai para saveError, um estado à parte: o setError do RHF 7.90 força isValid=false e desabilitaria o "Salvar" sem chance de tentar de novo. Sucesso fecha o modal e o useLiveQuery atualiza a lista.',
    requirements: ['RF-03', 'CA-03.1', 'CA-03.4', 'CA-03.6', 'D-32', 'D-33', 'D-35', 'D-36'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'page', label: 'TagsPage', module: 'src/features/tags/TagsPage.tsx' },
      { id: 'screen', label: 'useTagsScreen', module: 'src/features/tags/useTagsScreen.ts' },
      { id: 'dialog', label: 'TagFormDialog', module: 'src/features/tags/TagFormDialog.tsx' },
      { id: 'form', label: 'TagForm', module: 'src/components/tags/TagForm.tsx' },
      { id: 'formHook', label: 'useTagForm (RHF)', module: 'src/components/tags/useTagForm.ts' },
      { id: 'schema', label: 'tagInputSchema (zod)', module: 'src/domain/tagSchema.ts' },
      { id: 'submitRule', label: 'canSubmitForm', module: 'src/lib/formSubmit.ts' },
      { id: 'button', label: 'Button "Salvar"', module: 'src/components/ui/Button.tsx' },
      { id: 'repo', label: 'tagsRepository', module: 'src/repositories/tagsRepository.ts' },
      { id: 'tags', label: 'domain/tags', module: 'src/domain/tags.ts' },
      { id: 'dexie', label: 'Dexie: tags', module: 'src/db/database.ts' },
    ],
    steps: [
      {
        from: 'user',
        to: 'page',
        label: 'toca "Nova tag"',
        detail: 'Button primary no Page.Body.',
        refs: ['RF-03'],
        kind: 'event',
      },
      {
        from: 'page',
        to: 'screen',
        label: 'openCreate()',
        detail: "dialog = { kind: 'create' }; limpa deleteError.",
        refs: [],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'dialog',
        label: 'open, tag = undefined',
        detail:
          'Modal "Nova tag" (showModal — D-33). TagForm com key "new": valores padrão nome vazio e a 1ª cor da paleta (Vermelho #DC2626 — D-32).',
        refs: ['D-32', 'D-33'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'button',
        label: 'abre desabilitado (isValid = false)',
        detail:
          'Nome obrigatório ainda vazio: canSubmit = false e nenhum erro na tela, porque o campo não foi tocado (princípio 16).',
        refs: ['D-36'],
        kind: 'return',
      },
      {
        from: 'user',
        to: 'form',
        label: 'digita o nome / escolhe a cor',
        detail:
          'Rádio da paleta ou <input type="color"> pelo Controller; a prévia TagChip (wrap) acompanha por useWatch, com texto legível pela luminância (CA-03.6).',
        refs: ['CA-03.6'],
        kind: 'event',
      },
      {
        from: 'form',
        to: 'formHook',
        label: 'onChange (register / Controller)',
        detail: 'LIVE_VALIDATION = { mode: "onChange" }: cada alteração dispara a validação.',
        refs: ['D-36'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'schema',
        label: 'zodResolver(tagInputSchema) a cada alteração',
        detail:
          'trim; "Informe o nome da tag" se vazio; máximo de 30 unidades UTF-16 (D-35); cor #RRGGBB → maiúsculas. O resultado vira formState.errors e formState.isValid.',
        refs: ['RF-03', 'D-35'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'submitRule',
        label: 'canSubmitForm({ isValid, isSubmitting })',
        detail:
          'Regra pura: isValid && !isSubmitting. useTagForm devolve o resultado como canSubmit.',
        refs: ['D-36'],
        kind: 'call',
      },
      {
        from: 'submitRule',
        to: 'form',
        label: 'canSubmit + errors.name',
        detail:
          'Inválido: erro abaixo do campo enquanto digita (aria-invalid, aria-describedby) e "Salvar" desabilitado. Válido: erro some e o botão ativa.',
        refs: ['D-36'],
        kind: 'return',
      },
      {
        from: 'form',
        to: 'button',
        label: 'disabled={!canSubmit}',
        detail:
          'disabled nativo (anunciado pelo leitor de tela) com o estilo cinza neutro do Button, contraste AA nos dois temas.',
        refs: ['RNF-06', 'D-36'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'button',
        label: 'toca "Salvar" (só se ativo)',
        detail:
          'Enter no campo também envia o <form>; handleSubmit revalida antes de chamar o envio.',
        refs: ['CA-03.1'],
        kind: 'event',
      },
      {
        from: 'form',
        to: 'formHook',
        label: 'submit (handleSubmit)',
        detail:
          'isSubmitting = true → canSubmitForm = false: "Salvar" desabilitado durante o envio (evita gravar duas vezes). Limpa saveError.',
        refs: ['D-36'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'repo',
        label: 'createTag(values)',
        detail: 'Sem tag em edição → criar.',
        refs: ['CA-03.1'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'tags',
        label: 'toTagNameKey(name)',
        detail:
          'O repositório revalida com tagInputSchema.parse e calcula nameKey: NFD, remove \\p{M}, minúsculas, trim no fim ("Mércado " → "mercado").',
        refs: ['CA-03.4'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: 'tags.add({ id: randomUUID, … })',
        detail: 'createdAt = updatedAt = agora. Uma única escrita, sem leitura prévia.',
        refs: ['CA-03.1'],
        kind: 'call',
      },
      {
        from: 'dexie',
        to: 'repo',
        label: 'ConstraintError (&nameKey)',
        detail:
          'Nome repetido, inclusive com outra caixa/acentos ou gravado por outra aba ao mesmo tempo. isUniqueConstraintError olha error.name e error.inner.',
        refs: ['CA-03.4'],
        kind: 'return',
      },
      {
        from: 'repo',
        to: 'formHook',
        label: 'nome repetido → setError("name")',
        detail:
          'DuplicateTagNameError → "Já existe uma tag com esse nome" abaixo do campo, com foco nele. O setError deixa isValid = false: "Salvar" fica desabilitado até o usuário alterar o nome (a revalidação onChange limpa o erro).',
        refs: ['CA-03.4', 'D-36'],
        kind: 'return',
      },
      {
        from: 'repo',
        to: 'formHook',
        label: 'outra falha → saveError',
        detail:
          'Erro do IndexedDB (ou TagNotFoundError na edição) vira saveError, um useState à parte, mostrado no ErrorAlert do Modal.Body: "Não foi possível salvar a tag. Tente de novo." Fica fora do setError para não forçar isValid = false: "Salvar" continua ativo para tentar de novo.',
        refs: ['D-33', 'D-36'],
        kind: 'return',
      },
      {
        from: 'formHook',
        to: 'dialog',
        label: 'onSaved() → close',
        detail: 'No sucesso o modal fecha (dialog = closed).',
        refs: [],
        kind: 'return',
      },
      {
        from: 'dexie',
        to: 'page',
        label: 'liveQuery re-emite a lista',
        detail:
          'useTagsWithTransactionCount entrega a nova lista ordenada por nome; a tag aparece com "Nenhum lançamento".',
        refs: ['CA-03.5'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/tags/TagsPage.test.tsx',
      'src/features/tags/TagsPage.validation.test.tsx',
      'src/features/tags/TagsPage.errors.test.tsx',
      'src/lib/formSubmit.test.ts',
      'src/repositories/tagsRepository.test.ts',
      'src/domain/tags.test.ts',
      'src/domain/tagSchema.test.ts',
      'src/components/ui/TagChip.test.tsx',
      'src/components/ui/Modal.test.tsx',
    ],
  },
  {
    id: 'tag-edit',
    title: 'Editar tag (renomear e trocar a cor — CA-03.1, princípio 16)',
    summary:
      'Tocar numa tag da lista abre o modal "Editar tag" com os valores dela; como os valores iniciais já são válidos, "Salvar" abre ativo. A validação a cada alteração é a mesma do criar (LIVE_VALIDATION + zodResolver → isValid → canSubmitForm): apagar o nome mostra o erro e desabilita o botão na hora. Salvar chama updateTag, que lê e grava numa transação rw (get → put): se a tag sumiu (outra aba), TagNotFoundError → saveError; nome igual ao de outra tag, DuplicateTagNameError → erro no campo. Os lançamentos guardam só o tagId, então a mudança aparece em todas as telas.',
    requirements: ['RF-03', 'CA-03.1', 'CA-03.4', 'D-36'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'list', label: 'TagList', module: 'src/features/tags/TagList.tsx' },
      { id: 'screen', label: 'useTagsScreen', module: 'src/features/tags/useTagsScreen.ts' },
      { id: 'dialog', label: 'TagFormDialog', module: 'src/features/tags/TagFormDialog.tsx' },
      { id: 'form', label: 'TagForm', module: 'src/components/tags/TagForm.tsx' },
      { id: 'formHook', label: 'useTagForm (RHF)', module: 'src/components/tags/useTagForm.ts' },
      { id: 'schema', label: 'tagInputSchema (zod)', module: 'src/domain/tagSchema.ts' },
      { id: 'submitRule', label: 'canSubmitForm', module: 'src/lib/formSubmit.ts' },
      { id: 'repo', label: 'tagsRepository', module: 'src/repositories/tagsRepository.ts' },
      { id: 'dexie', label: 'Dexie: tags', module: 'src/db/database.ts' },
    ],
    steps: [
      {
        from: 'user',
        to: 'list',
        label: 'toca na tag',
        detail: 'Linha inteira é um botão (≥ 44 px).',
        refs: [],
        kind: 'event',
      },
      {
        from: 'list',
        to: 'screen',
        label: 'onSelect → openEdit(tag)',
        detail: "dialog = { kind: 'edit', tag }.",
        refs: [],
        kind: 'call',
      },
      {
        from: 'screen',
        to: 'dialog',
        label: 'Modal "Editar tag"',
        detail:
          'TagForm com key = tag.id (trocar de tag recria o formulário) e o botão "Excluir tag" como extraAction. Valores iniciais válidos: "Salvar" ativo.',
        refs: ['D-33', 'D-36'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'form',
        label: 'altera nome/cor',
        detail: 'Cada alteração passa pelo register/Controller (mode onChange).',
        refs: ['CA-03.1'],
        kind: 'event',
      },
      {
        from: 'formHook',
        to: 'schema',
        label: 'zodResolver a cada alteração',
        detail:
          'Mesma validação do criar: nome vazio ou com mais de 30 unidades UTF-16 é inválido.',
        refs: ['RF-03', 'D-35'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'submitRule',
        label: 'canSubmitForm → canSubmit',
        detail:
          'Inválido: erro abaixo do campo e "Salvar" desabilitado; corrigido: botão volta a ativar.',
        refs: ['D-36'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'form',
        label: 'Salvar',
        detail: 'handleSubmit; isSubmitting desabilita o botão durante o envio.',
        refs: ['D-36'],
        kind: 'event',
      },
      {
        from: 'formHook',
        to: 'repo',
        label: 'updateTag(id, values)',
        detail: 'Revalida e recalcula nameKey antes da transação.',
        refs: ['CA-03.1'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('rw', tags): get → put",
        detail:
          'Mantém id e createdAt; novo updatedAt. Renomear "Lazer" para "LAZER" é permitido (mesmo registro com o mesmo nameKey).',
        refs: ['CA-03.1'],
        kind: 'call',
      },
      {
        from: 'dexie',
        to: 'repo',
        label: 'ConstraintError → DuplicateTagNameError',
        detail:
          'Nome de outra tag: setError("name") abaixo do campo (CA-03.4); "Salvar" desabilitado até o nome mudar.',
        refs: ['CA-03.4', 'D-36'],
        kind: 'return',
      },
      {
        from: 'repo',
        to: 'formHook',
        label: 'TagNotFoundError / falha → saveError',
        detail:
          'Sem registro (apagada em outra aba) → "Esta tag não existe mais."; outra falha → "Não foi possível salvar a tag. Tente de novo." No ErrorAlert, fora do setError: "Salvar" continua ativo.',
        refs: ['D-33', 'D-36'],
        kind: 'return',
      },
      {
        from: 'dexie',
        to: 'list',
        label: 'liveQuery re-emite',
        detail: 'A lista reordena pelo nome novo e o chip troca de cor; o modal fecha (onSaved).',
        refs: ['CA-03.1', 'CA-03.5'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/tags/TagsPage.test.tsx',
      'src/features/tags/TagsPage.validation.test.tsx',
      'src/features/tags/TagsPage.errors.test.tsx',
      'src/lib/formSubmit.test.ts',
      'src/repositories/tagsRepository.test.ts',
    ],
  },
  {
    id: 'tag-delete',
    title: 'Excluir tag com bloqueio por uso (D-02)',
    summary:
      '"Excluir tag" no modal de edição confere o uso antes de pedir confirmação (getTagUsage): em uso → aviso de bloqueio com as contagens; sem uso → confirmação. Confirmar chama deleteTag, que reconta e exclui na mesma transação rw sobre as 4 tabelas (algo pode ter passado a usar a tag no meio do caminho) e devolve deleted ou in-use. pendingStep desabilita o botão que disparou a operação; falhas do IndexedDB aparecem como ErrorAlert em pt-BR no modal aberto.',
    requirements: ['RF-03', 'CA-03.2', 'CA-03.3', 'D-02', 'D-33'],
    participants: [
      { id: 'user', label: 'Usuário' },
      { id: 'dialog', label: 'TagFormDialog', module: 'src/features/tags/TagFormDialog.tsx' },
      { id: 'screen', label: 'useTagsScreen', module: 'src/features/tags/useTagsScreen.ts' },
      { id: 'repo', label: 'tagsRepository', module: 'src/repositories/tagsRepository.ts' },
      { id: 'tags', label: 'domain/tags', module: 'src/domain/tags.ts' },
      { id: 'dexie', label: 'Dexie: 4 tabelas', module: 'src/db/database.ts' },
      {
        id: 'blocked',
        label: 'DeleteTagBlockedDialog',
        module: 'src/features/tags/DeleteTagBlockedDialog.tsx',
      },
      {
        id: 'confirm',
        label: 'ConfirmDeleteTagDialog',
        module: 'src/features/tags/ConfirmDeleteTagDialog.tsx',
      },
    ],
    steps: [
      {
        from: 'user',
        to: 'dialog',
        label: 'toca "Excluir tag"',
        detail: 'Button danger-outline, só na edição.',
        refs: ['CA-03.3'],
        kind: 'event',
      },
      {
        from: 'dialog',
        to: 'screen',
        label: 'requestDelete(tag)',
        detail:
          "pendingStep = 'checking-usage': o botão fica desabilitado (isCheckingUsage) até a resposta.",
        refs: ['D-33'],
        kind: 'call',
      },
      {
        from: 'screen',
        to: 'repo',
        label: 'getTagUsage(id)',
        detail: 'Três contagens em paralelo (Promise.all).',
        refs: ['D-02'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transactions.where('tagId').count() + filter().count() ×2",
        detail:
          'transactions pelo índice tagId (IDBIndex.count); recurrings e installmentGroups não têm índice tagId na v1 (§6.4) e usam filter — tabelas pequenas.',
        refs: ['D-02'],
        kind: 'call',
      },
      {
        from: 'screen',
        to: 'tags',
        label: 'isTagInUse(usage)',
        detail: 'Soma das três contagens > 0.',
        refs: ['CA-03.2'],
        kind: 'call',
      },
      {
        from: 'screen',
        to: 'blocked',
        label: 'em uso → "Não é possível excluir"',
        detail:
          'formatTagUsage: "3 lançamentos, 1 recorrente e 2 parcelamentos" (só o que for > 0, Intl.ListFormat). Só "Entendi".',
        refs: ['CA-03.2', 'D-02'],
        kind: 'call',
      },
      {
        from: 'screen',
        to: 'confirm',
        label: 'sem uso → "Excluir tag?"',
        detail: 'O modal de edição fecha e abre a confirmação.',
        refs: ['CA-03.3'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'confirm',
        label: 'toca "Excluir"',
        detail: "confirmDelete(tag); pendingStep = 'deleting' desabilita o botão (isDeleting).",
        refs: ['CA-03.3'],
        kind: 'event',
      },
      {
        from: 'screen',
        to: 'repo',
        label: 'deleteTag(id)',
        detail: 'Resultado { status: deleted } ou { status: in-use, usage }.',
        refs: ['CA-03.3', 'D-02'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('rw', 4 tabelas): conta → delete",
        detail:
          'tags, transactions, recurrings e installmentGroups na mesma transação (princípio 8): nada passa a usar a tag entre a contagem e a exclusão.',
        refs: ['D-02'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'screen',
        label: 'deleted → closed | in-use → bloqueio',
        detail:
          'deleted: fecha o modal e a lista ao vivo perde a tag. in-use: abre o DeleteTagBlockedDialog com as contagens novas.',
        refs: ['CA-03.2', 'CA-03.3'],
        kind: 'return',
      },
      {
        from: 'screen',
        to: 'confirm',
        label: 'falha → deleteError',
        detail:
          'Erro do IndexedDB ao conferir ("Não foi possível verificar se a tag está em uso. Tente de novo.", no TagFormDialog via notice) ou ao excluir ("Não foi possível excluir a tag. Tente de novo."): ErrorAlert com role="alert" no modal aberto; pendingStep volta a null.',
        refs: ['D-33'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/tags/TagsPage.test.tsx',
      'src/features/tags/TagsPage.errors.test.tsx',
      'src/repositories/tagsRepository.test.ts',
      'src/features/tags/tagTexts.test.ts',
      'src/domain/tags.test.ts',
    ],
  },
  {
    id: 'tag-list',
    title: 'Lista de tags com contagem de lançamentos (CA-03.5)',
    summary:
      'A tela lê a lista ao vivo: useTagsWithTransactionCount → listTagsWithTransactionCount lê todas as tags, conta os lançamentos de cada uma pelo índice tagId (sem ler os lançamentos — RNF-02) e ordena por nome com Intl.Collator pt-BR (sortByTagName). Qualquer escrita nas tabelas tags ou transactions re-emite a consulta.',
    requirements: ['RF-03', 'CA-03.5', 'CA-03.6', 'RNF-02'],
    participants: [
      { id: 'page', label: 'TagsPage', module: 'src/features/tags/TagsPage.tsx' },
      { id: 'repo', label: 'tagsRepository', module: 'src/repositories/tagsRepository.ts' },
      { id: 'dexie', label: 'Dexie: tags + transactions', module: 'src/db/database.ts' },
      { id: 'tags', label: 'domain/tags', module: 'src/domain/tags.ts' },
      { id: 'list', label: 'TagList', module: 'src/features/tags/TagList.tsx' },
      { id: 'texts', label: 'tagTexts', module: 'src/features/tags/tagTexts.ts' },
      { id: 'chip', label: 'TagChip', module: 'src/components/ui/TagChip.tsx' },
    ],
    steps: [
      {
        from: 'page',
        to: 'repo',
        label: 'useTagsWithTransactionCount()',
        detail: 'useLiveQuery(listTagsWithTransactionCount); undefined enquanto carrega.',
        refs: ['CA-03.5'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: 'tags.toArray()',
        detail: 'Tabela pequena, lida inteira.',
        refs: ['CA-03.5'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transactions.where('tagId').equals(id).count() por tag",
        detail: 'IDBIndex.count, em paralelo; continua rápido com 10.000 lançamentos (RNF-02).',
        refs: ['CA-03.5', 'RNF-02'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'tags',
        label: 'sortByTagName(items)',
        detail:
          'Intl.Collator("pt-BR", sensitivity base, numeric): "Água" entre "Academia" e "Banco"; nova lista (toSorted).',
        refs: ['CA-03.5'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'page',
        label: 'TagWithTransactionCount[]',
        detail: '[] → EmptyState; senão TagList.',
        refs: ['CA-03.5'],
        kind: 'return',
      },
      {
        from: 'page',
        to: 'list',
        label: 'items, onSelect = openEdit',
        detail: 'Uma linha por tag.',
        refs: [],
        kind: 'call',
      },
      {
        from: 'list',
        to: 'chip',
        label: 'TagChip overflow="wrap"',
        detail:
          'Nome inteiro (até 30 letras sem espaço quebram em 375 px) e texto legível (CA-03.6).',
        refs: ['CA-03.6'],
        kind: 'call',
      },
      {
        from: 'list',
        to: 'texts',
        label: 'formatTransactionCount(n)',
        detail: '"Nenhum lançamento", "1 lançamento", "5.000 lançamentos".',
        refs: ['CA-03.5'],
        kind: 'call',
      },
    ],
    tests: [
      'src/features/tags/TagsPage.test.tsx',
      'src/repositories/tagsRepository.test.ts',
      'src/features/tags/tagTexts.test.ts',
      'src/components/ui/TagChip.test.tsx',
    ],
  },
  {
    id: 'transaction-create',
    title: 'Lançar transação (Início ou /lancamentos/novo)',
    summary:
      'O TransactionForm valida a cada alteração (LIVE_VALIDATION + zodResolver(transactionInputSchema)) e só ativa "Lançar" com tudo válido e fora do envio (canSubmitForm — princípio 16, D-36). O envio chama useTransactionForm.submit → createTransaction, que revalida com o mesmo schema e grava numa transação rw [tags, transactions] conferindo a tag (assertTagExists — D-01/D-02, D-39). Depois do sucesso o formulário é limpo mantendo tipo e data (valor, tag e descrição vazios — D-38(b)), o Toast mostra "Lançamento salvo" por 3 s e os useLiveQuery do Início reemitem: saldo geral, saldo do mês e últimos 5 se atualizam sem recarregar (CA-01.1, CA-02.4).',
    requirements: [
      'RF-01',
      'CA-01.1',
      'CA-01.2',
      'CA-01.3',
      'CA-01.4',
      'CA-02.4',
      'D-01',
      'D-10',
      'D-31',
      'D-36',
      'D-38',
      'D-39',
    ],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'form',
        label: 'TransactionForm',
        module: 'src/components/transactions/TransactionForm.tsx',
      },
      { id: 'money', label: 'MoneyInput', module: 'src/components/ui/MoneyInput.tsx' },
      {
        id: 'formHook',
        label: 'useTransactionForm (RHF)',
        module: 'src/components/transactions/useTransactionForm.ts',
      },
      {
        id: 'schema',
        label: 'transactionInputSchema (zod)',
        module: 'src/domain/transactionSchema.ts',
      },
      { id: 'submitRule', label: 'canSubmitForm', module: 'src/lib/formSubmit.ts' },
      {
        id: 'repo',
        label: 'transactionsRepository',
        module: 'src/repositories/transactionsRepository.ts',
      },
      { id: 'dexie', label: 'Dexie: tags + transactions', module: 'src/db/database.ts' },
      { id: 'toast', label: 'Toast / useToast', module: 'src/components/ui/Toast.tsx' },
      { id: 'home', label: 'HomePage (useLiveQuery)', module: 'src/features/home/HomePage.tsx' },
    ],
    steps: [
      {
        from: 'formHook',
        to: 'form',
        label: 'defaultValues: Saída + hoje',
        detail:
          'emptyValues("expense", useToday()); valor 0 (campo vazio com o exemplo "R$ 0,00"), tag e descrição vazias. "Lançar" abre desabilitado, sem erro na tela.',
        refs: ['RF-01', 'CA-02.2', 'D-36'],
        kind: 'return',
      },
      {
        from: 'user',
        to: 'money',
        label: 'digita 1, 9, 9, 9',
        detail:
          'Teclado numérico (inputMode="numeric"); os dígitos entram pela direita: "R$ 19,99" e 1999 centavos (digitsToCents, no máximo 10 dígitos — D-31); cursor sempre no fim (D-38(d)).',
        refs: ['CA-01.3', 'CA-01.4', 'D-31', 'D-38'],
        kind: 'event',
      },
      {
        from: 'money',
        to: 'formHook',
        label: 'onChange(cents) via Controller',
        detail:
          'Todos os campos são controlados (Controller), inclusive a descrição: o React Compiler memoiza o ref do register e o reset não limparia o campo (D-39). Tipo (TypeRadio segmented), data (DateInput), tag (TagPicker) e descrição (TextInput) seguem o mesmo caminho.',
        refs: ['D-39'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'schema',
        label: 'zodResolver a cada alteração',
        detail:
          'Valor inteiro 1..9.999.999.999; data YYYY-MM-DD existente (isValidDate); tag não vazia; descrição com trim, 1 a 100 unidades UTF-16 (D-10, D-38(h)). Erros em pt-BR abaixo do campo (Field.Error, aria-invalid — CA-01.2).',
        refs: ['RF-01', 'CA-01.2', 'D-10', 'D-38'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'submitRule',
        label: 'canSubmitForm(formState)',
        detail: 'isValid && !isSubmitting → canSubmit; "Lançar" com disabled={!canSubmit}.',
        refs: ['D-36'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'form',
        label: 'toca "Lançar" (só se ativo)',
        detail: '<form onSubmit={submit} noValidate>; handleSubmit revalida antes de enviar.',
        refs: ['CA-01.1'],
        kind: 'event',
      },
      {
        from: 'formHook',
        to: 'repo',
        label: 'createTransaction(values)',
        detail:
          'O repositório faz transactionInputSchema.parse de novo (defesa em profundidade), gera id (crypto.randomUUID — princípio 9), vínculos nulos e createdAt/updatedAt.',
        refs: ['RF-01'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('rw', [tags, transactions])",
        detail:
          'assertTagExists (where("id").equals(tagId).count()) e transactions.add na mesma transação: a tag não pode ser excluída entre a checagem e a gravação (D-01/D-02, D-39). Tag inexistente → TransactionTagNotFoundError.',
        refs: ['D-01', 'D-02', 'D-39'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'form',
        label: 'reset(tipo e data mantidos)',
        detail:
          'emptyValues(values.type, values.date): valor, tag e descrição vazios; o botão volta a desabilitar. Falha → saveError (ErrorAlert, botão continua ativo — D-36).',
        refs: ['CA-01.1', 'D-36', 'D-38'],
        kind: 'return',
      },
      {
        from: 'formHook',
        to: 'toast',
        label: 'toast.show("Lançamento salvo")',
        detail:
          'role="status" no topo, 3 s (TOAST_DURATION_MS); não cobre a barra inferior nem o teclado (D-38(b)).',
        refs: ['D-38'],
        kind: 'call',
      },
      {
        from: 'dexie',
        to: 'home',
        label: 'useLiveQuery reemite',
        detail:
          'useOverallBalance, useMonthTotals e useRecentTransactions(today, 5) observam a tabela transactions e se atualizam sem recarregar.',
        refs: ['CA-02.4'],
        kind: 'event',
      },
    ],
    tests: [
      'src/features/home/HomePage.test.tsx',
      'src/features/home/HomePage.form.test.tsx',
      'src/components/ui/MoneyInput.test.tsx',
      'src/domain/transactionSchema.test.ts',
      'src/repositories/transactionsRepository.crud.test.ts',
      'src/repositories/transactionsRepository.test.ts',
    ],
  },
  {
    id: 'transaction-edit',
    title: 'Editar lançamento',
    summary:
      'Tocar numa linha dos últimos lançamentos abre /lancamentos/:id. useTransactionDetail lê o lançamento ao vivo; o TransactionForm abre com os dados salvos e "Salvar" já ativo (startsValid — princípio 16). Salvar chama updateTransaction, que regrava os campos editáveis numa transação rw [tags, transactions] mantendo os vínculos, e a tela volta para a anterior (useGoBack, tela pai /lancamentos — D-38(c)). Todas as telas com useLiveQuery refletem a alteração (CA-01.5).',
    requirements: ['RF-01', 'CA-01.5', 'D-36', 'D-38', 'D-39'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'row',
        label: 'TransactionRow',
        module: 'src/components/transactions/TransactionRow.tsx',
      },
      {
        id: 'page',
        label: 'TransactionDetailPage',
        module: 'src/features/transactions/TransactionDetailPage.tsx',
      },
      {
        id: 'detail',
        label: 'useTransactionDetail',
        module: 'src/features/transactions/useTransactionDetail.ts',
      },
      {
        id: 'form',
        label: 'TransactionForm',
        module: 'src/components/transactions/TransactionForm.tsx',
      },
      {
        id: 'formHook',
        label: 'useTransactionForm',
        module: 'src/components/transactions/useTransactionForm.ts',
      },
      {
        id: 'repo',
        label: 'transactionsRepository',
        module: 'src/repositories/transactionsRepository.ts',
      },
      { id: 'dexie', label: 'Dexie: tags + transactions', module: 'src/db/database.ts' },
      { id: 'back', label: 'useGoBack', module: 'src/components/ui/useGoBack.ts' },
    ],
    steps: [
      {
        from: 'user',
        to: 'row',
        label: 'toca no lançamento',
        detail: 'Link para /lancamentos/:id (rota lazy).',
        refs: ['CA-01.5'],
        kind: 'event',
      },
      {
        from: 'page',
        to: 'detail',
        label: 'useTransactionDetail(id)',
        detail:
          'useTransaction(id) (useLiveQuery): undefined carregando, null inexistente → EmptyState "Lançamento não encontrado" (D-38(c)).',
        refs: ['D-38'],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'form',
        label: 'transaction, onUpdated, extraAction "Excluir"',
        detail:
          'key = id; defaultValues do lançamento; startsValid = true, então "Salvar" já começa ativo (canSubmitForm com startsValid).',
        refs: ['D-36'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'form',
        label: 'altera um campo e toca "Salvar"',
        detail: 'Mesma validação a cada alteração do fluxo de lançar.',
        refs: ['CA-01.5'],
        kind: 'event',
      },
      {
        from: 'formHook',
        to: 'repo',
        label: 'updateTransaction(id, values)',
        detail: 'Revalida com transactionInputSchema.parse.',
        refs: ['RF-01'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('rw', [tags, transactions]): get → assertTagExists → put",
        detail:
          'Lançamento apagado em outra aba → TransactionNotFoundError; tag apagada → TransactionTagNotFoundError (mensagens em saveError). Vínculos de recorrente/parcela e createdAt mantidos; updatedAt renovado.',
        refs: ['D-01', 'D-39'],
        kind: 'call',
      },
      {
        from: 'formHook',
        to: 'detail',
        label: 'onUpdated → finish()',
        detail: 'isDone = true (não pisca "não encontrado") e goBack().',
        refs: ['D-38'],
        kind: 'return',
      },
      {
        from: 'detail',
        to: 'back',
        label: 'goBack("/lancamentos")',
        detail:
          'Volta no histórico; aberto direto pela URL (location.key "default") vai para /lancamentos (CA-13.2).',
        refs: ['CA-13.2', 'D-38'],
        kind: 'call',
      },
    ],
    tests: [
      'src/features/transactions/TransactionDetailPage.test.tsx',
      'src/repositories/transactionsRepository.crud.test.ts',
      'src/lib/formSubmit.test.ts',
    ],
  },
  {
    id: 'transaction-delete',
    title: 'Excluir lançamento (com confirmação)',
    summary:
      '"Excluir" na edição abre o modal "Excluir lançamento?" (ConfirmDeleteTransactionDialog, <dialog> nativo — D-33). Confirmar chama deleteTransaction e volta para a tela anterior (D-38(c)); falha mostra ErrorAlert no modal e mantém a tela. Os saldos e a lista do Início se atualizam pelo useLiveQuery (CA-01.6). As regras de recorrentes e parcelas chegam nas Fases 9 e 10.',
    requirements: ['RF-01', 'CA-01.6', 'D-33', 'D-38'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'page',
        label: 'TransactionDetailPage',
        module: 'src/features/transactions/TransactionDetailPage.tsx',
      },
      {
        id: 'detail',
        label: 'useTransactionDetail',
        module: 'src/features/transactions/useTransactionDetail.ts',
      },
      {
        id: 'dialog',
        label: 'ConfirmDeleteTransactionDialog',
        module: 'src/features/transactions/ConfirmDeleteTransactionDialog.tsx',
      },
      {
        id: 'repo',
        label: 'transactionsRepository',
        module: 'src/repositories/transactionsRepository.ts',
      },
      { id: 'dexie', label: 'Dexie: transactions', module: 'src/db/database.ts' },
      { id: 'back', label: 'useGoBack', module: 'src/components/ui/useGoBack.ts' },
    ],
    steps: [
      {
        from: 'user',
        to: 'page',
        label: 'toca "Excluir"',
        detail: 'Button danger-outline passado como extraAction do TransactionForm.',
        refs: ['CA-01.6'],
        kind: 'event',
      },
      {
        from: 'page',
        to: 'detail',
        label: 'requestDelete()',
        detail: 'Limpa deleteError e isConfirmingDelete = true.',
        refs: [],
        kind: 'call',
      },
      {
        from: 'page',
        to: 'dialog',
        label: 'open, description',
        detail: 'Modal "Excluir lançamento?" com a descrição; Esc/Cancelar → cancelDelete.',
        refs: ['D-33'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'dialog',
        label: 'confirma "Excluir"',
        detail: 'Desabilitado enquanto isDeleting.',
        refs: ['CA-01.6'],
        kind: 'event',
      },
      {
        from: 'detail',
        to: 'repo',
        label: 'deleteTransaction(id)',
        detail: 'Exclusão simples (um registro: sem transação explícita).',
        refs: ['CA-01.6'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: 'transactions.delete(id)',
        detail: 'Falha → deleteError "Não foi possível excluir o lançamento. Tente de novo."',
        refs: [],
        kind: 'call',
      },
      {
        from: 'detail',
        to: 'back',
        label: 'finish() → goBack',
        detail: 'Fecha o modal, isDone = true e volta (tela pai /lancamentos).',
        refs: ['D-38'],
        kind: 'call',
      },
    ],
    tests: [
      'src/features/transactions/TransactionDetailPage.test.tsx',
      'src/repositories/transactionsRepository.crud.test.ts',
    ],
  },
  {
    id: 'transaction-create-tag-shortcut',
    title: 'Criar tag sem perder o formulário (CA-01.7)',
    summary:
      'Sem nenhuma tag, o TagPicker mostra o NoTagsNotice no lugar das opções. "Criar tag" abre o CreateTagDialog, renderizado fora do <form> do lançamento (formulários aninhados não são válidos). Ele reutiliza o TagForm de components/tags (D-37) com toda a validação do fluxo "Criar tag"; createTag grava, onSaved(tag) entrega a Tag e o TransactionForm a seleciona com setValue("tagId"). O que já foi digitado no lançamento continua lá; useTags (useLiveQuery) faz a lista de chips aparecer.',
    requirements: ['RF-01', 'CA-01.7', 'RF-03', 'CA-03.4', 'D-36', 'D-37'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'form',
        label: 'TransactionForm',
        module: 'src/components/transactions/TransactionForm.tsx',
      },
      { id: 'picker', label: 'TagPicker', module: 'src/components/tags/TagPicker.tsx' },
      {
        id: 'notice',
        label: 'NoTagsNotice',
        module: 'src/components/transactions/NoTagsNotice.tsx',
      },
      {
        id: 'dialog',
        label: 'CreateTagDialog',
        module: 'src/components/tags/CreateTagDialog.tsx',
      },
      { id: 'tagForm', label: 'TagForm', module: 'src/components/tags/TagForm.tsx' },
      { id: 'tagHook', label: 'useTagForm', module: 'src/components/tags/useTagForm.ts' },
      { id: 'repo', label: 'tagsRepository', module: 'src/repositories/tagsRepository.ts' },
      { id: 'dexie', label: 'Dexie: tags', module: 'src/db/database.ts' },
    ],
    steps: [
      {
        from: 'repo',
        to: 'form',
        label: 'useTags() → []',
        detail: 'Enquanto carrega (undefined) o campo de tag não aparece, para o aviso não piscar.',
        refs: ['CA-01.7'],
        kind: 'return',
      },
      {
        from: 'form',
        to: 'picker',
        label: 'tags = [], emptyState = <NoTagsNotice>',
        detail: 'Slot emptyState: o TagPicker não sabe criar tags.',
        refs: ['CA-01.7'],
        kind: 'call',
      },
      {
        from: 'picker',
        to: 'notice',
        label: 'renderiza o aviso',
        detail: '"Você ainda não tem nenhuma tag… o que já foi digitado continua aqui."',
        refs: ['CA-01.7'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'notice',
        label: 'toca "Criar tag"',
        detail: 'onCreateTag → setIsCreatingTag(true) no TransactionForm.',
        refs: ['CA-01.7'],
        kind: 'event',
      },
      {
        from: 'form',
        to: 'dialog',
        label: 'open (irmão do <form>)',
        detail:
          'Fora do <form> do lançamento: o envio do TagForm não dispara o do lançamento. Modal "Nova tag" (D-33).',
        refs: ['CA-01.7', 'D-33'],
        kind: 'call',
      },
      {
        from: 'dialog',
        to: 'tagForm',
        label: 'onSaved = onCreated',
        detail:
          'Mesmo TagForm de Ajustes → Tags (validação ao digitar, "Salvar" só válido — princípio 16; nome repetido no campo — CA-03.4).',
        refs: ['CA-03.4', 'D-36', 'D-37'],
        kind: 'call',
      },
      {
        from: 'tagHook',
        to: 'repo',
        label: 'createTag(values)',
        detail: 'add com &nameKey único; devolve a Tag gravada.',
        refs: ['RF-03'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: 'tags.add',
        detail: 'ConstraintError → DuplicateTagNameError → setError("name").',
        refs: ['CA-03.4'],
        kind: 'call',
      },
      {
        from: 'tagHook',
        to: 'form',
        label: 'onSaved(tag) → setValue("tagId", tag.id)',
        detail:
          'Fecha o modal e já escolhe a tag nova (shouldDirty, shouldValidate). Valor, data e descrição ficam como estavam.',
        refs: ['CA-01.7'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/home/HomePage.form.test.tsx',
      'src/components/tags/TagPicker.test.tsx',
      'src/repositories/tagsRepository.listTags.test.ts',
    ],
  },
  {
    id: 'home-balances',
    title: 'Saldos do Início (geral e do mês)',
    summary:
      'HomePage lê today de useToday e o passa ao BalanceSummary. O saldo geral soma todos os lançamentos, inclusive os de data futura e todas as parcelas desde a criação (D-42), sem depender de today: db.transactions.toArray() (a tabela inteira) + overallBalance do domínio (um getAll() nativo, mais rápido que um cursor each() com 10.000 lançamentos — D-39, RNF-02). O saldo do mês usa where("date").between(início, fim) + totals, então datas futuras do mês entram (CA-02.3). Os valores aparecem com sinal e cor (SignedAmount — CA-02.1).',
    requirements: ['RF-02', 'CA-02.1', 'CA-02.3', 'CA-02.4', 'D-38', 'D-39', 'D-42', 'RNF-02'],
    participants: [
      { id: 'home', label: 'HomePage', module: 'src/features/home/HomePage.tsx' },
      { id: 'today', label: 'useToday', module: 'src/components/ui/useToday.ts' },
      { id: 'summary', label: 'BalanceSummary', module: 'src/features/home/BalanceSummary.tsx' },
      {
        id: 'repo',
        label: 'transactionsRepository',
        module: 'src/repositories/transactionsRepository.ts',
      },
      { id: 'dexie', label: 'Dexie: transactions', module: 'src/db/database.ts' },
      { id: 'balances', label: 'domain/balances', module: 'src/domain/balances.ts' },
      { id: 'dates', label: 'domain/dates', module: 'src/domain/dates.ts' },
      { id: 'amount', label: 'SignedAmount', module: 'src/components/ui/SignedAmount.tsx' },
    ],
    steps: [
      {
        from: 'home',
        to: 'today',
        label: 'useToday()',
        detail: 'Data local YYYY-MM-DD (today() do domínio) por useSyncExternalStore.',
        refs: ['CA-02.2'],
        kind: 'call',
      },
      {
        from: 'home',
        to: 'summary',
        label: '<BalanceSummary today>',
        detail: 'periodOf(today) dá o mês corrente (YYYY-MM).',
        refs: ['RF-02'],
        kind: 'call',
      },
      {
        from: 'summary',
        to: 'repo',
        label: 'useOverallBalance()',
        detail:
          'useLiveQuery com deps []: não refaz a consulta na virada do dia, só quando a tabela muda.',
        refs: ['D-42'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: 'db.transactions.toArray()',
        detail: 'A tabela inteira; um getAll() nativo (D-39).',
        refs: ['D-39', 'D-42', 'RNF-02'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'balances',
        label: 'overallBalance(transactions)',
        detail: 'Soma inteira em centavos (princípio 1); datas futuras entram (D-42).',
        refs: ['D-42', 'CA-02.3'],
        kind: 'call',
      },
      {
        from: 'summary',
        to: 'repo',
        label: 'useMonthTotals(period)',
        detail: 'useLiveQuery com deps [period].',
        refs: ['RF-02'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dates',
        label: 'monthRange(period)',
        detail: 'Primeiro e último dia do mês, sem fuso (princípio 2).',
        refs: [],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'balances',
        label: 'between(início, fim) → totals()',
        detail:
          'Entradas, saídas e resultado só do mês corrente, inclusive datas futuras dentro dele; outros meses não o alteram (CA-02.3, D-42).',
        refs: ['CA-02.3'],
        kind: 'call',
      },
      {
        from: 'summary',
        to: 'amount',
        label: 'SignedAmount + formatMonthLabel',
        detail:
          '"+R$ 750,00" verde / "−R$ 45,90" vermelho / neutro no zero; "Saldo de outubro de 2026" (Intl em UTC — D-38(f)). "—" enquanto carrega.',
        refs: ['CA-02.1', 'D-38'],
        kind: 'return',
      },
    ],
    tests: [
      'src/repositories/transactionsRepository.balances.test.ts',
      'src/features/home/HomePage.test.tsx',
      'src/domain/balances.test.ts',
      'src/domain/balances.properties.test.ts',
      'src/domain/dates.format.test.ts',
      'src/domain/dates.format.timezone.test.ts',
    ],
  },
  {
    id: 'day-rollover',
    title: 'Virada do dia com o app aberto (CA-02.2)',
    summary:
      'O app instalado pode ficar dias em segundo plano. useToday assina visibilitychange (document), focus e pageshow (window) com useSyncExternalStore e recalcula today() a cada evento; como o valor é uma string, só há nova renderização quando o dia muda. O novo today refaz só as consultas que dependem dele — useMonthTotals(period) e useRecentTransactions(today, 5), que passa a mostrar um lançamento que era futuro (D-40); o saldo geral não depende de today (D-42) — e o useTransactionForm troca a data do formulário só se ela ainda for a preenchida automaticamente (ref autoFilledDate) — D-38(g). Com o app em primeiro plano na meia-noite, nada muda até o próximo foco ou visibilidade (coerente com a D-38(g)).',
    requirements: ['RF-02', 'CA-02.2', 'D-38', 'D-40', 'D-42'],
    participants: [
      { id: 'browser', label: 'Navegador / iOS' },
      { id: 'today', label: 'useToday', module: 'src/components/ui/useToday.ts' },
      { id: 'dates', label: 'domain/dates (today)', module: 'src/domain/dates.ts' },
      { id: 'home', label: 'HomePage', module: 'src/features/home/HomePage.tsx' },
      { id: 'summary', label: 'BalanceSummary', module: 'src/features/home/BalanceSummary.tsx' },
      {
        id: 'recent',
        label: 'RecentTransactions',
        module: 'src/features/home/RecentTransactions.tsx',
      },
      {
        id: 'repo',
        label: 'transactionsRepository',
        module: 'src/repositories/transactionsRepository.ts',
      },
      {
        id: 'formHook',
        label: 'useTransactionForm',
        module: 'src/components/transactions/useTransactionForm.ts',
      },
    ],
    steps: [
      {
        from: 'browser',
        to: 'today',
        label: 'visibilitychange / focus / pageshow',
        detail: 'App volta ao primeiro plano ou é restaurado do bfcache.',
        refs: ['CA-02.2', 'D-38'],
        kind: 'event',
      },
      {
        from: 'today',
        to: 'dates',
        label: 'getSnapshot → today()',
        detail: 'Data local YYYY-MM-DD; mesma string = sem render.',
        refs: ['CA-02.2'],
        kind: 'call',
      },
      {
        from: 'today',
        to: 'home',
        label: 'novo today',
        detail: 'HomePage e useTransactionForm usam o hook.',
        refs: ['CA-02.2'],
        kind: 'return',
      },
      {
        from: 'home',
        to: 'summary',
        label: 'today → saldo do mês',
        detail:
          'Só useMonthTotals([period]) reconsulta (se o mês mudou); useOverallBalance() não depende de today (D-42).',
        refs: ['D-42', 'D-38'],
        kind: 'call',
      },
      {
        from: 'home',
        to: 'recent',
        label: '<RecentTransactions today>',
        detail: 'O novo today chega por prop (D-40).',
        refs: ['D-40'],
        kind: 'call',
      },
      {
        from: 'recent',
        to: 'repo',
        label: 'useRecentTransactions(today, 5)',
        detail:
          'useLiveQuery com deps [today, count]: belowOrEqual(today).reverse().limit(5) acha o corte, between(corte, today) relê e takeMostRecent ordena; um lançamento que era futuro passa a aparecer.',
        refs: ['D-40', 'D-39'],
        kind: 'call',
      },
      {
        from: 'today',
        to: 'formHook',
        label: 'useEffect([todayDate])',
        detail:
          'Só no modo criar: se getValues("date") === autoFilledDate, setValue("date", novo hoje); data trocada pelo usuário fica como está.',
        refs: ['CA-02.2', 'D-38'],
        kind: 'call',
      },
    ],
    tests: ['src/features/home/HomePage.form.test.tsx', 'src/features/home/HomePage.test.tsx'],
  },
  {
    id: 'list-filter',
    title: 'Filtrar a lista de lançamentos',
    summary:
      'Um campo do FilterBar grava no Zustand; useTransactionList espera o texto, consulta só o período pelo índice date e aplica tipo, tag e texto no domínio; a tela mostra o resumo do conjunto filtrado e os dias.',
    requirements: ['RF-04', 'CA-04.2', 'CA-04.3', 'RNF-02'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'field',
        label: 'TextFilter / TypeFilter / TagFilter / PeriodFilter',
        module: 'src/features/transactions/filters/TextFilter.tsx',
      },
      { id: 'store', label: 'uiStore (Zustand)', module: 'src/stores/uiStore.ts' },
      {
        id: 'list',
        label: 'useTransactionList',
        module: 'src/features/transactions/useTransactionList.ts',
      },
      {
        id: 'debounce',
        label: 'useDebouncedValue',
        module: 'src/components/ui/useDebouncedValue.ts',
      },
      {
        id: 'filters',
        label: 'domain/transactionFilters',
        module: 'src/domain/transactionFilters.ts',
      },
      {
        id: 'repo',
        label: 'transactionsRepository',
        module: 'src/repositories/transactionsRepository.ts',
      },
      { id: 'recency', label: 'sortByRecency', module: 'src/domain/transactions.ts' },
      {
        id: 'page',
        label: 'TransactionsPage',
        module: 'src/features/transactions/TransactionsPage.tsx',
      },
    ],
    steps: [
      {
        from: 'user',
        to: 'field',
        label: 'digita / toca num filtro',
        detail:
          'Texto no campo "Buscar na descrição" (sempre visível); tipo, tag e período no painel aberto por "Filtros" (D-45(a)).',
        refs: ['CA-04.2', 'D-45'],
        kind: 'event',
      },
      {
        from: 'field',
        to: 'store',
        label: 'setFilters({ campo })',
        detail:
          'Atualização parcial: só o campo informado muda; o texto é gravado a cada tecla. Sem persist: some ao fechar o app (D-45(f)).',
        refs: ['CA-04.2', 'D-45'],
        kind: 'call',
      },
      {
        from: 'store',
        to: 'list',
        label: '5 seletores (text, type, tagId, from, to)',
        detail: 'Um seletor por campo: o hook só renderiza de novo quando um filtro usado muda.',
        refs: ['RNF-02'],
        kind: 'return',
      },
      {
        from: 'list',
        to: 'debounce',
        label: "useDebouncedValue(texto, 250, '')",
        detail:
          'SEARCH_DEBOUNCE_MS = 250; texto vazio (ou só espaços) vale na hora e zera o valor atrasado, para a busca anterior não reaparecer (D-44(c)).',
        refs: ['D-44', 'RNF-02'],
        kind: 'call',
      },
      {
        from: 'list',
        to: 'filters',
        label: 'effectivePeriod({ from, to })',
        detail: 'Período invertido (inicial > final) não é aplicado: vira sem limites (D-44(b)).',
        refs: ['CA-04.2', 'D-44'],
        kind: 'call',
      },
      {
        from: 'list',
        to: 'repo',
        label: 'useTransactionsInPeriod(from, to)',
        detail:
          'useLiveQuery com deps [from, to]: índice date em ordem crescente (between / aboveOrEqual / belowOrEqual / orderBy), um getAll() nativo; sem .reverse() do Dexie (cursor lento no Safari — D-44(a)). Também useTransactionCount (count()) e useTags.',
        refs: ['D-44', 'RNF-02'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'recency',
        label: 'sortByRecency(array.reverse())',
        detail:
          'Inverte em memória e ordena por data, createdAt e id (a mesma ordem do Início); o array chega quase ordenado.',
        refs: ['CA-04.1', 'D-44'],
        kind: 'call',
      },
      {
        from: 'list',
        to: 'filters',
        label: 'summarizeTransactionList(lista, filtros aplicados)',
        detail:
          'createTransactionMatcher numa passada (tipo, tag, período, foldText(descrição).includes) → groupByDay → totais do conjunto filtrado inteiro. Filtros aplicados = texto já com a espera e tag excluída como "Todas"; isFiltering e filtersKey saem deles (CA-04.3).',
        refs: ['CA-04.2', 'CA-04.3', 'D-44', 'D-45'],
        kind: 'call',
      },
      {
        from: 'list',
        to: 'page',
        label: '{ summary, totalCount, tags, isFiltering, filtersKey }',
        detail:
          'FilterSummary só com filtro aplicado; EmptyState conforme totalCount/summary.count (D-45(d)); TransactionDayList com key = filtersKey.',
        refs: ['CA-04.3', 'D-45'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/transactions/TransactionsPage.filters.test.tsx',
      'src/features/transactions/TransactionsPage.test.tsx',
      'src/features/transactions/useTransactionList.test.ts',
      'src/domain/transactionFilters.test.ts',
      'src/domain/transactionFilters.properties.test.ts',
      'src/domain/transactionFilters.performance.test.ts',
      'src/repositories/transactionsRepository.list.test.ts',
      'src/components/ui/useDebouncedValue.test.ts',
    ],
  },
  {
    id: 'list-paginate',
    title: 'Paginar a lista (dias inteiros)',
    summary:
      'TransactionDayList guarda uma meta de itens e monta só os dias inteiros que a cobrem; LoadMore aumenta a meta perto do fim da lista ou pelo botão; mudar um filtro troca a key e volta à 1ª página.',
    requirements: ['RF-04', 'CA-04.6', 'RNF-02'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'page',
        label: 'TransactionsPage',
        module: 'src/features/transactions/TransactionsPage.tsx',
      },
      {
        id: 'dayList',
        label: 'TransactionDayList',
        module: 'src/features/transactions/list/TransactionDayList.tsx',
      },
      {
        id: 'filters',
        label: 'countVisibleDays',
        module: 'src/domain/transactionFilters.ts',
      },
      { id: 'day', label: 'DaySection', module: 'src/features/transactions/list/DaySection.tsx' },
      { id: 'loadMore', label: 'LoadMore', module: 'src/components/ui/LoadMore.tsx' },
    ],
    steps: [
      {
        from: 'page',
        to: 'dayList',
        label: '<TransactionDayList key={filtersKey} days>',
        detail: 'Nova key quando os filtros aplicados mudam: o componente remonta na 1ª página.',
        refs: ['CA-04.6', 'D-44'],
        kind: 'call',
      },
      {
        from: 'dayList',
        to: 'filters',
        label: 'countVisibleDays(days, itemTarget)',
        detail:
          'itemTarget começa em LIST_PAGE_ITEM_COUNT = 50; soma dias inteiros até cobrir a meta (um dia nunca é cortado). Guarda a meta, não a quantidade de dias: acompanha a lista ao vivo.',
        refs: ['CA-04.6', 'D-44'],
        kind: 'call',
      },
      {
        from: 'dayList',
        to: 'day',
        label: 'days.slice(0, dayCount)',
        detail:
          'Cabeçalho com formatLongDate + totais do dia; linhas com showDate={false} (D-45(c)).',
        refs: ['CA-04.1', 'D-45'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'loadMore',
        label: 'rola até 600 px do fim / toca "Carregar mais"',
        detail:
          'IntersectionObserver com rootMargin 0 0 600px 0, refeito a cada página (loadedCount); o botão é a alternativa acessível.',
        refs: ['CA-04.6', 'D-44'],
        kind: 'event',
      },
      {
        from: 'loadMore',
        to: 'dayList',
        label: 'onLoadMore()',
        detail: 'setItemTarget(itemCount + 50): sempre acrescenta pelo menos um dia.',
        refs: ['CA-04.6'],
        kind: 'call',
      },
    ],
    tests: [
      'src/features/transactions/TransactionsPage.pagination.test.tsx',
      'src/domain/transactionFilters.test.ts',
      'src/domain/transactionFilters.properties.test.ts',
    ],
  },
  {
    id: 'list-clear-filters',
    title: 'Limpar filtros',
    summary:
      '"Limpar filtros" aparece com algum filtro preenchido; ao tocar, zera os filtros no Zustand e leva o foco ao campo de busca.',
    requirements: ['RF-04', 'CA-04.4', 'RNF-06'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'clear',
        label: 'ClearFiltersButton',
        module: 'src/features/transactions/filters/ClearFiltersButton.tsx',
      },
      { id: 'store', label: 'uiStore (Zustand)', module: 'src/stores/uiStore.ts' },
      {
        id: 'bar',
        label: 'FilterBar (contexto)',
        module: 'src/features/transactions/filters/FilterBar.tsx',
      },
      {
        id: 'text',
        label: 'TextFilter',
        module: 'src/features/transactions/filters/TextFilter.tsx',
      },
      {
        id: 'list',
        label: 'useTransactionList',
        module: 'src/features/transactions/useTransactionList.ts',
      },
    ],
    steps: [
      {
        from: 'store',
        to: 'clear',
        label: 'hasActiveFilters(5 campos)',
        detail:
          'Visível pelo texto digitado, sem esperar a busca; período invertido conta como preenchido (D-45(b)).',
        refs: ['CA-04.4', 'D-45'],
        kind: 'return',
      },
      {
        from: 'user',
        to: 'clear',
        label: 'toca "Limpar filtros"',
        detail: 'Button secondary, 44 px.',
        refs: ['CA-04.4'],
        kind: 'event',
      },
      {
        from: 'clear',
        to: 'store',
        label: 'clearFilters()',
        detail: 'transactionFilters = EMPTY_TRANSACTION_FILTERS.',
        refs: ['CA-04.4'],
        kind: 'call',
      },
      {
        from: 'clear',
        to: 'bar',
        label: 'searchInputRef.current?.focus()',
        detail: 'O botão some ao limpar; sem isto o foco cairia no <body> (RNF-06).',
        refs: ['RNF-06', 'D-45'],
        kind: 'call',
      },
      {
        from: 'bar',
        to: 'text',
        label: 'foco em "Buscar na descrição"',
        detail: 'O ref vem do FilterBarContext e está ligado ao TextInput.',
        refs: ['D-45'],
        kind: 'return',
      },
      {
        from: 'store',
        to: 'list',
        label: 'filtros vazios',
        detail:
          'Texto "" vale na hora (sem espera); a lista volta completa, sem resumo, na 1ª página (nova filtersKey).',
        refs: ['CA-04.4', 'D-44'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/transactions/TransactionsPage.filters.test.tsx',
      'src/stores/uiStore.filters.test.ts',
    ],
  },
  {
    id: 'list-open-transaction',
    title: 'Abrir um lançamento da lista e voltar',
    summary:
      'A linha leva a /lancamentos/:id; o Voltar retorna à lista com os mesmos filtros, que ficam no Zustand enquanto o app está aberto.',
    requirements: ['RF-04', 'CA-04.5', 'CA-13.2'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'row',
        label: 'TransactionRow',
        module: 'src/components/transactions/TransactionRow.tsx',
      },
      {
        id: 'detail',
        label: 'TransactionDetailPage',
        module: 'src/features/transactions/TransactionDetailPage.tsx',
      },
      { id: 'back', label: 'BackLink / useGoBack', module: 'src/components/ui/useGoBack.ts' },
      { id: 'store', label: 'uiStore (Zustand)', module: 'src/stores/uiStore.ts' },
      {
        id: 'page',
        label: 'TransactionsPage',
        module: 'src/features/transactions/TransactionsPage.tsx',
      },
    ],
    steps: [
      {
        from: 'user',
        to: 'row',
        label: 'toca na linha',
        detail: '<Link to="/lancamentos/:id"> (CA-04.5); a lista desmonta.',
        refs: ['CA-04.5'],
        kind: 'event',
      },
      {
        from: 'row',
        to: 'detail',
        label: 'navega para /lancamentos/:id',
        detail: 'Editar/excluir como na Fase 4 (fluxos próprios).',
        refs: ['CA-04.5', 'CA-01.5'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'back',
        label: 'Voltar (ou salvar/excluir)',
        detail: 'useGoBack: navigate(-1) com histórico; sem histórico, a tela pai /lancamentos.',
        refs: ['CA-13.2', 'D-38'],
        kind: 'event',
      },
      {
        from: 'back',
        to: 'page',
        label: 'remonta a lista',
        detail: 'O painel começa fechado e a lista volta à 1ª página (D-45(a)/(f)).',
        refs: ['D-45'],
        kind: 'call',
      },
      {
        from: 'store',
        to: 'page',
        label: 'transactionFilters mantidos',
        detail:
          'A store vive em memória enquanto o app está aberto (sem persist): trocar de aba ou abrir um lançamento mantém os filtros; fechar o app zera (D-45(f)).',
        refs: ['CA-04.5', 'D-45'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/transactions/TransactionsPage.filters.test.tsx',
      'src/features/transactions/TransactionsPage.test.tsx',
    ],
  },
  {
    id: 'list-deleted-tag',
    title: 'Tag do filtro excluída',
    summary:
      'Se a tag escolhida no filtro some (excluída em Ajustes → Tags), o filtro passa a valer como "Todas" e é limpo no Zustand.',
    requirements: ['RF-04', 'CA-04.2', 'RF-03'],
    participants: [
      {
        id: 'tagsRepo',
        label: 'tagsRepository (useTags)',
        module: 'src/repositories/tagsRepository.ts',
      },
      {
        id: 'list',
        label: 'useTransactionList',
        module: 'src/features/transactions/useTransactionList.ts',
      },
      { id: 'store', label: 'uiStore (Zustand)', module: 'src/stores/uiStore.ts' },
      {
        id: 'tagFilter',
        label: 'TagFilter',
        module: 'src/features/transactions/filters/TagFilter.tsx',
      },
      {
        id: 'toggle',
        label: 'FilterToggle',
        module: 'src/features/transactions/filters/FilterToggle.tsx',
      },
    ],
    steps: [
      {
        from: 'tagsRepo',
        to: 'list',
        label: 'useTags() sem o tagId',
        detail:
          'useLiveQuery re-emite depois de deleteTag (só possível sem uso — D-02, mas o filtro pode estar parado numa tag recém-excluída).',
        refs: ['RF-03', 'D-02'],
        kind: 'return',
      },
      {
        from: 'list',
        to: 'list',
        label: 'isTagMissing',
        detail:
          'Só depois de as tags carregarem (tags !== undefined); nos filtros aplicados a tag vira null na mesma renderização.',
        refs: ['D-44'],
        kind: 'call',
      },
      {
        from: 'list',
        to: 'store',
        label: 'setFilters({ tagId: null }) (useEffect)',
        detail: 'Limpa também a store, para o chip e o contador ficarem coerentes (D-44(a)).',
        refs: ['D-44'],
        kind: 'call',
      },
      {
        from: 'store',
        to: 'tagFilter',
        label: 'tagId null → "Todas"',
        detail: 'TagPicker com allOptionLabel marca a opção "".',
        refs: ['CA-04.2', 'D-45'],
        kind: 'return',
      },
      {
        from: 'store',
        to: 'toggle',
        label: 'contador "Filtros (N)" sem a tag',
        detail: 'countActiveFilters deixa de contar a tag.',
        refs: ['D-45'],
        kind: 'return',
      },
    ],
    tests: [
      'src/features/transactions/useTransactionList.test.ts',
      'src/features/transactions/TransactionsPage.filters.test.tsx',
    ],
  },
  {
    id: 'backup-export',
    title: 'Exportar backup criptografado',
    summary:
      'Senha e confirmação (princípio 16) → leitura das 5 tabelas numa transação r → conteúdo em claro (settings só com theme) → PBKDF2 + AES-GCM com sal e IV novos → envelope da §6.8 num File gastos-backup-YYYY-MM-DD.json → folha de compartilhamento ou download. lastBackupAt só é gravado se a entrega deu shared ou downloaded; se o navegador bloquear a folha (NotAllowedError, sem toque recente depois da derivação), aparece "Salvar backup", que recebe o foco.',
    requirements: ['RF-10', 'RNF-05', 'CA-10.6', 'D-08', 'D-36', 'D-47', 'D-48'],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'section',
        label: 'ExportBackupSection',
        module: 'src/features/backup/ExportBackupSection.tsx',
      },
      { id: 'hook', label: 'useExportBackup', module: 'src/features/backup/useExportBackup.ts' },
      {
        id: 'schema',
        label: 'backupPasswordSchema',
        module: 'src/domain/backupPasswordSchema.ts',
      },
      { id: 'repo', label: 'backupRepository', module: 'src/repositories/backupRepository.ts' },
      { id: 'dexie', label: 'Dexie (5 tabelas)', module: 'src/db/database.ts' },
      { id: 'format', label: 'backupFormat', module: 'src/lib/backupFormat.ts' },
      { id: 'crypto', label: 'crypto', module: 'src/lib/crypto.ts' },
      { id: 'share', label: 'share', module: 'src/lib/share.ts' },
      { id: 'browser', label: 'Navegador (Web Share / download)' },
      {
        id: 'settings',
        label: 'settingsRepository',
        module: 'src/repositories/settingsRepository.ts',
      },
    ],
    steps: [
      {
        from: 'user',
        to: 'section',
        label: 'digita Senha e Confirmar senha',
        detail:
          'Dois PasswordInput (autocomplete new-password) ligados por Controller (o reset depois de exportar limpa os campos com o React Compiler — D-39).',
        refs: ['RF-10', 'D-48', 'D-39'],
        kind: 'event',
      },
      {
        from: 'hook',
        to: 'schema',
        label: 'zodResolver(exportPasswordSchema)',
        detail:
          'LIVE_VALIDATION: "A senha precisa ter pelo menos 8 caracteres" e "As senhas não coincidem" enquanto digita; form.subscribe reconfere a confirmação quando a senha muda. canSubmit = canSubmitForm && !isBusy (princípio 16).',
        refs: ['D-08', 'D-36', 'D-48'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'section',
        label: 'toca "Exportar backup"',
        detail: 'O botão vira "Gerando backup…" durante a derivação da chave (isGenerating).',
        refs: ['D-48'],
        kind: 'event',
      },
      {
        from: 'hook',
        to: 'repo',
        label: 'createBackupFile(password)',
        detail: 'Falha em qualquer etapa → "Não foi possível gerar o backup. Tente novamente."',
        refs: ['RF-10', 'D-48'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('r', 5 tabelas) → toArray × 5",
        detail:
          'readBackupTables: tags, transactions, recurrings, installmentGroups e settings numa única transação de leitura (§6.8 passo 1): o arquivo é um retrato coerente.',
        refs: ['RF-10', 'D-47'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'format',
        label: 'buildBackupContent(tabelas, { schemaVersion })',
        detail:
          'Conteúdo em claro { app, schemaVersion: SCHEMA_VERSION, exportedAt, data }; selectBackupSettings leva só theme (lastBackupAt e persistRequested ficam no aparelho — D-47(d)). O módulo não importa o Dexie: a versão chega por parâmetro.',
        refs: ['RF-10', 'D-47'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'crypto',
        label: 'encryptBackupText(JSON.stringify(conteúdo), senha)',
        detail:
          'Sal de 16 e IV de 12 bytes novos (getRandomValues) → PBKDF2-SHA-256 com 600.000 iterações sobre a senha em NFC → chave AES-GCM 256 não extraível → encrypt → envelope com base64 em blocos de 32 KiB (ver o pipeline de criptografia).',
        refs: ['RNF-05', 'CA-10.6', 'D-47'],
        kind: 'call',
      },
      {
        from: 'crypto',
        to: 'repo',
        label: 'envelope { format, kdf, cipher, ciphertext }',
        detail:
          'Só parâmetros públicos (iterações, sal, IV) e o texto cifrado: nenhuma descrição, valor ou tag legível (CA-10.6).',
        refs: ['CA-10.6'],
        kind: 'return',
      },
      {
        from: 'repo',
        to: 'hook',
        label: 'File gastos-backup-YYYY-MM-DD.json',
        detail: 'backupFileName(today(now)) com a data local (princípio 2); type application/json.',
        refs: ['RF-10'],
        kind: 'return',
      },
      {
        from: 'hook',
        to: 'repo',
        label: 'deliverBackupFile(file)',
        detail: 'isDelivering = true; a função de compartilhar é injetável nos testes.',
        refs: ['RF-10'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'share',
        label: 'shareOrDownloadFile(file)',
        detail: 'Nada vai para a rede (princípio 5): só a folha do sistema ou o download local.',
        refs: ['RF-10'],
        kind: 'call',
      },
      {
        from: 'share',
        to: 'browser',
        label: 'canShare({ files }) ? share() : <a download>',
        detail:
          'No iPhone, a folha de compartilhamento ("Salvar em Arquivos"). Sem Web Share com arquivo, download com a URL liberada 10 s depois.',
        refs: ['RF-10', 'D-48'],
        kind: 'call',
      },
      {
        from: 'browser',
        to: 'share',
        label: 'shared | downloaded | cancelled | blocked',
        detail:
          'AbortError → cancelled (folha fechada); NotAllowedError → blocked (sem toque recente); outras falhas são relançadas.',
        refs: ['D-48'],
        kind: 'return',
      },
      {
        from: 'repo',
        to: 'settings',
        label: "setSetting('lastBackupAt') só se shared/downloaded",
        detail:
          'recordBackupDone grava a data ISO 8601 (local ao aparelho). Cancelado ou bloqueado não conta como backup feito.',
        refs: ['RF-10', 'D-48'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'section',
        label: 'applyOutcome → mensagem + foco',
        detail:
          '"Backup exportado." (form.reset: a senha sai da memória) ou "Exportação cancelada. O backup não foi salvo."; foco na mensagem role="status". blocked: "O backup está pronto. Toque em “Salvar backup” para guardá-lo." e o botão "Salvar backup" recebe o foco (saveButtonRef — Button com ref).',
        refs: ['D-48', 'RNF-06'],
        kind: 'return',
      },
      {
        from: 'user',
        to: 'section',
        label: 'toca "Salvar backup" (se bloqueado)',
        detail:
          'savePendingFile → deliverBackupFile com o mesmo arquivo, agora com toque recente; a chave não é derivada de novo.',
        refs: ['D-48'],
        kind: 'event',
      },
    ],
    tests: [
      'src/lib/crypto.test.ts',
      'src/lib/crypto.audit.test.ts',
      'src/lib/backupFormat.test.ts',
      'src/lib/share.test.ts',
      'src/domain/backupPasswordSchema.test.ts',
      'src/repositories/backupRepository.test.ts',
      'src/repositories/backupRepository.audit.test.ts',
      'src/features/backup/BackupPage.test.tsx',
    ],
  },
  {
    id: 'backup-import',
    title: 'Importar backup (substitui tudo)',
    summary:
      'Arquivo + senha → openBackupFile confere tamanho, envelope, senha (AES-GCM autenticado), versão, migrações, estrutura (zod) e integridade sem tocar no banco → resumo no modal com o aviso "Isso vai substituir todos os dados atuais." → restoreBackup numa única transação rw → espelho do tema no localStorage → setPreference → foco na mensagem. Qualquer erro mostra a mensagem exata do CA e nada é alterado.',
    requirements: [
      'RF-10',
      'CA-10.1',
      'CA-10.2',
      'CA-10.3',
      'CA-10.4',
      'CA-10.5',
      'D-07',
      'D-28',
      'D-47',
      'D-48',
    ],
    participants: [
      { id: 'user', label: 'Usuário' },
      {
        id: 'section',
        label: 'ImportBackupSection',
        module: 'src/features/backup/ImportBackupSection.tsx',
      },
      { id: 'hook', label: 'useImportBackup', module: 'src/features/backup/useImportBackup.ts' },
      { id: 'repo', label: 'backupRepository', module: 'src/repositories/backupRepository.ts' },
      { id: 'format', label: 'backupFormat', module: 'src/lib/backupFormat.ts' },
      { id: 'crypto', label: 'crypto', module: 'src/lib/crypto.ts' },
      { id: 'texts', label: 'backupTexts', module: 'src/features/backup/backupTexts.ts' },
      {
        id: 'dialog',
        label: 'ConfirmImportDialog',
        module: 'src/features/backup/ConfirmImportDialog.tsx',
      },
      { id: 'dexie', label: 'Dexie (5 tabelas)', module: 'src/db/database.ts' },
      { id: 'mirror', label: 'themeStorage (espelho)', module: 'src/lib/themeStorage.ts' },
      { id: 'theme', label: 'useTheme', module: 'src/repositories/useTheme.ts' },
    ],
    steps: [
      {
        from: 'user',
        to: 'section',
        label: 'escolhe o arquivo e digita a senha',
        detail:
          'FileInput (accept application/json,.json) e PasswordInput (current-password); importBackupSchema exige o arquivo e a senha preenchida ("Informe a senha").',
        refs: ['RF-10', 'D-48'],
        kind: 'event',
      },
      {
        from: 'hook',
        to: 'repo',
        label: 'openBackupFile(file, senha)',
        detail:
          '"Importar backup" vira "Verificando backup…". Nenhuma escrita no banco até a confirmação.',
        refs: ['RF-10', 'D-07'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'repo',
        label: 'file.size > 50 MB → Arquivo inválido',
        detail:
          'MAX_BACKUP_FILE_BYTES: evita travar o aparelho com um arquivo escolhido por engano ou forjado.',
        refs: ['CA-10.3', 'D-47'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'format',
        label: 'parseBackupEnvelope(texto)',
        detail:
          'JSON, format/formatVersion, PBKDF2/SHA-256, AES-GCM 256, sal de 16 e IV de 12 bytes em base64, iterações ≤ 10.000.000 e texto cifrado com pelo menos a tag do GCM. Falha → InvalidBackupFileError.',
        refs: ['CA-10.3', 'D-47'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'crypto',
        label: 'decryptBackupText(envelope, senha)',
        detail:
          'Deriva a chave com o sal e as iterações do envelope (senha em NFC) e descriptografa; a autenticação do AES-GCM falha com senha errada ou arquivo alterado: OperationError → BackupDecryptionError.',
        refs: ['CA-10.2', 'RNF-05', 'D-47'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'format',
        label: 'parseBackupContent(texto, { schemaVersion })',
        detail:
          'Cabeçalho app/schemaVersion; mais nova que SCHEMA_VERSION → NewerBackupVersionError (CA-10.5); mais antiga → migrateBackupContent em cadeia por BACKUP_MIGRATIONS (vazio na v1; migração faltando = inválido — CA-10.4); zod dos registros com os .refine (ordem de amounts, nameKey coerente, pares recurring/installment); hasReferentialIntegrity (IDs e nameKey únicos, vínculos existentes, parcela ≤ count).',
        refs: ['CA-10.3', 'CA-10.4', 'CA-10.5', 'D-47'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'hook',
        label: 'BackupContent válido no esquema atual',
        detail: 'Os erros chegam ao hook sem nenhuma alteração no banco.',
        refs: ['D-07'],
        kind: 'return',
      },
      {
        from: 'hook',
        to: 'texts',
        label: 'describeOpenError(erro) (se falhou)',
        detail:
          '"Senha incorreta ou arquivo corrompido" (CA-10.2), "Arquivo inválido" (CA-10.3), "Backup de uma versão mais nova do app. Atualize o app e tente novamente." (CA-10.5) ou "Não foi possível abrir o backup. Nenhum dado foi alterado."; o ErrorAlert some quando o usuário troca o arquivo ou a senha.',
        refs: ['CA-10.2', 'CA-10.3', 'CA-10.5', 'D-48'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'format',
        label: 'summarizeBackup(content)',
        detail: 'exportedAt e as contagens de lançamentos, tags e recorrentes.',
        refs: ['RF-10'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'dialog',
        label: 'summary ≠ null → Modal "Importar backup?"',
        detail:
          'Data e hora ("17/10/2026 às 15:05"), contagens e "Isso vai substituir todos os dados atuais."; "Cancelar" fecha sem mudar nada.',
        refs: ['RF-10', 'D-07', 'D-48'],
        kind: 'call',
      },
      {
        from: 'user',
        to: 'dialog',
        label: 'toca "Substituir dados"',
        detail: 'confirmImport; os dois botões ficam desabilitados ("Substituindo…").',
        refs: ['D-07', 'D-48'],
        kind: 'event',
      },
      {
        from: 'hook',
        to: 'repo',
        label: 'restoreBackup(content.data)',
        detail: 'Devolve o tema aplicado (o do backup ou system).',
        refs: ['CA-10.1', 'D-07'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'dexie',
        label: "transaction('rw', 5 tabelas): clear × 4 → bulkAdd × 4 → put theme",
        detail:
          'Uma única transação: tags, transactions, recurrings e installmentGroups limpas e regravadas; settings troca só theme; lastBackupAt e persistRequested do aparelho ficam como estão. Qualquer falha desfaz tudo.',
        refs: ['CA-10.1', 'D-07', 'D-47'],
        kind: 'call',
      },
      {
        from: 'repo',
        to: 'mirror',
        label: 'writeThemeMirror(tema) depois do commit',
        detail: 'O script inline do index.html abre com o tema importado na próxima carga (D-28).',
        refs: ['D-28'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'theme',
        label: 'setPreference(tema)',
        detail: 'O tema vale na hora, também se o usuário o trocou nesta sessão (D-47(d)).',
        refs: ['D-28', 'D-47'],
        kind: 'call',
      },
      {
        from: 'hook',
        to: 'section',
        label: '"Backup importado." + formKey + 1 + foco',
        detail:
          'O formulário é recriado (o input de arquivo não se limpa pelo valor) e o foco vai para a mensagem role="status", fora do <form>. Falha na transação: "Não foi possível importar o backup. Nenhum dado foi alterado." dentro do modal.',
        refs: ['D-48', 'RNF-06', 'D-07'],
        kind: 'return',
      },
    ],
    tests: [
      'src/lib/backupFormat.test.ts',
      'src/lib/backupFormat.audit.test.ts',
      'src/lib/crypto.test.ts',
      'src/domain/backupPasswordSchema.test.ts',
      'src/repositories/backupRepository.test.ts',
      'src/repositories/backupRepository.audit.test.ts',
      'src/repositories/backupRepository.theme.test.ts',
      'src/features/backup/BackupPage.test.tsx',
    ],
  },
  {
    id: 'backup-reminder',
    title: 'Lembrete de backup no Início',
    summary:
      'O Início mostra uma faixa discreta "Último backup: há N dias. Faça um backup para não perder seus dados." com o link "Fazer backup" quando há pelo menos um lançamento e nunca houve backup ou já se passaram 7 dias ou mais. Lê só a data e a contagem: a criptografia fica na tela de backup, lazy.',
    requirements: ['RF-10', 'D-11', 'D-41', 'D-48'],
    participants: [
      { id: 'home', label: 'HomePage', module: 'src/features/home/HomePage.tsx' },
      { id: 'reminder', label: 'BackupReminder', module: 'src/features/home/BackupReminder.tsx' },
      {
        id: 'settings',
        label: 'settingsRepository',
        module: 'src/repositories/settingsRepository.ts',
      },
      {
        id: 'txRepo',
        label: 'transactionsRepository',
        module: 'src/repositories/transactionsRepository.ts',
      },
      { id: 'dexie', label: 'Dexie', module: 'src/db/database.ts' },
      { id: 'domain', label: 'backupReminder', module: 'src/domain/backupReminder.ts' },
      { id: 'user', label: 'Usuário' },
      { id: 'page', label: 'BackupPage (lazy)', module: 'src/features/backup/BackupPage.tsx' },
    ],
    steps: [
      {
        from: 'home',
        to: 'reminder',
        label: '<BackupReminder today={todayDate} />',
        detail: 'No topo do Page.Body, antes do BalanceSummary; today vem do useToday do HomePage.',
        refs: ['RF-10', 'D-48'],
        kind: 'call',
      },
      {
        from: 'reminder',
        to: 'settings',
        label: 'useLastBackupAt()',
        detail:
          "useSetting('lastBackupAt') com useLiveQuery: undefined carregando, null se nunca houve. Fica no settingsRepository para o Início não importar o backupRepository (D-41/D-47(e)).",
        refs: ['RF-10', 'D-41', 'D-47'],
        kind: 'call',
      },
      {
        from: 'settings',
        to: 'dexie',
        label: "settings.get('lastBackupAt')",
        detail: 'Chave local ao aparelho (não vai para o backup).',
        refs: ['RF-10'],
        kind: 'call',
      },
      {
        from: 'reminder',
        to: 'txRepo',
        label: 'useTransactionCount()',
        detail: 'count() sem ler registros (o mesmo hook da lista — Fase 5).',
        refs: ['RF-10'],
        kind: 'call',
      },
      {
        from: 'reminder',
        to: 'domain',
        label: 'shouldShowBackupReminder({ lastBackupAt, today, transactionCount })',
        detail:
          'Pelo menos um lançamento e (nunca houve backup ou daysSinceLastBackup ≥ 7). Enquanto qualquer consulta carrega, nada aparece (sem piscar).',
        refs: ['D-11'],
        kind: 'call',
      },
      {
        from: 'reminder',
        to: 'domain',
        label: 'describeLastBackup(daysSinceLastBackup(...))',
        detail:
          '"Último backup: nunca / hoje / há 1 dia / há N dias", em dias de calendário locais; relógio atrasado conta como "hoje" (D-48(c)). O mesmo texto aparece no topo de Ajustes → Backup (LastBackupStatus).',
        refs: ['RF-10', 'D-48'],
        kind: 'call',
      },
      {
        from: 'reminder',
        to: 'home',
        label: 'Notice subtle + Link "Fazer backup" (ou null)',
        detail:
          'O Início só mostra "Último backup" dentro do aviso (D-48(c), aguardando confirmação — ver a pendência D-48(c) × RF-10 em Saúde).',
        refs: ['D-48'],
        kind: 'return',
      },
      {
        from: 'user',
        to: 'reminder',
        label: 'toca "Fazer backup"',
        detail: 'Link do react-router com alvo de 44 px (nada depende de hover).',
        refs: ['RF-10'],
        kind: 'event',
      },
      {
        from: 'reminder',
        to: 'page',
        label: 'navega para /ajustes/backup',
        detail:
          'Tela lazy: só agora o chunk com crypto, backupFormat e o zod do backup é carregado.',
        refs: ['RF-10', 'D-41'],
        kind: 'call',
      },
      {
        from: 'settings',
        to: 'reminder',
        label: 'lastBackupAt novo → o aviso some',
        detail: 'Depois de recordBackupDone, o useLiveQuery re-emite e o aviso deixa de aparecer.',
        refs: ['D-11'],
        kind: 'return',
      },
    ],
    tests: [
      'src/domain/backupReminder.test.ts',
      'src/domain/backupReminder.audit.test.ts',
      'src/features/home/BackupReminder.test.tsx',
      'src/repositories/settingsRepository.test.ts',
    ],
  },
]

/** Fluxos exigidos pela §6.12 que ainda não existem no código. */
export const PLANNED_FLOWS: readonly PlannedFlow[] = [
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

// ---------- pipeline de criptografia do backup (§6.8, RNF-05) ----------

const CRYPTO_MODULE = 'src/lib/crypto.ts'

/** Caixas do diagrama "senha + sal → PBKDF2 → chave → AES-GCM + IV → ciphertext → envelope". */
export const CRYPTO_PIPELINE: readonly PipelineBox[] = [
  {
    id: 'password',
    title: 'Senha (NFC)',
    lines: ["normalize('NFC')", 'UTF-8 (TextEncoder)'],
    detail:
      'A senha digitada (mínimo 8 caracteres — D-08) é normalizada em NFC dentro da derivação, na exportação e na importação: "é" composto ou "e" + acento combinante abre o mesmo backup. Nunca vai para log nem para mensagem de erro.',
    column: 0,
    row: 0,
    tone: 'secret',
    module: CRYPTO_MODULE,
    refs: ['D-08', 'D-47'],
  },
  {
    id: 'salt',
    title: 'Sal (16 bytes)',
    lines: ['getRandomValues', 'novo a cada exportação'],
    detail:
      'Gerado por crypto.getRandomValues a cada exportação (dois backups com a mesma senha têm chaves diferentes). Público: vai em base64 para kdf.salt do envelope.',
    column: 0,
    row: 1,
    tone: 'input',
    module: CRYPTO_MODULE,
    refs: ['RNF-05'],
  },
  {
    id: 'pbkdf2',
    title: 'PBKDF2-SHA-256',
    lines: ['600.000 iterações', 'importKey → deriveKey'],
    detail:
      'importKey("raw", senha, "PBKDF2") e deriveKey com o sal e PBKDF2_ITERATIONS = 600.000 (só os testes passam menos; o envelope grava o número usado). Na importação, iterações acima de 10.000.000 são recusadas antes de derivar. ~345 ms no PC; no iPhone será medido na Fase 11.',
    column: 1,
    row: 0,
    tone: 'process',
    module: CRYPTO_MODULE,
    refs: ['RNF-05', 'D-47'],
  },
  {
    id: 'key',
    title: 'Chave AES-GCM 256',
    lines: ['não extraível', 'usos: encrypt, decrypt'],
    detail:
      'CryptoKey de 256 bits com extractable = false: nem o próprio app consegue exportá-la. Vive só durante a operação.',
    column: 2,
    row: 0,
    tone: 'secret',
    module: CRYPTO_MODULE,
    refs: ['RNF-05', 'D-47'],
  },
  {
    id: 'plaintext',
    title: 'Conteúdo em claro',
    lines: ['buildBackupContent', 'JSON.stringify → UTF-8'],
    detail:
      '{ app: "app-gastos", schemaVersion, exportedAt, data } com as 5 tabelas (settings só com theme), lidas numa transação r pelo backupRepository. Existe só na memória: nunca é gravado em disco.',
    column: 2,
    row: 1,
    tone: 'input',
    module: 'src/lib/backupFormat.ts',
    refs: ['RF-10', 'D-47'],
  },
  {
    id: 'aes',
    title: 'AES-GCM encrypt',
    lines: ['crypto.subtle.encrypt', 'autentica (tag de 16 B)'],
    detail:
      'Cifra autenticada: na importação, senha errada ou um único bit alterado faz o decrypt falhar com OperationError, que vira BackupDecryptionError ("Senha incorreta ou arquivo corrompido" — CA-10.2).',
    column: 3,
    row: 0,
    tone: 'process',
    module: CRYPTO_MODULE,
    refs: ['RNF-05', 'CA-10.2'],
  },
  {
    id: 'iv',
    title: 'IV (12 bytes)',
    lines: ['getRandomValues', 'novo a cada exportação'],
    detail:
      'Vetor de inicialização do AES-GCM, nunca reutilizado com a mesma chave. Público: vai em base64 para cipher.iv do envelope.',
    column: 3,
    row: 1,
    tone: 'input',
    module: CRYPTO_MODULE,
    refs: ['RNF-05'],
  },
  {
    id: 'ciphertext',
    title: 'ciphertext',
    lines: ['bytes cifrados + tag', 'base64 em blocos de 32 KiB'],
    detail:
      'bytesToBase64 converte em blocos de 32 KiB (String.fromCharCode com milhões de argumentos estouraria a pilha). Nenhuma descrição, valor ou tag fica legível (CA-10.6).',
    column: 4,
    row: 0,
    tone: 'output',
    module: CRYPTO_MODULE,
    refs: ['CA-10.6'],
  },
  {
    id: 'envelope',
    title: 'Envelope (§6.8)',
    lines: [
      'format, formatVersion',
      'createdAt',
      'kdf { iterations, salt }',
      'cipher { iv }',
      'ciphertext',
    ],
    detail:
      'JSON gravado no File gastos-backup-YYYY-MM-DD.json: só parâmetros públicos e o texto cifrado. Na importação, parseBackupEnvelope (zod) confere tudo isso antes de derivar a chave.',
    column: 5,
    row: 0,
    tone: 'output',
    module: CRYPTO_MODULE,
    refs: ['RF-10', 'CA-10.6', 'CA-10.3'],
  },
]

export const CRYPTO_PIPELINE_ARROWS: readonly PipelineArrow[] = [
  { from: 'password', to: 'pbkdf2' },
  { from: 'salt', to: 'pbkdf2' },
  { from: 'pbkdf2', to: 'key' },
  { from: 'key', to: 'aes' },
  { from: 'plaintext', to: 'aes' },
  { from: 'iv', to: 'aes' },
  { from: 'aes', to: 'ciphertext' },
  { from: 'ciphertext', to: 'envelope' },
  { from: 'salt', to: 'envelope', copy: true },
  { from: 'iv', to: 'envelope', copy: true },
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
    inBackup: true,
    backupDetail:
      'todos os registros; na importação, nameKey precisa ser igual a toTagNameKey(name) e único (D-47(c)); ida e volta em backupRepository.test.ts e backupRepository.audit.test.ts (CA-10.1).',
    usedFromPhase: 3,
    note: 'Fase 3: src/repositories/tagsRepository.ts lê e grava (createTag com add; updateTag numa transação rw get → put; deleteTag numa transação rw sobre as 4 tabelas de dados, que reconta o uso antes de excluir — D-02; listTagsWithTransactionCount com useLiveQuery). Fase 4: listTags/useTags (ordenadas por nome) alimentam o TagPicker e as linhas dos últimos lançamentos; transactionsRepository lê tags só em assertTagExists, dentro da transação rw do lançamento (D-39); o atalho do CA-01.7 grava pelo mesmo TagForm → createTag. Fase 5: useTags também alimenta o filtro de tag da lista (TagFilter) e a detecção de tag do filtro excluída (useTransactionList). &nameKey (toTagNameKey = foldText + trim desde a Fase 5: NFD, sem marcas \\p{M}, minúsculas) é a única checagem de nome repetido: a ConstraintError vira DuplicateTagNameError (CA-03.4). Em DEV, sampleDataStore também grava (D-30); nos testes de tela, src/test/seedDatabase.ts lê (readAllTags). Fase 6: backupRepository lê tudo na exportação (transação r) e, na importação, limpa e regrava com bulkAdd na transação rw (D-07).',
  },
  {
    name: 'transactions',
    type: 'Transaction',
    inBackup: true,
    backupDetail:
      'todos os registros; na importação, tagId/recurringId/installmentGroupId precisam existir e installmentNumber ≤ count do parcelamento (hasReferentialIntegrity — D-47(c)); ida e volta em backupRepository.test.ts e backupRepository.audit.test.ts (CA-10.1).',
    usedFromPhase: 4,
    note: 'Fase 4: src/repositories/transactionsRepository.ts lê e grava. Escrita: createTransaction (add) e updateTransaction (get → put) numa transação rw [tags, transactions] com assertTagExists (D-01/D-02, D-39); deleteTransaction (delete simples). Leitura pelo índice date: getOverallBalance (toArray() da tabela inteira + overallBalance — D-42), getMonthTotals (between + totals), listRecentTransactions (where("date").belowOrEqual(hoje).reverse().limit(5) acha a data de corte; releitura between(corte, hoje) numa transação r; ordem por takeMostRecent — D-39/D-40) e getTransaction; cada uma com hook useLiveQuery. Fase 5 (D-44(a)): listTransactionsInPeriod(from, to) lê o índice date sempre em ordem crescente — between (período fechado), aboveOrEqual/belowOrEqual (uma ponta) ou orderBy("date") (sem período) — com toArray() (um getAll() nativo; .reverse() do Dexie abriria um cursor com uma volta por registro no Safari) e inverte em memória antes de sortByRecency; countTransactions() usa count() sem ler registros. Hooks useTransactionsInPeriod e useTransactionCount. Os índices type/tagId não são usados pela lista: tipo, tag e texto são filtrados no domínio. O tagsRepository continua contando por tag com o índice tagId (CA-03.5, D-02) — com a Fase 4 o bloqueio por uso ficou testável com lançamentos reais (CA-03.2). Em DEV as ferramentas de exemplo gravam 5.000 lançamentos (D-30); src/test/seedDatabase.ts ainda grava nos testes de tela (D-34). Índice composto [recurringId+recurringPeriod] para as pendências (Fase 9). Fase 6: backupRepository lê e regrava a tabela inteira (exportar/importar); o BackupReminder do Início usa useTransactionCount (count()).',
  },
  {
    name: 'recurrings',
    type: 'Recurring',
    inBackup: true,
    backupDetail:
      'todos os registros, com amounts (ordem estritamente crescente de fromPeriod, 1º igual ao startPeriod) e skippedPeriods; ida e volta em backupRepository.test.ts e backupRepository.audit.test.ts (CA-10.1).',
    usedFromPhase: 9,
    note: 'Sem repositório de escrita até a Fase 9. Desde a Fase 3 o tagsRepository conta os recorrentes de uma tag com filter().count() (sem índice tagId na v1 — §6.4; tabela pequena) para o bloqueio de exclusão (D-02). Hoje só as ferramentas DEV gravam (4 recorrentes — D-30) e src/test/seedDatabase.ts nos testes. Fase 6: backupRepository lê e regrava (exportar/importar).',
  },
  {
    name: 'installmentGroups',
    type: 'InstallmentGroup',
    inBackup: true,
    backupDetail:
      'todos os registros (2 a 48 parcelas — D-47(c)); ida e volta em backupRepository.test.ts e backupRepository.audit.test.ts (CA-10.1).',
    usedFromPhase: 10,
    note: 'Sem repositório de escrita até a Fase 10. Desde a Fase 3 o tagsRepository conta os parcelamentos de uma tag com filter().count() (sem índice tagId na v1 — §6.4) para o bloqueio de exclusão (D-02). Hoje só as ferramentas DEV gravam (3 parcelamentos — D-30) e src/test/seedDatabase.ts nos testes. Fase 6: backupRepository lê e regrava (exportar/importar).',
  },
  {
    name: 'settings',
    type: 'Setting',
    inBackup: true,
    backupDetail:
      'só a chave theme (selectBackupSettings; settings: [] se nunca foi escolhido). lastBackupAt e persistRequested são do aparelho: não vão para o arquivo e a importação os preserva; outra chave no arquivo = "Arquivo inválido" (§6.8, D-47(d)); tema conferido em backupRepository.theme.test.ts.',
    usedFromPhase: 2,
    note: 'Fase 2: chave theme (fonte da verdade do tema, com espelho em localStorage — D-28) e persistRequested (data do pedido de persist(), gravada antes do pedido — D-28). Fase 6: lastBackupAt (ISO 8601) gravado por recordBackupDone só depois de a entrega dar shared ou downloaded, lido por useLastBackupAt (Ajustes → Backup e BackupReminder); a importação troca só theme (put na transação rw) e atualiza o espelho do localStorage depois do commit (D-28). "Apagar todos os dados" (DEV) mantém esta tabela (D-30).',
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

/** Fase 5 — quem lê e quem escreve cada subcampo de transactionFilters (§6.7, D-45(f)). */
export const UI_FIELD_ACCESS: readonly UiFieldAccess[] = [
  {
    module: 'src/features/transactions/filters/TextFilter.tsx',
    reads: ['transactionFilters.text'],
    writes: ['setFilters({ text })'],
  },
  {
    module: 'src/features/transactions/filters/TypeFilter.tsx',
    reads: ['transactionFilters.type'],
    writes: ['setFilters({ type })'],
  },
  {
    module: 'src/features/transactions/filters/TagFilter.tsx',
    reads: ['transactionFilters.tagId'],
    writes: ['setFilters({ tagId })'],
  },
  {
    module: 'src/features/transactions/filters/PeriodFilter.tsx',
    reads: ['transactionFilters.from', 'transactionFilters.to'],
    writes: ['setFilters({ from })', 'setFilters({ to })'],
  },
  {
    module: 'src/features/transactions/filters/ClearFiltersButton.tsx',
    reads: [
      'transactionFilters.text',
      'transactionFilters.type',
      'transactionFilters.tagId',
      'transactionFilters.from',
      'transactionFilters.to',
    ],
    writes: ['clearFilters()'],
    note: 'Depois de limpar, foca "Buscar na descrição" pelo searchInputRef do FilterBarContext (CA-04.4, RNF-06).',
  },
  {
    module: 'src/features/transactions/filters/FilterToggle.tsx',
    reads: [
      'transactionFilters.type',
      'transactionFilters.tagId',
      'transactionFilters.from',
      'transactionFilters.to',
    ],
    writes: [],
    note: 'Só o contador "Filtros (N)"; o texto fica fora do painel e não conta.',
  },
  {
    module: 'src/features/transactions/useTransactionList.ts',
    reads: [
      'transactionFilters.text',
      'transactionFilters.type',
      'transactionFilters.tagId',
      'transactionFilters.from',
      'transactionFilters.to',
    ],
    writes: ['setFilters({ tagId: null })'],
    note: 'Um seletor por campo. Escreve só quando a tag do filtro foi excluída (vale como "Todas" — D-44(a)).',
  },
]

export const PLANNED_DOMAIN: readonly PlannedDomainFunction[] = [
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

// O scanner só extrai IDs RF/RNF/CA/D; "princípio N" nos comentários é curado aqui.
export const PRINCIPLES: readonly PrincipleInfo[] = [
  {
    number: 1,
    title: 'Dinheiro é inteiro (centavos)',
    enforcement: 'check-consistency (parseFloat/toFixed); testes de money e balances.',
    modules: [
      'src/domain/money.ts',
      'src/domain/types.ts',
      'src/components/ui/MoneyInput.tsx',
      'src/domain/transactionSchema.ts',
    ],
    tests: [
      'src/domain/money.test.ts',
      'src/domain/balances.properties.test.ts',
      'src/components/ui/MoneyInput.test.tsx',
      'src/domain/transactionSchema.test.ts',
    ],
    decisions: ['D-29', 'D-31'],
  },
  {
    number: 2,
    title: 'Datas sem fuso (YYYY-MM-DD / YYYY-MM)',
    enforcement: 'check-consistency (new Date com string de data); testes de fuso.',
    modules: [
      'src/domain/dates.ts',
      'src/domain/types.ts',
      'src/components/ui/DateInput.tsx',
      'src/components/ui/useToday.ts',
    ],
    tests: [
      'src/domain/dates.test.ts',
      'src/domain/dates.timezone.test.ts',
      'src/domain/dates.format.timezone.test.ts',
      'src/domain/dates.longDate.test.ts',
      'src/domain/dates.longDate.properties.test.ts',
      'src/components/ui/DateInput.test.tsx',
    ],
    decisions: ['D-38', 'D-45'],
  },
  {
    number: 3,
    title: 'Semana começa na segunda-feira',
    enforcement: 'check-consistency (weekStartsOn diferente de 1).',
    modules: ['src/domain/dates.ts'],
    tests: ['src/domain/dates.test.ts', 'src/domain/dates.calendar.test.ts'],
    decisions: [],
  },
  {
    number: 4,
    title: 'Somente BRL, localidade pt-BR',
    enforcement: 'Revisão; testes de formatação.',
    modules: [
      'src/domain/money.ts',
      'src/features/tags/tagTexts.ts',
      'src/components/ui/SignedAmount.tsx',
      'src/domain/dates.ts',
    ],
    tests: [
      'src/domain/money.test.ts',
      'src/features/tags/tagTexts.test.ts',
      'src/domain/dates.format.test.ts',
    ],
    decisions: ['D-29'],
  },
  {
    number: 5,
    title: 'Local-first (nada sai do aparelho)',
    enforcement:
      'check-consistency (chamadas de rede no código). Fase 6: o único caminho para fora é o arquivo de backup que o usuário entrega pela folha de compartilhamento ou pelo download (lib/share), sem rede.',
    modules: ['src/lib/share.ts', 'src/repositories/backupRepository.ts'],
    tests: ['src/lib/share.test.ts'],
    decisions: ['D-08'],
  },
  {
    number: 6,
    title: 'Lógica de negócio pura e testada',
    enforcement:
      'Regras de camada (domain/lib sem React e sem Dexie); cobertura RNF-07. Fase 6: criptografia, formato/migrações/integridade do backup e a regra do lembrete são funções puras; backupFormat recebe SCHEMA_VERSION por parâmetro para não importar o Dexie (D-47(b)).',
    modules: [
      'src/lib/crypto.ts',
      'src/lib/backupFormat.ts',
      'src/domain/backupReminder.ts',
      'src/domain/backupPasswordSchema.ts',
    ],
    tests: [
      'src/lib/crypto.test.ts',
      'src/lib/crypto.audit.test.ts',
      'src/lib/backupFormat.test.ts',
      'src/lib/backupFormat.audit.test.ts',
      'src/domain/backupReminder.test.ts',
      'src/domain/backupPasswordSchema.test.ts',
    ],
    decisions: ['D-47'],
  },
  {
    number: 7,
    title: 'Acesso a dados isolado em src/repositories',
    enforcement:
      'check-consistency e regras de camada (app/components/features → db proibido); exceção só em src/dev (D-30) e src/test (D-34).',
    modules: [
      'src/repositories/tagsRepository.ts',
      'src/repositories/transactionsRepository.ts',
      'src/repositories/settingsRepository.ts',
      'src/repositories/databaseInfo.ts',
      'src/repositories/backupRepository.ts',
    ],
    tests: [],
    decisions: ['D-30', 'D-34', 'D-37'],
  },
  {
    number: 8,
    title: 'Escritas atômicas (transação do Dexie)',
    enforcement: 'Revisão; testes de repositório.',
    modules: [
      'src/repositories/tagsRepository.ts',
      'src/repositories/transactionsRepository.ts',
      'src/repositories/backupRepository.ts',
    ],
    tests: [
      'src/repositories/tagsRepository.test.ts',
      'src/repositories/transactionsRepository.crud.test.ts',
      'src/repositories/backupRepository.test.ts',
      'src/repositories/backupRepository.audit.test.ts',
    ],
    decisions: ['D-02', 'D-39', 'D-07', 'D-47'],
  },
  {
    number: 9,
    title: 'IDs são UUID (crypto.randomUUID)',
    enforcement: 'check-consistency (Math.random).',
    modules: ['src/repositories/tagsRepository.ts', 'src/repositories/transactionsRepository.ts'],
    tests: [
      'src/repositories/tagsRepository.test.ts',
      'src/repositories/transactionsRepository.crud.test.ts',
    ],
    decisions: ['D-30'],
  },
  {
    number: 10,
    title: 'Mobile-first (alvo ≥ 44 px, safe areas)',
    enforcement: 'Revisão e teste manual no iPhone.',
    modules: [
      'src/components/ui/Button.tsx',
      'src/styles/utilities.css',
      'src/components/ui/inputClasses.ts',
      'src/components/ui/Toast.tsx',
      'src/index.css',
    ],
    tests: [],
    decisions: ['D-38'],
  },
  {
    number: 11,
    title: 'Interface em pt-BR; código em inglês',
    enforcement: 'Revisão.',
    modules: [],
    tests: [],
    decisions: [],
  },
  {
    number: 12,
    title: 'TypeScript estrito',
    enforcement: 'typecheck; check-consistency (strict no tsconfig, any explícito).',
    modules: ['tsconfig.app.json'],
    tests: [],
    decisions: [],
  },
  {
    number: 13,
    title: 'Nada de segredos no front-end',
    enforcement:
      'check-consistency (VITE_* com cara de segredo). Fase 6: a chave do backup vem só da senha digitada (PBKDF2), não é extraível e nunca é gravada; a senha não vai para log nem para mensagem de erro e sai do formulário depois de exportar.',
    modules: ['src/lib/crypto.ts', 'src/features/backup/useExportBackup.ts'],
    tests: ['src/lib/crypto.audit.test.ts'],
    decisions: ['D-08', 'D-47'],
  },
  {
    number: 14,
    title: 'Escopo fechado',
    enforcement: 'Política de dependências (D-18) e revisão contra a spec.',
    modules: ['package.json'],
    tests: [],
    decisions: ['D-18'],
  },
  {
    number: 15,
    title: 'Nada depende de passar o mouse',
    enforcement:
      'check-consistency (tooltip do Chart.js); revisão. Fase 5: o painel de filtros abre por toque no botão "Filtros" e a paginação tem o botão "Carregar mais" além do IntersectionObserver.',
    modules: [
      'src/features/transactions/filters/FilterBar.tsx',
      'src/features/transactions/filters/FilterToggle.tsx',
      'src/components/ui/LoadMore.tsx',
    ],
    tests: ['src/features/transactions/TransactionsPage.pagination.test.tsx'],
    decisions: ['D-44', 'D-45'],
  },
  {
    number: 16,
    title: 'Botão de envio só ativo com o formulário válido (spec 1.13)',
    enforcement:
      'Padrão em src/lib/formSubmit.ts (LIVE_VALIDATION + canSubmitForm com startsValid), obrigatório em todos os formulários; testes de tela conferem o botão desabilitado. Aplicado ao formulário de tags (Fase 3), ao de lançamento (Fase 4: "Lançar" e "Salvar") e aos de backup (Fase 6: "Exportar backup" também fica desabilitado durante a geração/entrega; "Importar backup" só com arquivo e senha; falhas de gravação ou de abertura ficam fora do setError — D-36).',
    modules: [
      'src/lib/formSubmit.ts',
      'src/components/tags/useTagForm.ts',
      'src/components/tags/TagForm.tsx',
      'src/components/transactions/useTransactionForm.ts',
      'src/components/transactions/TransactionForm.tsx',
      'src/components/ui/Button.tsx',
      'src/features/backup/useExportBackup.ts',
      'src/features/backup/useImportBackup.ts',
    ],
    tests: [
      'src/lib/formSubmit.test.ts',
      'src/features/backup/BackupPage.test.tsx',
      'src/features/tags/TagsPage.validation.test.tsx',
      'src/features/tags/TagsPage.test.tsx',
      'src/features/home/HomePage.form.test.tsx',
      'src/features/transactions/TransactionDetailPage.test.tsx',
    ],
    decisions: ['D-36'],
  },
]

export const DECISIONS: readonly DecisionInfo[] = [
  {
    id: 'D-01',
    title: 'Exatamente uma tag por lançamento',
    status: 'confirmed',
    impacts: [
      'src/components/tags/TagPicker.tsx',
      'src/domain/transactionSchema.ts',
      'src/repositories/transactionsRepository.ts',
    ],
  },
  {
    id: 'D-02',
    title: 'Tag em uso não pode ser excluída',
    status: 'confirmed',
    impacts: [
      'src/repositories/tagsRepository.ts',
      'src/domain/tags.ts',
      'src/features/tags/useTagsScreen.ts',
      'src/features/tags/DeleteTagBlockedDialog.tsx',
    ],
  },
  {
    id: 'D-03',
    title: 'Saldo geral só com data ≤ hoje (substituída pela D-42 em 21/10/2026)',
    status: 'superseded',
    supersededBy: 'D-42',
    impacts: [],
  },
  { id: 'D-04', title: 'Recorrentes mensais, sem dia fixo', status: 'confirmed', impacts: [] },
  { id: 'D-05', title: 'Pendências só no Previsto', status: 'confirmed', impacts: [] },
  { id: 'D-06', title: 'Parcelamento só para saídas', status: 'confirmed', impacts: [] },
  {
    id: 'D-07',
    title: 'Importação substitui tudo',
    status: 'confirmed',
    impacts: [
      'src/repositories/backupRepository.ts',
      'src/features/backup/useImportBackup.ts',
      'src/features/backup/ConfirmImportDialog.tsx',
      'src/repositories/backupRepository.test.ts',
      'src/features/backup/BackupPage.test.tsx',
    ],
  },
  {
    id: 'D-08',
    title: 'Criptografia só no arquivo de backup (senha obrigatória, mínimo 8)',
    status: 'confirmed',
    impacts: [
      'src/lib/crypto.ts',
      'src/domain/backupPasswordSchema.ts',
      'src/domain/backupPasswordSchema.test.ts',
    ],
  },
  {
    id: 'D-09',
    title: 'Nome provisório "Meus Gastos"',
    status: 'confirmed',
    impacts: ['index.html', 'src/app/pwa/pwaOptions.ts'],
  },
  {
    id: 'D-10',
    title: 'Descrição obrigatória (1–100)',
    status: 'confirmed',
    impacts: ['src/domain/transactionSchema.ts', 'src/domain/transactionSchema.test.ts'],
  },
  {
    id: 'D-11',
    title: 'Lembrete de backup após 7 dias',
    status: 'confirmed',
    impacts: [
      'src/domain/backupReminder.ts',
      'src/features/home/BackupReminder.tsx',
      'src/domain/backupReminder.test.ts',
      'src/features/home/BackupReminder.test.tsx',
    ],
  },
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
      'src/repositories/backupRepository.ts',
      'src/repositories/backupRepository.theme.test.ts',
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
    title:
      'Ferramentas DEV de dados de exemplo (semente, substituir, apagar mantendo settings; sem folha CSS própria — D-43)',
    status: 'confirmed',
    impacts: [
      'src/dev/sampleData/buildSampleData.ts',
      'src/dev/sampleData/seededRandom.ts',
      'src/dev/sampleData/sampleDataStore.ts',
      'src/dev/sampleData/useSampleDataTools.ts',
      'src/dev/sampleData/SampleDataTools.tsx',
      'src/features/settings/AboutPage.tsx',
      'src/index.css',
    ],
  },
  {
    id: 'D-31',
    title: 'Campo de valor com no máximo 10 dígitos (MAX_AMOUNT_DIGITS = 10, teto do RF-01)',
    status: 'confirmed',
    impacts: ['src/domain/money.ts', 'src/domain/money.test.ts', 'src/domain/balances.test.ts'],
  },
  {
    id: 'D-32',
    title:
      'Paleta de 12 cores sugeridas das tags; cor gravada em maiúsculas; tag nova com a 1ª cor',
    status: 'confirmed',
    impacts: [
      'src/domain/tags.ts',
      'src/domain/tagSchema.ts',
      'src/components/tags/TagColorPicker.tsx',
      'src/components/tags/useTagForm.ts',
      'src/domain/tags.test.ts',
    ],
  },
  {
    id: 'D-33',
    title:
      'Modais com <dialog> nativo (Modal com title obrigatória); conferir uso antes de confirmar; erros em pt-BR; Tab pode ir à interface do navegador, nunca ao app atrás (nota da spec 1.13)',
    status: 'confirmed',
    impacts: [
      'src/components/ui/Modal.tsx',
      'src/test/dialog.ts',
      'src/test/setup.ts',
      'src/features/tags/useTagsScreen.ts',
      'src/features/tags/TagFormDialog.tsx',
      'src/features/tags/ConfirmDeleteTagDialog.tsx',
      'src/features/tags/DeleteTagBlockedDialog.tsx',
      'src/styles/utilities.css',
    ],
  },
  {
    id: 'D-34',
    title:
      'Versões da Fase 3 (@hookform/resolvers 5.9.2), findBy com 3 s e seedDatabase nos testes de tela',
    status: 'confirmed',
    impacts: ['package.json', 'src/test/setup.ts', 'src/test/seedDatabase.ts'],
  },
  {
    id: 'D-35',
    title: 'Limite de 30 caracteres do nome da tag contado em unidades UTF-16',
    status: 'confirmed',
    impacts: ['src/domain/tags.ts', 'src/domain/tagSchema.ts', 'src/domain/tagSchema.test.ts'],
  },
  {
    id: 'D-36',
    title:
      'Princípio 16: envio só com formulário válido e fora do envio; erro de campo ao digitar; falha genérica fora do setError',
    status: 'confirmed',
    impacts: [
      'src/lib/formSubmit.ts',
      'src/lib/formSubmit.test.ts',
      'src/components/tags/useTagForm.ts',
      'src/components/tags/TagForm.tsx',
      'src/components/ui/Button.tsx',
      'src/features/tags/TagsPage.validation.test.tsx',
      'src/features/tags/TagsPage.test.tsx',
      'src/components/transactions/useTransactionForm.ts',
      'src/components/transactions/TransactionForm.tsx',
      'src/features/backup/useExportBackup.ts',
      'src/features/backup/useImportBackup.ts',
    ],
  },
  {
    id: 'D-37',
    title:
      'Componentes de domínio compartilhados em src/components/<entidade>/ (podem usar repositories); components/ui nunca importa repositories, features nem app',
    status: 'confirmed',
    impacts: [
      'src/components/tags/TagForm.tsx',
      'src/components/tags/useTagForm.ts',
      'src/components/tags/TagColorPicker.tsx',
      'src/components/tags/TagPicker.tsx',
      'src/components/tags/CreateTagDialog.tsx',
      'src/components/tags/tagFormTexts.ts',
      'src/components/transactions/TransactionForm.tsx',
      'src/components/transactions/useTransactionForm.ts',
      'src/components/transactions/TransactionRow.tsx',
      'src/components/transactions/NoTagsNotice.tsx',
      'src/components/transactions/transactionTexts.ts',
      'src/features/tags/TagFormDialog.tsx',
      '.claude/skills/atualizar-arquitetura/scan-architecture.mjs',
    ],
  },
  {
    id: 'D-38',
    title:
      'Telas da Fase 4: tag em chips-rádio, Toast "Lançamento salvo" no topo, edição volta à tela anterior, valor com exemplo R$ 0,00, datas DD/MM/AAAA (o item (e), ordem literal dos últimos, foi substituído pela D-40), virada do dia por useToday, descrição em UTF-16',
    status: 'confirmed',
    impacts: [
      'src/components/tags/TagPicker.tsx',
      'src/components/ui/Toast.tsx',
      'src/components/ui/useToast.ts',
      'src/components/ui/MoneyInput.tsx',
      'src/components/ui/useToday.ts',
      'src/components/transactions/useTransactionForm.ts',
      'src/components/transactions/TransactionRow.tsx',
      'src/features/transactions/useTransactionDetail.ts',
      'src/features/home/BalanceSummary.tsx',
      'src/domain/dates.ts',
      'src/domain/transactionSchema.ts',
    ],
  },
  {
    id: 'D-39',
    title:
      'Consultas da Fase 4 (saldo por toArray + domínio, mês por between, últimos 5 com data de corte e takeMostRecent, tag conferida na transação rw) e formulário só com Controller (React Compiler)',
    status: 'confirmed',
    impacts: [
      'src/repositories/transactionsRepository.ts',
      'src/domain/transactions.ts',
      'src/components/transactions/TransactionForm.tsx',
      'src/repositories/transactionsRepository.balances.test.ts',
    ],
  },
  {
    id: 'D-40',
    title: '"Últimos lançamentos" só com data até hoje (substitui a D-38(e))',
    status: 'confirmed',
    impacts: [
      'src/repositories/transactionsRepository.ts',
      'src/features/home/RecentTransactions.tsx',
      'src/features/home/HomePage.tsx',
      'src/domain/transactions.ts',
      'src/features/home/HomePage.form.test.tsx',
    ],
  },
  {
    id: 'D-41',
    title: 'Nenhuma otimização do bundle principal agora; medir a abertura no iPhone na Fase 11',
    status: 'confirmed',
    impacts: [
      'src/features/home/HomePage.tsx',
      'src/app/lazyPages.tsx',
      'src/features/home/BackupReminder.tsx',
      'src/repositories/settingsRepository.ts',
      'src/features/backup/BackupPage.tsx',
    ],
  },
  {
    id: 'D-42',
    title:
      'Saldo geral = todos os lançamentos, inclusive futuros e todas as parcelas (substitui a D-03); saldo do mês só o mês corrente',
    status: 'confirmed',
    impacts: [
      'src/domain/balances.ts',
      'src/repositories/transactionsRepository.ts',
      'src/features/home/BalanceSummary.tsx',
      'src/features/home/HomePage.form.test.tsx',
      'src/repositories/transactionsRepository.balances.test.ts',
    ],
  },
  {
    id: 'D-43',
    title:
      'Uma única folha Tailwind (src/index.css), inclusive em DEV; fontes pelo alias @tailwind-sources (serve inclui src/dev, build exclui)',
    status: 'confirmed',
    impacts: [
      'src/index.css',
      'vite.config.ts',
      'src/styles/tailwind-sources.build.css',
      'src/styles/tailwind-sources.serve.css',
      'src/styles/utilities.css',
      'src/styles/tailwindEntry.test.ts',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'src/dev/architecture/ArchitecturePage.tsx',
      'src/dev/sampleData/SampleDataTools.tsx',
    ],
  },
  {
    id: 'D-44',
    title:
      'Lista: índice date crescente invertido em memória, filtros no domínio, busca com foldText e espera de 250 ms, paginação por dias inteiros (50) com LoadMore',
    status: 'confirmed',
    impacts: [
      'src/repositories/transactionsRepository.ts',
      'src/domain/transactionFilters.ts',
      'src/domain/text.ts',
      'src/domain/tags.ts',
      'src/domain/transactions.ts',
      'src/features/transactions/useTransactionList.ts',
      'src/features/transactions/transactionListTexts.ts',
      'src/features/transactions/list/TransactionDayList.tsx',
      'src/features/transactions/filters/PeriodFilter.tsx',
      'src/components/ui/useDebouncedValue.ts',
      'src/components/ui/LoadMore.tsx',
      'src/domain/transactionFilters.performance.test.ts',
    ],
  },
  {
    id: 'D-45',
    title:
      'Tela da lista: busca sempre visível, painel "Filtros (N)", "Limpar filtros" com foco na busca, resumo pelos filtros aplicados, data por extenso no dia, "+ Novo", filtros no Zustand sem persist',
    status: 'confirmed',
    impacts: [
      'src/features/transactions/TransactionsPage.tsx',
      'src/features/transactions/filters/FilterBar.tsx',
      'src/features/transactions/filters/FilterToggle.tsx',
      'src/features/transactions/filters/ClearFiltersButton.tsx',
      'src/features/transactions/filters/TagFilter.tsx',
      'src/features/transactions/list/FilterSummary.tsx',
      'src/features/transactions/list/DaySection.tsx',
      'src/components/transactions/IncomeExpenseTotals.tsx',
      'src/components/transactions/TransactionRow.tsx',
      'src/components/tags/TagPicker.tsx',
      'src/components/ui/Page.tsx',
      'src/domain/dates.ts',
      'src/stores/uiStore.ts',
    ],
  },
  {
    id: 'D-46',
    title:
      'Testes em dois projetos do Vitest: unit (node, setup.unit.ts, todo *.test.ts fora de DOM_TEST_FILES) e dom (jsdom, setup.ts, todo *.test.tsx + DOM_TEST_FILES); pool forks mantido por causa do process.env.TZ',
    status: 'pending',
    impacts: [
      'vite.config.ts',
      'package.json',
      'src/test/setup.unit.ts',
      'src/test/setup.ts',
      'src/features/transactions/TransactionsPage.pagination.test.tsx',
      '.claude/skills/atualizar-arquitetura/scan-architecture.mjs',
    ],
  },
  {
    id: 'D-47',
    title:
      'Backup: envelope e cripto em lib/crypto (sal/IV novos, chave não extraível, senha NFC, base64 em blocos), backupFormat sem Dexie (migrações em cadeia, zod com invariantes, integridade, tetos de 10M iterações e 50 MB), settings só theme, repositório com transação r e rw única; useLastBackupAt no settingsRepository',
    status: 'pending',
    impacts: [
      'src/lib/crypto.ts',
      'src/lib/backupFormat.ts',
      'src/repositories/backupRepository.ts',
      'src/repositories/settingsRepository.ts',
      'src/lib/crypto.audit.test.ts',
      'src/lib/backupFormat.audit.test.ts',
      'src/repositories/backupRepository.audit.test.ts',
      'src/test/backupDataset.ts',
    ],
  },
  {
    id: 'D-48',
    title:
      'Tela de backup e lembrete: textos e estados de exportar/importar, "Salvar backup" quando a folha é bloqueada, modal "Importar backup?", "Último backup" no Início só dentro do aviso, PasswordInput/FileInput, Button com ref e foco no resultado',
    status: 'pending',
    impacts: [
      'src/features/backup/BackupPage.tsx',
      'src/features/backup/ExportBackupSection.tsx',
      'src/features/backup/useExportBackup.ts',
      'src/features/backup/ImportBackupSection.tsx',
      'src/features/backup/useImportBackup.ts',
      'src/features/backup/ConfirmImportDialog.tsx',
      'src/features/backup/LastBackupStatus.tsx',
      'src/features/backup/backupTexts.ts',
      'src/features/home/BackupReminder.tsx',
      'src/components/ui/PasswordInput.tsx',
      'src/components/ui/FileInput.tsx',
      'src/components/ui/Button.tsx',
      'src/lib/share.ts',
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
    title: 'D-47 e D-48 aguardando confirmação do dono',
    severity: 'warn',
    detail:
      'Registradas na §8.1 em 22/10/2026 (spec 1.23, ajustadas na 1.24 pela revisão). D-47: formato, criptografia e repositório do backup — envelope da §6.8 com a Web Crypto nativa (sal de 16 e IV de 12 bytes novos, chave AES-GCM 256 não extraível, PBKDF2-SHA-256 600.000, senha em NFC, base64 em blocos de 32 KiB, BackupDecryptionError); backupFormat sem Dexie (SCHEMA_VERSION por parâmetro, BACKUP_MIGRATIONS em cadeia, zod com as invariantes da §6.3, ordem de amounts, nameKey coerente, integridade com parcela ≤ count, tetos de 10.000.000 iterações e 50 MB); settings só com theme; leitura numa transação r e importação numa única rw; useLastBackupAt no settingsRepository. D-48: textos e estados da tela de backup, "Salvar backup" quando a folha é bloqueada, modal "Importar backup?", "Último backup" no Início só dentro do aviso, PasswordInput/FileInput, Button com ref e foco no resultado. Junto com a D-46 (projetos do Vitest), são três decisões aguardando confirmação. Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'docs/SPEC.md',
      'src/lib/crypto.ts',
      'src/lib/backupFormat.ts',
      'src/repositories/backupRepository.ts',
      'src/features/backup/BackupPage.tsx',
      'src/features/home/BackupReminder.tsx',
    ],
  },
  {
    title: 'Spec: "Último backup" no Início (RF-10) × só dentro do aviso (D-48(c))',
    severity: 'warn',
    detail:
      'O RF-10 ("Lembrete") diz: "Em Ajustes e na tela inicial aparece \'Último backup: há N dias\'". A D-48(c) decidiu que, no Início, o texto só aparece dentro do aviso dos 7 dias (com pelo menos um lançamento e sem backup ou com 7 dias ou mais); em Ajustes → Backup ele aparece sempre (LastBackupStatus). Hoje o código segue a D-48(c): com backup recente, o Início não mostra "Último backup". Depende do dono: confirmar a D-48 (e ajustar o texto do RF-10) ou pedir a linha sempre visível no Início.',
    modules: [
      'docs/SPEC.md',
      'src/features/home/BackupReminder.tsx',
      'src/features/home/HomePage.tsx',
      'src/features/backup/LastBackupStatus.tsx',
      'src/domain/backupReminder.ts',
    ],
  },
  {
    title: 'Pendente (dono): teste manual da Fase 6 no iPhone',
    severity: 'warn',
    detail:
      'Fase 6 implementada, testes reforçados (2.214 passando), revisão aprovada (inclusive segurança) e sugestões aplicadas; falta o roteiro da §7 no iPhone: exportar com uma senha → folha de compartilhamento → "Salvar em Arquivos" → iCloud Drive; abrir o arquivo no app Arquivos e conferir que está ilegível; importar com senha errada (erro, nada muda); remover o app da tela de início, adicionar de novo (app vazio) e importar (todos os dados voltam); conferir "Último backup: hoje". Só depois disso o app pode receber dados reais. Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'src/features/backup/BackupPage.tsx',
      'src/lib/share.ts',
      'src/lib/crypto.ts',
      'src/repositories/backupRepository.ts',
    ],
  },
  {
    title: 'PBKDF2 com 600.000 iterações: ~345 ms no PC, iPhone ainda não medido',
    severity: 'info',
    detail:
      'D-47(f): derivar a chave leva ~345 ms no PC de desenvolvimento (Node 22) e validar um backup de 10.000 lançamentos (~3 MB) ~130 ms. No Safari do iPhone a derivação pode ser várias vezes mais lenta; o botão mostra "Gerando backup…"/"Verificando backup…" e, se a demora fizer o navegador recusar a folha de compartilhamento (NotAllowedError), aparece "Salvar backup". RNF-05 fixa as 600.000 iterações: nada a mudar agora.',
    decided: 'Medir na Fase 11, junto com a abertura do app (D-41).',
    modules: ['src/lib/crypto.ts', 'src/features/backup/useExportBackup.ts', 'src/lib/share.ts'],
  },
  {
    title: 'Fase 6: Início +1,6 kB gzip e o Rolldown separou o chunk formSubmit (14,5 kB gzip)',
    severity: 'info',
    detail:
      'O Início ganhou o BackupReminder (domain/backupReminder + useLastBackupAt + useTransactionCount): ~1,6 kB gzip a mais no caminho de abertura. A criptografia, o backupFormat e o zod do backup ficam no chunk lazy BackupPage-*.js (~7,3 kB gzip). Com a tela de backup usando também o formulário, o Rolldown passou a separar o código compartilhado em formSubmit-*.js (~14,5 kB gzip: react-hook-form, resolvers e o padrão do princípio 16) e dexie-react-hooks-*.js: é o mesmo código que antes ficava no index-*.js, sem peso novo. Enquadra-se na D-41.',
    decided: 'Sem otimização agora (D-41); medir na Fase 11.',
    modules: [
      'src/features/home/HomePage.tsx',
      'src/features/home/BackupReminder.tsx',
      'src/repositories/settingsRepository.ts',
      'src/features/backup/BackupPage.tsx',
      'src/app/lazyPages.tsx',
      'src/lib/formSubmit.ts',
    ],
  },
  {
    title: 'PasswordInput e FileInput sem teste próprio',
    severity: 'info',
    detail:
      'Os dois primitivos novos de components/ui (D-48(d)) são cobertos só pelos testes de tela (BackupPage.test.tsx: campos achados pelo rótulo, autocomplete new-password, escolha do arquivo e troca de senha/arquivo limpando o erro). Mesma situação de Button, EmptyState e ErrorAlert desde a Fase 3; aceitável enquanto só a tela de backup os usa.',
    modules: [
      'src/components/ui/PasswordInput.tsx',
      'src/components/ui/FileInput.tsx',
      'src/features/backup/BackupPage.test.tsx',
    ],
  },
  {
    title: 'D-46 aguardando confirmação do dono',
    severity: 'warn',
    detail:
      'Registrada na §8.1 em 22/10/2026 (spec 1.21): testes em dois projetos do Vitest (test.projects, extends: true). unit: environment node com src/test/setup.unit.ts (só fake-indexeddb/auto e limpeza do Dexie), todo src/**/*.test.ts menos DOM_TEST_FILES — 48 arquivos e 1.450 testes, ~15 s. dom: jsdom com src/test/setup.ts, todo *.test.tsx e os 12 *.test.ts de DOM_TEST_FILES — 37 arquivos e 275 testes, ~44 s. Scripts test:unit e test:dom; npm test e test:coverage continuam rodando tudo. Pool forks mantido (threads quebra os testes de fuso: process.env.TZ é compartilhado entre threads). Junto, a corrida do IntersectionObserver simulado em TransactionsPage.pagination.test.tsx foi corrigida (dispara a cada tentativa do waitFor). Regra nova: um *.test.ts que precise de DOM tem de entrar em DOM_TEST_FILES. A rastreabilidade mostra a D-46 como "aguardando confirmação". Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'docs/SPEC.md',
      'vite.config.ts',
      'package.json',
      'src/test/setup.unit.ts',
      'src/test/setup.ts',
      'src/features/transactions/TransactionsPage.pagination.test.tsx',
      'CLAUDE.md',
      '.claude/agents/domain-test-writer.md',
    ],
  },
  {
    title: 'D-44 e D-45 aguardavam confirmação do dono',
    severity: 'warn',
    detail:
      'Registradas na §8.1 durante a Fase 5 (spec 1.19). D-44: consulta da lista pelo índice date em ordem crescente com inversão em memória, tipo/tag/texto filtrados no domínio, período invertido ignorado, busca com foldText e espera de 250 ms (texto vazio na hora), paginação por dias inteiros de 50 lançamentos com LoadMore (600 px + botão), tag do filtro excluída vale como "Todas", medições de desempenho. D-45: tela da lista — busca sempre visível, painel "Filtros (N)", "Limpar filtros" com foco na busca, resumo pelos filtros aplicados, cabeçalho do dia por extenso com IncomeExpenseTotals, TransactionRow sem data, estados vazios, "+ Novo" e filtros no Zustand sem persist. A rastreabilidade mostrava as duas como "aguardando confirmação".',
    modules: [
      'docs/SPEC.md',
      'src/repositories/transactionsRepository.ts',
      'src/domain/transactionFilters.ts',
      'src/features/transactions/useTransactionList.ts',
      'src/features/transactions/TransactionsPage.tsx',
      'src/stores/uiStore.ts',
    ],
    resolved: 'Confirmadas pelo dono em 22/10/2026 (spec 1.20).',
  },
  {
    title: 'Pendente (dono): teste manual da Fase 5',
    severity: 'warn',
    detail:
      'Fase 5 implementada, testes reforçados (1.724 passando), revisão aprovada e sugestões aplicadas; falta o roteiro da §7: gerar os dados de exemplo no PC e conferir que a rolagem é fluida; buscar "merc" e achar "Mercado" e "mercado do bairro"; combinar tag + período e conferir os totais com a soma manual de alguns itens; trocar de aba e voltar com os filtros mantidos e fechar o app com os filtros zerados. Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'src/features/transactions/TransactionsPage.tsx',
      'src/features/transactions/list/TransactionDayList.tsx',
      'src/dev/sampleData/SampleDataTools.tsx',
    ],
    resolved:
      'Validado pelo dono em 22/10/2026: roteiro da Fase 5 (rolagem com dados de exemplo, busca "merc", tag + período com totais, filtros mantidos ao trocar de aba e zerados ao fechar) funcionou no PC e no iPhone. Fase 5 concluída.',
  },
  {
    title:
      'Lista relê o período inteiro a cada gravação: 10.000 registros no Safari do iPhone ainda não medidos',
    severity: 'info',
    detail:
      'useTransactionsInPeriod é um useLiveQuery: qualquer gravação em transactions refaz toArray() do período (sem filtro de período, a tabela inteira) e o sortByRecency/summarizeTransactionList em memória. No PC (Node/Vitest), 10.000 lançamentos levam ~6 ms para ordenar e 1–5 ms para filtrar + agrupar + totalizar (teste de desempenho < 300 ms — RNF-02), mas a leitura real do IndexedDB no Safari do iPhone não foi medida. A D-44(a) adia a medição para a Fase 11, como a D-41.',
    decided: 'Medir na Fase 11 (D-44(a)).',
    modules: [
      'src/repositories/transactionsRepository.ts',
      'src/features/transactions/useTransactionList.ts',
      'src/domain/transactionFilters.ts',
      'src/domain/transactionFilters.performance.test.ts',
    ],
  },
  {
    title:
      'Suíte de testes leva ~70–90 s: o gargalo é o jsdom, criado uma vez por arquivo de teste',
    severity: 'info',
    detail:
      'Visto na Fase 5 (1.724 testes): o tempo vai para criar o ambiente jsdom em cada arquivo de teste (84 vezes na medição do orquestrador, 85 nesta atualização — metade do tempo medido pelo Vitest, inclusive nos de src/domain e src/lib, que não usam DOM), e não para os testes de propriedade. Opção: test.projects no vite.config.ts com environment: "node" para src/domain e src/lib (e o jsdom só para componentes, hooks e repositórios). Não aplicado na época: mexe na configuração do Vitest e é decisão do dono.',
    modules: ['vite.config.ts', 'src/test/setup.ts', 'src/test/setup.unit.ts', 'package.json'],
    resolved:
      'Resolvido pela D-46 (spec 1.21, 22/10/2026 — aguardando confirmação do dono): dois projetos do Vitest. unit em node com setup.unit.ts (48 arquivos, 1.450 testes, ~15 s) e dom em jsdom com setup.ts (37 arquivos, 275 testes, ~44 s); só os *.test.tsx e os 12 *.test.ts de DOM_TEST_FILES pagam o jsdom. Tempo total da suíte de ~72–85 s para ~50–55 s. Pool forks mantido (threads quebra os testes de fuso).',
  },
  {
    title: 'Pacote principal com 596 kB (188,9 kB gzip): o build avisa chunk acima de 500 kB',
    severity: 'info',
    detail:
      'Na Fase 4 o index-*.js foi de 423 kB / 135 kB gzip para 596,3 kB / 188,9 kB gzip, porque o Início (única tela fora do React.lazy — RNF-02) passou a montar o TransactionForm. Medições do revisor: zod ~23,6 kB gzip (zod/mini ~6,2 kB), react-hook-form + @hookform/resolvers ~13,3 kB, date-fns format + ptBR ~6,6 kB. O zod também chega ao caminho de abertura pelos repositórios: BalanceSummary → transactionsRepository → transactionSchema e RecentTransactions → tagsRepository → tagSchema (os repositórios validam com os schemas). Efeito colateral: o chunk TagsPage-*.js caiu para 6 kB (zod e RHF agora estão no pacote principal). Decidido pela D-41 (21/10/2026): aguardar a Fase 11 — nenhuma otimização agora; a abertura (RNF-02) será medida no iPhone e só então se decide entre formulário lazy, separar leitura e escrita nos repositórios (as consultas de leitura não precisam do schema) ou nada.',
    decided: 'Aguardar Fase 11 (D-41).',
    modules: [
      'src/features/home/HomePage.tsx',
      'src/components/transactions/TransactionForm.tsx',
      'src/features/home/BalanceSummary.tsx',
      'src/features/home/RecentTransactions.tsx',
      'src/repositories/transactionsRepository.ts',
      'src/repositories/tagsRepository.ts',
      'src/domain/transactionSchema.ts',
      'src/domain/tagSchema.ts',
      'src/app/lazyPages.tsx',
    ],
  },
  {
    title: 'D-37, D-38 e D-39 aguardando confirmação do dono',
    severity: 'warn',
    detail:
      'Registradas na §8.1 durante a Fase 4 (spec 1.14): componentes de domínio em src/components/<entidade>/ com acesso a repositórios e components/ui proibido de importar repositories/features/app (D-37); comportamento das telas — chips-rádio, Toast no topo, voltar depois de salvar/excluir, exemplo R$ 0,00, ordem literal dos últimos, DD/MM/AAAA, virada do dia, descrição em UTF-16 (D-38); consultas por índice com soma no domínio, últimos 5 com data de corte, tag conferida na transação e formulário só com Controller (D-39). A página mostrava as três como "aguardando confirmação" na rastreabilidade.',
    modules: [
      'docs/SPEC.md',
      'src/components/transactions/TransactionForm.tsx',
      'src/components/ui/useToday.ts',
      'src/repositories/transactionsRepository.ts',
    ],
    resolved:
      'Confirmadas pelo dono em 21/10/2026: D-37 e D-38 na spec 1.15 (o item (e) da D-38 foi substituído pela D-40) e D-39 na spec 1.16 (texto ajustado à D-42).',
  },
  {
    title: 'D-38(e): "Últimos lançamentos" mostram datas futuras no topo',
    severity: 'warn',
    detail:
      'A ordem segue o RF-02 ao pé da letra (data, depois criação — compareByRecency/takeMostRecent), então um lançamento com data de amanhã aparece antes dos de hoje. Com a Fase 10, cada compra parcelada cria parcelas em meses futuros, que tomariam os 5 lugares. O dono precisa decidir antes da Fase 10 (ex.: limitar a data ≤ hoje ou ordenar por criação).',
    modules: [
      'src/domain/transactions.ts',
      'src/repositories/transactionsRepository.ts',
      'src/features/home/RecentTransactions.tsx',
    ],
    resolved:
      'Resolvido pela D-40 (spec 1.15, 21/10/2026): a lista só mostra datas até hoje — listRecentTransactions(today, count) usa belowOrEqual(today) para o corte e between(corte, today) na releitura; na virada do dia um lançamento que era futuro passa a aparecer.',
  },
  {
    title: 'Pendente (dono): teste manual da Fase 4',
    severity: 'warn',
    detail:
      'Fase 4 implementada, testes reforçados (884 passando), revisão aprovada e sugestões aplicadas; falta o roteiro do iPhone da §7 (R$ 19,99 com teclado numérico; entrada de R$ 1.000,00 e saída de R$ 250,00 → +R$ 750,00 nos dois saldos; saída com data de amanhã muda o saldo geral e o do mês e não aparece nos últimos lançamentos — D-42/D-40; editar e excluir atualizam os saldos; excluir "Mercado" em uso → bloqueado com a contagem; fechar e reabrir mantém os dados e a data de hoje). Junto, reconfirmar o "Salvar" do princípio 16 nas tags (achado da Fase 3). Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'src/features/home/HomePage.tsx',
      'src/features/transactions/TransactionDetailPage.tsx',
      'src/repositories/transactionsRepository.ts',
    ],
    resolved:
      'Validado pelo dono em 21/10/2026, exceto o aviso "Lançamento salvo" (Toast) no PC com o tema escuro, que saiu ilegível em DEV e virou a correção D-43 (achados próprios abaixo). Os demais itens do roteiro, inclusive o "Salvar" das tags (princípio 16), passaram.',
  },
  {
    title: 'Toast "Lançamento salvo" com fundo claro e texto branco em DEV (tema escuro)',
    severity: 'danger',
    detail:
      'Teste manual da Fase 4, no PC com npm run dev e o tema escuro. Em DEV havia duas folhas Tailwind completas: src/index.css e as folhas próprias de src/dev (architecture.css e sampleData.css). Cada uma redeclarava as camadas; a folha DEV, carregada depois, fazia o .text-white vencer o .dark:text-slate-900 do app. O CSS de produção não era afetado.',
    modules: [
      'src/components/ui/Toast.tsx',
      'src/index.css',
      'vite.config.ts',
      'src/styles/tailwind-sources.serve.css',
      'src/styles/tailwind-sources.build.css',
    ],
    resolved:
      "Corrigido em 21/10/2026 (D-43, não commitado): folha Tailwind única. src/index.css faz @import '@tailwind-sources'; o vite.config.ts aponta o alias para tailwind-sources.build.css (@source not '../dev') no build e para tailwind-sources.serve.css nos outros comandos. architecture.css e sampleData.css foram removidos; utilities.css passou a ter um único importador. O teste src/styles/tailwindEntry.test.ts falha se outro .css fizer @import 'tailwindcss'.",
  },
  {
    title: 'Pendente (dono): confirmar a D-43 e revalidar o Toast no PC, tema escuro',
    severity: 'warn',
    detail:
      'A D-43 (spec 1.17) aguarda confirmação do dono, junto com o ajuste da D-30 e da §6.12 ("Estilos"). Falta revalidar no PC, com npm run dev e o tema escuro, que o aviso "Lançamento salvo" aparece legível (fundo escuro do app, texto claro) e que esta página e as ferramentas de dados de exemplo continuam estilizadas. Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'docs/SPEC.md',
      'src/components/ui/Toast.tsx',
      'src/index.css',
      'vite.config.ts',
      'src/styles/tailwindEntry.test.ts',
    ],
    resolved: 'Confirmado pelo dono em 21/10/2026 (spec 1.18: D-43 confirmada e Fase 4 concluída).',
  },
  {
    title:
      'Testes do Início instáveis depois da D-42: esperam um saldo e conferem o resto sem esperar',
    severity: 'warn',
    detail:
      'Visto em 21/10/2026 nesta atualização (não corrigido, fora do escopo da página): com a D-42 o saldo geral, o saldo do mês e os últimos lançamentos são três useLiveQuery independentes que respondem em ordens diferentes. Em HomePage.test.tsx, "saldo zero é neutro" espera só o saldo geral e lê o bloco do mês na hora (ainda "—"), e "lançar atualiza saldos e últimos lançamentos…" confere a lista dos últimos sem waitFor (veio só 1 item). Falharam na suíte completa e no arquivo isolado, alternando entre um e outro. Correção sugerida: esperar cada consulta com waitFor/findBy (como o teste novo do saldo do mês já faz).',
    modules: [
      'src/features/home/HomePage.test.tsx',
      'src/features/home/BalanceSummary.tsx',
      'src/features/home/RecentTransactions.tsx',
    ],
    resolved:
      'Corrigido em 21/10/2026: cada consulta passou a ser esperada com waitFor/findBy, e as asserções negativas da D-40 só rodam depois de um marcador de hoje aparecer na lista (helper expectFutureNotListed). 5 rodadas seguidas de src/features/home e 2 da suíte completa sem falha; uma D-40 quebrada de propósito derrubou 4 testes.',
  },
  {
    title: 'useToday só percebe a virada do dia no próximo foco ou visibilidade',
    severity: 'info',
    detail:
      'useToday recalcula "hoje" em visibilitychange, focus e pageshow (useSyncExternalStore); não há timer. Com o app aberto em primeiro plano à meia-noite, o saldo do mês, os últimos lançamentos e a data do formulário continuam no dia anterior até o usuário sair e voltar ou o foco mudar. Coerente com a D-38(g) (confirmada em 21/10/2026); um timer até a meia-noite seria a alternativa se o dono quiser.',
    modules: [
      'src/components/ui/useToday.ts',
      'src/components/transactions/useTransactionForm.ts',
      'src/features/home/HomePage.form.test.tsx',
    ],
  },
  {
    title: 'Teste instável: uma falha isolada que não se repetiu',
    severity: 'info',
    detail:
      'Durante a Fase 4 a suíte teve uma falha isolada que não voltou a acontecer, provavelmente em ThemeSection.test.tsx: o tema é aplicado num efeito depois do rádio marcado e, com a máquina ocupada, a checagem rodava antes. O teste passou a esperar com waitFor. Observar nas próximas execuções.',
    modules: ['src/features/settings/ThemeSection.test.tsx'],
  },
  {
    title: 'Padrões diferentes de campo: TagForm usa register, TransactionForm só Controller',
    severity: 'info',
    detail:
      'A D-39 explica que o formulário de lançamento usa Controller em todos os campos porque o React Compiler memoiza o ref do register e o reset depois de "Lançar" não limparia o campo. O TagForm continua com register("name"): não há bug hoje, porque ele nunca chama reset (o Modal desmonta os children ao fechar e cada abertura recria o formulário). Se um formulário de tag passar a ser reutilizado sem desmontar, seguir o padrão da D-39.',
    modules: [
      'src/components/tags/TagForm.tsx',
      'src/components/transactions/TransactionForm.tsx',
      'src/components/ui/Modal.tsx',
    ],
  },
  {
    title: 'Confirmar no iPhone que o aviso de versão nova aparece sem recarregar (item C 9)',
    severity: 'warn',
    detail:
      'Item C 9 do roteiro da Fase 2: o aviso "Nova versão disponível" só apareceu depois de recarregar a página no app instalado no iPhone, porque o visibilitychange nem sempre dispara. Corrigido em 19/10/2026 (spec 1.10, D-24 ampliada): checagem ao abrir, no visibilitychange, no focus, no online e a cada 30 min, decidida por shouldCheckForUpdate. Os testes automáticos (registerPwa.test.ts, inclusive "procura versão nova logo ao abrir, sem esperar visibilitychange") passam, mas falta a verificação manual: depois de um deploy, abrir ou voltar ao app instalado no iPhone e ver o aviso sem recarregar. Mover para os resolvidos quando o dono confirmar.',
    resolved:
      'Confirmado pelo dono em 20/10/2026, no teste manual da Fase 3: no app instalado no iPhone o aviso de versão nova aparece sem recarregar.',
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
    resolved:
      'Superado na Fase 4 (20/10/2026): o pacote principal cresceu para 596 kB / 188,9 kB gzip com o formulário no Início; ver o achado do bundle no topo.',
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
    title: 'Teste manual da Fase 3 (tags)',
    severity: 'warn',
    detail:
      'Fase 3 implementada, revisada e aprovada, com 612 testes automáticos passando; falta o roteiro de teste manual da §7 (criar "Mercado", "Salário" e "Lazer"; tentar "mercado" → "Já existe uma tag com esse nome"; renomear "Lazer" para "Diversão" e trocar a cor; excluir "Diversão"). O bloqueio por uso só pode ser testado à mão na Fase 4 (ou com os dados de exemplo DEV). Mover para os resolvidos quando o dono confirmar.',
    resolved:
      'Testado pelo dono em 20/10/2026: criar, editar, excluir, validação ao salvar, bloqueio com os dados de exemplo DEV, Esc, tema escuro e iPhone passaram. Dois pontos viraram mudanças da spec 1.13: o "Salvar" passou a ficar desabilitado com o formulário inválido (princípio 16, D-36) e o Tab que segue para a interface do navegador foi aceito (nota da D-33). Falta só reconfirmar o novo "Salvar" (achado abaixo).',
    modules: [
      'src/features/tags/TagsPage.tsx',
      'src/repositories/tagsRepository.ts',
      'src/components/ui/Modal.tsx',
    ],
  },
  {
    title: 'Pendente (dono): reconfirmar o novo comportamento do "Salvar" no formulário de tags',
    severity: 'warn',
    detail:
      'Princípio 16 / D-36 aplicados depois do teste manual da Fase 3: "Nova tag" abre com "Salvar" desabilitado (nome vazio, sem erro na tela); o erro do nome aparece enquanto digita (apagar tudo ou passar de 30 caracteres) e o botão desabilita na hora; nome repetido mostra o erro no campo e o botão volta quando o nome muda; o botão desabilitado é cinza e legível nos temas claro e escuro. Testes automáticos passam (TagsPage.validation.test.tsx, TagsPage.test.tsx, formSubmit.test.ts); falta conferir à mão, inclusive no iPhone. Mover para os resolvidos quando o dono confirmar.',
    modules: [
      'src/components/tags/useTagForm.ts',
      'src/components/tags/TagForm.tsx',
      'src/lib/formSubmit.ts',
      'src/components/ui/Button.tsx',
      'src/features/tags/TagsPage.validation.test.tsx',
    ],
  },
  {
    title: 'Princípio 16: falha genérica de gravação fora do setError do React Hook Form',
    severity: 'info',
    detail:
      'No react-hook-form 7.90, setError (inclusive no root) força isValid = false até a próxima validação; com "Salvar" ligado a canSubmitForm, uma falha do IndexedDB deixaria o botão desabilitado sem o usuário ter o que corrigir. Por isso useTagForm guarda essa falha num useState (saveError) e só o nome repetido, que é erro de campo, usa setError("name"). Desde a Fase 4 o useTransactionForm segue o mesmo padrão (saveError para falha de gravação, tag ou lançamento inexistente); os próximos formulários (recorrente, parcelamento) também devem seguir src/lib/formSubmit.ts. Fase 6: os formulários de backup seguem o padrão — useExportBackup guarda a falha em state.error e useImportBackup em openError/restoreError, fora do setError.',
    modules: [
      'src/lib/formSubmit.ts',
      'src/components/transactions/useTransactionForm.ts',
      'src/components/tags/useTagForm.ts',
      'src/features/tags/TagsPage.errors.test.tsx',
    ],
  },
  {
    title: 'D-32, D-33 e D-34 aguardavam confirmação do dono',
    severity: 'warn',
    detail:
      'Registradas na §8.1 durante a Fase 3 (spec 1.11): paleta de 12 cores e cor em maiúsculas (D-32), modais com <dialog> nativo e conferência de uso antes da confirmação (D-33), versões dos pacotes da Fase 3, findBy de 3 s e seedDatabase (D-34).',
    modules: [
      'docs/SPEC.md',
      'src/domain/tags.ts',
      'src/components/ui/Modal.tsx',
      'src/test/setup.ts',
      'src/test/seedDatabase.ts',
    ],
    resolved: 'Confirmadas pelo dono em 20/10/2026 (spec 1.12, §8.1).',
  },
  {
    title: 'Limite de 30 caracteres do nome da tag: unidades UTF-16 ou grafemas?',
    severity: 'warn',
    detail:
      'O RF-03 fala em "1 a 30 caracteres", mas o .max(30) do Zod conta unidades UTF-16 (String.length): um emoji simples conta como 2 e nomes com emoji passam do limite antes da hora. Apontado na revisão da Fase 3.',
    modules: ['src/domain/tags.ts', 'src/domain/tagSchema.ts', 'src/domain/tagSchema.test.ts'],
    resolved:
      'Resolvido pela D-35 (confirmada pelo dono em 20/10/2026, spec 1.12): o limite é contado em unidades UTF-16; comentário em TAG_NAME_MAX_LENGTH (src/domain/tags.ts). Contar grafemas com Intl.Segmenter foi descartado.',
  },
  {
    title: 'Domínio pronto antes das telas: balances sem uso em produção',
    severity: 'info',
    detail:
      'src/domain/balances.ts só é importado por testes (aparece como órfão na saúde) e formatBRL/digitsToCents ainda não têm tela. Esperado: as telas que o usam vêm nas Fases 4 (saldos, MoneyInput) e 7–8 (visões e gráficos). src/domain/tagColor.ts deixou de ser órfão na Fase 3 (TagChip e TagColorPicker).',
    modules: ['src/domain/balances.ts', 'src/domain/tagColor.ts', 'src/domain/money.ts'],
    resolved:
      'Fase 4 (20/10/2026): balances é usado em produção (overallBalance e totals pelo transactionsRepository; signedAmount pelo TransactionRow); formatBRL/digitsToCents pelo MoneyInput e formatSignedBRL pelo SignedAmount. groupBy*/runningBalance esperam as Fases 7 e 8.',
  },
  {
    title: 'Chunk da tela de tags com 136 kB (44 kB gzip) por causa do zod e do react-hook-form',
    severity: 'info',
    detail:
      'No build da Fase 3, TagsPage-*.js tem 136,8 kB (43,9 kB gzip, com o princípio 16), quase tudo zod 4 + react-hook-form + @hookform/resolvers. Fica fora do pacote principal (a tela é lazy; index-*.js continua com 423,5 kB / 135,3 kB gzip). Na Fase 4 o formulário de lançamento usa os mesmos pacotes: conferir se o Vite os separa num chunk compartilhado e medir no iPhone (RNF-02, Fase 11).',
    modules: [
      'src/features/tags/TagsPage.tsx',
      'src/domain/tagSchema.ts',
      'src/components/tags/useTagForm.ts',
      'src/app/lazyPages.tsx',
    ],
    resolved:
      'Fase 4 (20/10/2026): o Vite não criou chunk compartilhado — zod, react-hook-form e o resolver foram para o pacote principal, porque o Início (não lazy) usa o TransactionForm. TagsPage-*.js caiu para 6 kB. O custo passou para o achado do bundle de 596 kB.',
  },
  {
    title: 'recurrings e installmentGroups contados por varredura (sem índice tagId)',
    severity: 'info',
    detail:
      'getTagUsage conta lançamentos pelo índice tagId, mas a v1 do esquema (§6.4) não indexa tagId em recurrings nem em installmentGroups, então usa filter().count(), que lê a tabela inteira. Aceitável porque são tabelas pequenas (dezenas de registros); se crescerem, um índice exigiria version(2) e SCHEMA_VERSION = 2 (mudança de spec).',
    modules: ['src/repositories/tagsRepository.ts', 'src/db/database.ts'],
  },
  {
    title: 'domain/tagSchema depende de um pacote externo (zod)',
    severity: 'info',
    detail:
      'Único módulo de src/domain com import de pacote. O zod é puro (sem React, sem Dexie, sem DOM), então o princípio 6 continua valendo; o schema ficou fora de tags.ts na revisão da Fase 3 para quem só precisa de toTagNameKey (ex.: o gerador de dados DEV) não levar o zod junto. O repositório também valida com o mesmo schema (tagInputSchema.parse).',
    modules: [
      'src/domain/tagSchema.ts',
      'src/domain/tags.ts',
      'src/repositories/tagsRepository.ts',
    ],
  },
  {
    title: 'Primitivos novos sem teste próprio: Button, EmptyState e ErrorAlert',
    severity: 'info',
    detail:
      'Componentes de poucas linhas, sem lógica além de classes e role="alert"; cobertos indiretamente por TagsPage.test.tsx, TagsPage.errors.test.tsx e (o estado desabilitado do Button, princípio 16) TagsPage.validation.test.tsx. Modal e TagChip têm testes próprios. O modo overflow="truncate" (padrão) do TagChip passou a ser usado na Fase 4 pelo TransactionRow (últimos lançamentos). Na Fase 4 entraram mais primitivos sem teste próprio (SignedAmount, Toast, TextInput), cobertos pelos testes do Início e da edição; MoneyInput, DateInput (com Field) e TagPicker têm testes próprios.',
    modules: [
      'src/components/ui/Button.tsx',
      'src/components/ui/EmptyState.tsx',
      'src/components/ui/ErrorAlert.tsx',
      'src/components/ui/TagChip.tsx',
      'src/features/tags/TagsPage.errors.test.tsx',
    ],
  },
  {
    title: 'src/test/seedDatabase.ts acessa o db diretamente (só testes — D-34)',
    severity: 'info',
    detail:
      'Os testes de tela não podem importar o Dexie (princípio 7), mas precisam de lançamentos, recorrentes e parcelamentos para testar o bloqueio por uso, e essas tabelas ainda não têm repositório. seedRecords grava numa transação e readAllTags confere o resultado. Deve encolher conforme os repositórios surgirem: transactions ganhou repositório na Fase 4, mas o helper ainda grava lançamentos nos testes de tela; recurrings e installmentGroups esperam as Fases 9 e 10.',
    modules: ['src/test/seedDatabase.ts', 'src/features/tags/TagsPage.test.tsx'],
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
      'src/styles/tailwind-sources.build.css',
      'src/dev/architecture/ArchitecturePage.tsx',
    ],
    resolved:
      "Resolvido em 17/10/2026 (não commitado): src/index.css tem @source not './dev'; a página importa o próprio src/dev/architecture/architecture.css (source(none) + @source './'); variante dark e utilitários de safe area foram para src/styles/utilities.css, importado pelos dois. CSS de produção: 39,7 kB → 12,2 kB. Substituído em 21/10/2026 pela D-43: as duas folhas Tailwind completas em DEV causaram o bug do Toast; agora há uma folha única e o build exclui src/dev pelo alias @tailwind-sources (architecture.css e sampleData.css removidos).",
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
    'Plugins: React + React Compiler (via Babel) + Tailwind + VitePWA(PWA_OPTIONS) (importado de src/app/pwa/pwaOptions.ts por caminho relativo). Alias @/ → src/. Desde a D-43 é defineConfig(({ command }) => ...) e o alias @tailwind-sources aponta para src/styles/tailwind-sources.build.css quando command === "build" e para tailwind-sources.serve.css nos outros casos. Vitest no mesmo arquivo, desde a D-46 em dois projetos (test.projects, ambos com extends: true, herdando plugins, os aliases @/ e @tailwind-sources e o define): unit (environment node, setup src/test/setup.unit.ts, include src/**/*.test.ts menos DOM_TEST_FILES — 48 arquivos, 1.450 testes, ~15 s) e dom (jsdom, setup src/test/setup.ts, todo *.test.tsx + os 12 *.test.ts de DOM_TEST_FILES — 37 arquivos, 275 testes, ~44 s). Um *.test.ts novo que use DOM (document, window, localStorage, matchMedia, renderHook) falha em node com "document is not defined" e tem de entrar em DOM_TEST_FILES. Pool forks mantido: com threads os testes de fuso quebram (process.env.TZ é do processo, compartilhado entre as threads). Cobertura ≥ 90% em domain/lib somando os dois projetos (RNF-07). O scanner lê DOM_TEST_FILES e marca o projeto de cada teste (testProject, mostrado no inspetor). Fase 2: define { __APP_VERSION__ } com o version do package.json (D-27), que vale também nos testes. Fase 6: DOM_TEST_FILES ganhou src/lib/share.test.ts (navigator.share, document e URL.createObjectURL) e src/repositories/backupRepository.theme.test.ts (espelho do tema no localStorage) — agora 14 *.test.ts no dom; no total 98 arquivos de teste: 57 no unit e 41 no dom.',
  'tsconfig.node.json':
    'Inclui vite.config.ts e src/app/pwa/pwaOptions.ts (Fase 1) e, desde a D-43, src/styles/tailwindEntry.test.ts (lê o disco com node:fs), com allowImportingTsExtensions para o import relativo com .ts.',
  'tsconfig.app.json':
    'types: vite/client e vite-plugin-pwa/vanillajs (tipos do módulo virtual:pwa-register — Fase 1). D-43: exclude de src/styles/tailwindEntry.test.ts (tipado pelo tsconfig.node.json).',
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
    'Store Zustand única (§6.7), só em memória (sem persist): updateAvailable/setUpdateAvailable (Fase 1) e, desde a Fase 5, transactionFilters { text, type, tagId, from, to } com setFilters (parcial: só os campos informados mudam) e clearFilters (volta a EMPTY_TRANSACTION_FILTERS, de domain/transactionFilters). Os filtros duram enquanto o app está aberto e zeram ao fechar (D-45(f)). INITIAL_UI_STATE é exportado para src/test/setup.ts resetar o estado entre testes. viewGranularity/viewAnchorDate entram na Fase 7.',
  'src/components/ui/Notice.tsx':
    'Primitivo genérico (sem conhecimento de PWA). Sem teste próprio: coberto pelos testes de UpdateNotice e InstallHint.',
  'src/lib/updateCheck.ts':
    'Regra pura da D-24: shouldCheckForUpdate({ isOnline, isVisible, now, lastCheckAt }) só libera online, visível e com ≥ MIN_UPDATE_CHECK_GAP_MS (1 min) desde a última checagem; UPDATE_CHECK_INTERVAL_MS (30 min) é o intervalo do registerPwa. Relógio injetado (now), sem acesso a navigator/document. Criado na correção do item C 9 (Fase 2).',
  'src/lib/displayMode.ts':
    'Regra pura do modo instalado + a constante da media query (reusada pelo dublê src/test/matchMedia.ts).',
  'src/styles/utilities.css':
    'Variante dark e utilitários de safe area. Desde a D-43 tem um único importador, src/index.css (antes também era importado pelas folhas DEV, hoje removidas). Fase 1: pb-below-nav soma var(--update-notice-space, 0px); reserve-update-notice define esse espaço; bottom-above-nav posiciona o aviso logo acima da barra. Fase 3: max-h-dialog (100dvh menos 2rem e as safe areas de cima e de baixo) para o Modal.',
  'src/index.css':
    "Única folha Tailwind do projeto (D-43): @import 'tailwindcss' + utilities.css + @import '@tailwind-sources' (alias do vite.config.ts: no build, tailwind-sources.build.css com @source not '../dev'; em vite serve, tailwind-sources.serve.css sem @source, então as páginas DEV usam esta mesma folha). Variáveis --bottom-nav-height e --update-notice-height (Fase 1) como fonte única das alturas. Fase 4: scroll-margin-top/bottom em input/select/textarea, para o campo em foco (teclado do iPhone) não ficar atrás da barra inferior nem do topo com safe area (princípio 10).",
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
    'Fábrica tipada: cada chamada cria um contexto próprio, então Option só aceita valores do tipo T (verificado por @ts-expect-error no teste). Fase 4: prop variant = list (padrão, ThemeRadio) | segmented (TypeRadio do TransactionForm: alternador lado a lado, rádio sr-only, opção marcada preenchida e em negrito, foco no contorno do grupo); classes por variante em VARIANT_CLASSES.',
  'src/components/ui/useGoBack.ts':
    "Usa location.key === 'default' para saber se a página foi aberta direto pela URL.",
  'src/features/settings/ThemeSection.tsx':
    'Usa useTheme de src/repositories (D-22 quitada na Fase 2: nenhuma feature importa de src/app).',
  'src/test/setup.ts':
    'fake-indexeddb/auto, dublê de matchMedia e limpeza de DOM/localStorage após cada teste; desde a Fase 1 reseta o uiStore (INITIAL_UI_STATE); desde a Fase 2 limpa todas as tabelas do Dexie numa transação, depois do cleanup() (gravações pendentes dos componentes terminam antes). Fase 3: installDialogPolyfill() (src/test/dialog.ts — D-33) e configure({ asyncUtilTimeout: 3000 }) para o findBy (D-34); um mojibake num comentário foi corrigido no reforço dos testes. Desde a D-46 é o setup só do projeto dom (jsdom): todo *.test.tsx e os *.test.ts de DOM_TEST_FILES; os demais *.test.ts usam o setup.unit.ts, em node.',
  'src/features/transactions/TransactionsPage.pagination.test.tsx':
    'Projeto dom (jsdom). Simula o IntersectionObserver (o jsdom não tem) guardando os callbacks. D-46: com a nova ordem de execução apareceu uma corrida que já existia em "chegar perto do fim carrega mais sozinho" (1 falha em 10 rodadas): o observador simulado disparava uma vez só, às vezes antes de o LoadMore observar o fim da página. Corrigido: o disparo passou para dentro do waitFor, a cada tentativa.',
  'src/test/setup.unit.ts':
    'D-46: setup do projeto unit do Vitest (environment node). Só importa fake-indexeddb/auto e limpa todas as tabelas do Dexie numa transação depois de cada teste — sem Testing Library, polyfills de DOM, localStorage nem reset do Zustand. Serve aos testes de domain/lib e aos de repositório que chamam funções (sem renderHook). Os testes de repositório com renderHook ou localStorage ficam em DOM_TEST_FILES e usam o setup.ts.',
  'src/test/matchMedia.ts':
    'Dublê de window.matchMedia: esquema escuro controlável (com evento change) e, desde a Fase 1, o modo instalado (setDisplayModeStandalone).',
  'src/db/database.ts':
    'AppDatabase extends Dexie, banco "money-control", version(1).stores(...) igual à §6.4 e SCHEMA_VERSION = 1. Toda mudança futura cria version(n).upgrade e incrementa a constante. database.schema.test.ts compara o esquema real com a §6.4.',
  'src/domain/types.ts':
    'Tipos da §6.3 (Cents, DateString, PeriodString, Tag, Transaction, Recurring, InstallmentGroup, Setting).',
  'src/domain/money.ts':
    'Centavos inteiros (princípio 1): formatBRL/formatSignedBRL (U+00A0 e U+2212 — D-29), digitsToCents (até MAX_AMOUNT_DIGITS = 10 — D-31, os mesmos dígitos de MAX_AMOUNT_CENTS, o teto do RF-01), addCents com Number.isSafeInteger.',
  'src/domain/dates.ts':
    'Datas sem fuso (princípio 2) com parseISO do date-fns; semana de segunda (weekStartsOn: 1). Testes de calendário (bissextos, virada de ano) e de fuso (dates.timezone.test.ts). Fase 4: isValidDate (usada pelo transactionSchema); formatShortDate ("19/10/2026" só rearranjando o texto, sem date-fns, com checagem aritmética do calendário — rápida em listas, D-38(f)); formatMonthLabel ("outubro de 2026" com um Intl.DateTimeFormat em UTC criado no nível do módulo e Date.UTC, independente do fuso do aparelho). Testes em dates.format.test.ts e dates.format.timezone.test.ts (melhorias da revisão). Fase 5: formatLongDate ("terça-feira, 20 de outubro de 2026" com um Intl.DateTimeFormat em UTC no nível do módulo — CA-04.1, D-45(c)); toUtcDate usa setUTCFullYear porque Date.UTC trata os anos 0 a 99 como 1900 a 1999. Testes em dates.longDate.test.ts e dates.longDate.properties.test.ts.',
  'src/domain/balances.ts':
    'totals, overallBalance (todos os lançamentos, inclusive os futuros, sem today — D-42), groupByDay/Month/Tag (Map — D-29) e runningBalance. Fase 4: signedAmount exportado (CA-02.1, usado pelo TransactionRow; teste em balances.signedAmount.test.ts); overallBalance e totals usados pelo transactionsRepository. groupBy*/runningBalance esperam as Fases 7 e 8. Teste de propriedade em balances.properties.test.ts.',
  'src/domain/tagColor.ts':
    'readableTextColor pela luminância relativa (WCAG). Desde a Fase 3 usado pelo TagChip (CA-03.6) e pela paleta do TagColorPicker; tags.test.ts confere o contraste AA das 12 cores da D-32.',
  'src/repositories/settingsRepository.ts':
    'getSetting/setSetting e useSetting (useLiveQuery). Base de themeRepository; persistentStorageRepository usa o db direto porque precisa de transação com leitura e escrita. Fase 6: useLastBackupAt (useSetting("lastBackupAt")), aqui e não no backupRepository, para o Início (BackupReminder) e o LastBackupStatus lerem a data sem levar a criptografia e o zod do backup (D-47(e), D-41); o backupRepository grava a chave com setSetting.',
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
    'Função pura: semente + data de referência → 12 tags, 5.000 lançamentos em 36 meses, 4 recorrentes, 3 parcelamentos (D-30). Fase 3: o nameKey vem de toTagNameKey (src/domain/tags.ts), a mesma chave das telas; a cópia local toNameKey foi removida.',
  'src/dev/sampleData/sampleDataStore.ts':
    'replaceWithSampleData e clearAllData numa transação sobre as 4 tabelas de dados; mantém settings (D-30).',
  'src/dev/sampleData/useSampleDataTools.ts':
    'Importa o db (exceção ao princípio 7 — D-30), pede window.confirm e mostra a mensagem do resultado.',
  'src/styles/tailwind-sources.build.css':
    "D-43: fontes do Tailwind no vite build, escolhido pelo alias @tailwind-sources. Só @source not '../dev': nenhuma classe de src/dev entra no CSS do dist/ (§6.12).",
  'src/styles/tailwind-sources.serve.css':
    'D-43: fontes do Tailwind em vite serve (npm run dev). Sem @source: a detecção automática já varre src/ inteiro, inclusive src/dev, e as páginas DEV usam a folha única do app.',
  'src/styles/tailwindEntry.test.ts':
    "D-43: lê src/ com node:fs e falha se outro .css além de src/index.css fizer @import 'tailwindcss'. Tipado pelo tsconfig.node.json e excluído do tsconfig.app.json.",
  'src/dev/architecture/ArchitecturePage.tsx':
    'Página DEV (§6.12), carregada por React.lazy em src/app/devRoutes.tsx. Sem CSS próprio desde a D-43 (architecture.css removido): as classes vêm da folha Tailwind única, src/index.css, que só em vite serve varre src/dev.',
  'src/dev/sampleData/SampleDataTools.tsx':
    'Ferramentas DEV de dados de exemplo (D-30), carregadas com lazy() em Ajustes → Sobre. Sem CSS próprio desde a D-43 (sampleData.css removido).',
  'src/test/themeReference.ts':
    'parseStoredThemePreference: referência da regra do script inline do index.html (veio de lib/theme na revisão da Fase 2).',
  'src/test/factories.ts':
    'makeTransaction, income e expense (Fase 2); Fase 3: makeTag, makeRecurring e makeInstallmentGroup com um gerador de id compartilhado (nextId) e TIMESTAMP fixo. Fase 6: makeTag deriva o nameKey do nome com toTagNameKey (a validação do backup exige nameKey coerente — D-47(c)).',
  'src/test/dialog.ts':
    'Fase 3 (D-33): installDialogPolyfill — o jsdom não tem showModal()/close(); o substituto só alterna o atributo open e dispara close. Foco preso e camada superior não são simulados.',
  'src/test/seedDatabase.ts':
    'Fase 3 (D-34): seedRecords (transactions, recurrings, installmentGroups numa transação) e readAllTags, para testes de tela que não podem importar o Dexie enquanto essas tabelas não têm repositório (transactions ganhou o seu na Fase 4; recurrings e installmentGroups nas Fases 9 e 10). Fase 6: failNextTransactionsBulkAdd (vi.spyOn em db.transactions.bulkAdd) faz a próxima gravação em lote falhar, para o BackupPage.test.tsx conferir que a importação não altera nada (D-07) sem importar o Dexie.',
  'src/test/propertyHelpers.ts':
    'Gerador com semente e utilitários de calendário para os testes de propriedade.',
  'src/domain/tags.ts':
    'Fase 3, sem dependência externa: toTagNameKey (desde a Fase 5 = foldText(name).trim(): NFD → remove \\p{M} → minúsculas → trim no fim, idempotente; sinais avulsos como ^ e ´ ficam), TAG_NAME_MAX_LENGTH = 30 em unidades UTF-16 (D-35), SUGGESTED_TAG_COLORS (12 cores com rótulo pt-BR — D-32), findSuggestedTagColor, sortByTagName (Intl.Collator pt-BR, base, numeric; toSorted), TagUsage e isTagInUse (D-02).',
  'src/domain/tagSchema.ts':
    'Fase 3: tagInputSchema (zod) — nome com trim, 1–30 (D-35), cor #RRGGBB transformada para maiúsculas (D-32); TagInput (z.input, o que a tela envia) e TagValues (z.output, o que é gravado). Separado de tags.ts para não levar o zod a quem só usa as funções puras.',
  'src/repositories/tagsRepository.ts':
    'Fase 3: createTag (add), updateTag (transação rw get → put), getTagUsage (índice tagId em transactions; filter() em recurrings e installmentGroups), deleteTag (transação rw sobre as 4 tabelas: reconta e exclui — D-02), listTagsWithTransactionCount + useTagsWithTransactionCount (useLiveQuery). ConstraintError do &nameKey → DuplicateTagNameError (sem leitura prévia: vale também para duas abas); TagNotFoundError na edição de tag apagada. createTag/updateTag devolvem a Tag gravada (o atalho do CA-01.7 a seleciona). Fase 4: listTags (sortByTagName) + useTags (useLiveQuery) para o TagPicker e as linhas dos últimos lançamentos (teste em tagsRepository.listTags.test.ts).',
  'src/components/ui/Modal.tsx':
    'Fase 3 (D-33): <dialog> nativo com showModal()/close() seguindo a prop open; title obrigatória (aria-labelledby); Esc → onClose; Modal.Body e Modal.Actions; children só enquanto aberto; max-h-dialog. Testado em Modal.test.tsx (com o polyfill de src/test/dialog.ts).',
  'src/components/ui/TagChip.tsx':
    'Fase 3 (CA-03.6): fundo na cor, texto de readableTextColor, contorno leve; overflow truncate (padrão) | wrap. A cor nunca é a única informação: o nome está sempre escrito (RNF-06).',
  'src/components/ui/Button.tsx':
    'Fase 3: variantes primary | secondary | danger | danger-outline, min-h-11, type="button" por padrão. Desde o princípio 16 (spec 1.13) o disabled nativo vira cinza neutro em qualquer variante (DISABLED_CLASSES: slate-200/slate-600 no claro, slate-800/slate-400 no escuro, texto ≥ 4,5:1, cursor-not-allowed), no lugar da opacidade. Sem teste próprio (coberto por TagsPage.validation.test.tsx). Fase 6: ref?: Ref<HTMLButtonElement> como prop (React 19), para o foco ir ao "Salvar backup" (D-48(d)/(e)).',
  'src/components/ui/EmptyState.tsx': 'Fase 3: <p> de lista vazia. Sem teste próprio.',
  'src/components/ui/ErrorAlert.tsx':
    'Fase 3: <p role="alert"> em vermelho, anunciado assim que aparece. Sem teste próprio.',
  'src/features/tags/TagsPage.tsx':
    'Tela /ajustes/tags (RF-03): compõe Page, Button, EmptyState/TagList e os três modais; lê a lista por useTagsWithTransactionCount e o estado da tela por useTagsScreen. Não toca no Dexie.',
  'src/features/tags/useTagsScreen.ts':
    'Estado da tela: dialog (união discriminada TagsDialog), pendingStep (checking-usage | deleting | null) e deleteError. requestDelete confere o uso antes da confirmação; confirmDelete trata deleted/in-use; falhas viram mensagens de tagTexts.',
  'src/components/tags/useTagForm.ts':
    'Movido de features/tags na Fase 4 (D-37); textos em components/tags/tagFormTexts.ts; onSaved(tag) recebe a Tag gravada. useForm<TagInput, unknown, TagValues> com LIVE_VALIDATION (mode onChange) e zodResolver(tagInputSchema); padrão = valores da tag ou a 1ª cor da paleta (D-32). Devolve { form, submit, saveError, canSubmit } (princípio 16 / D-36): canSubmit = canSubmitForm(formState). DuplicateTagNameError → setError("name") com foco (CA-03.4; o botão volta quando o nome muda); TagNotFoundError/outras → saveError (useState à parte, porque o setError do RHF 7.90 força isValid = false e travaria o "Salvar").',
  'src/components/tags/TagForm.tsx':
    'Movido de features/tags na Fase 4 (D-37), usado também pelo CreateTagDialog (CA-01.7). Campos (Field + TextInput com register("name") — revisão da Fase 4, Controller → TagColorPicker), prévia TagChip wrap (useWatch) e ações em Modal.Body/Modal.Actions; slots extraAction e notice. Consome canSubmit ("Salvar" com disabled={!canSubmit} — princípio 16) e saveError (ErrorAlert).',
  'src/features/tags/TagFormDialog.tsx':
    'Modal "Nova tag"/"Editar tag" com TagForm (key = id); injeta "Excluir tag" e o ErrorAlert de falha ao conferir o uso.',
  'src/components/tags/TagColorPicker.tsx':
    'Movido de features/tags na Fase 4 (D-37), sem mudança de código. Paleta D-32 com rádios nativos (setas do teclado, estado anunciado) + <input type="color">; mostra a cor escolhida em texto (RNF-06).',
  'src/features/tags/TagList.tsx':
    'Lista com TagChip wrap + formatTransactionCount; cada linha é um botão que abre a edição (CA-03.5).',
  'src/features/tags/ConfirmDeleteTagDialog.tsx':
    'Confirmação "Excluir tag?" (CA-03.3) com ErrorAlert e "Excluir" desabilitado durante a exclusão.',
  'src/features/tags/DeleteTagBlockedDialog.tsx':
    'Aviso de bloqueio com as contagens por tipo de registro (CA-03.2, D-02).',
  'src/features/tags/tagTexts.ts':
    'Textos pt-BR da tela (falhas ao conferir/excluir), formatTransactionCount e formatTagUsage (Intl.NumberFormat e Intl.ListFormat pt-BR).',
  'src/lib/formSubmit.ts':
    'Princípio 16 / D-36 (spec 1.13): padrão de todos os formulários com React Hook Form. LIVE_VALIDATION = { mode: "onChange" } (erro do campo aparece enquanto digita) e canSubmitForm({ isValid, isSubmitting }) = isValid && !isSubmitting (botão de envio só ativo com o formulário válido e fora do envio). Só tipos do react-hook-form (import type): nenhum código do pacote entra pelo lib. Opção startsValid: formulário de edição que abre com dados válidos já começa com o botão ativo (o RHF só calcula isValid depois da 1ª renderização). Usado por useTagForm e, desde a Fase 4, por useTransactionForm; obrigatório nos formulários das fases seguintes.',
  'src/repositories/transactionsRepository.ts':
    'Fase 4 (RF-01/RF-02, D-39). Escrita: createTransaction e updateTransaction validam com transactionInputSchema.parse e gravam numa transação rw [tags, transactions] com assertTagExists (a tag não some entre a checagem e a gravação; deleteTag conta na mesma tabela — D-01/D-02); deleteTransaction simples. Leitura pelo índice date: getOverallBalance() (toArray() da tabela inteira + overallBalance — um getAll() nativo, mais rápido que each() — D-42, RNF-02), getMonthTotals (between + totals), listRecentTransactions(today, count) (data de corte por where("date").belowOrEqual(today).reverse().limit(n) + releitura between(corte, today) numa transação r; ordem por takeMostRecent — D-40) e getTransaction. Hooks useOverallBalance, useMonthTotals, useRecentTransactions e useTransaction (useLiveQuery, null para inexistente). Erros: TransactionNotFoundError e TransactionTagNotFoundError. Fase 5 (RF-04, D-44(a)): listTransactionsInPeriod(from, to) pelo índice date em ordem crescente (between / aboveOrEqual / belowOrEqual / orderBy) + toArray() (getAll nativo) e inversão em memória antes de sortByRecency — sem .reverse() do Dexie, que no Safari abriria um cursor com uma volta por registro; countTransactions() com count(). Hooks useTransactionsInPeriod(from, to) e useTransactionCount(). Testes em transactionsRepository.list.test.ts e .list.properties.test.ts.',
  'src/domain/transactionSchema.ts':
    'Fase 4 (RF-01): transactionInputSchema (zod) — tipo income|expense, amountCents inteiro de 1 a MAX_AMOUNT_CENTS, data YYYY-MM-DD existente (isValidDate), tagId não vazio, descrição com trim e 1 a DESCRIPTION_MAX_LENGTH = 100 unidades UTF-16 (D-10, D-38(h)); mensagens em pt-BR. TransactionInput (z.input) e TransactionValues (z.output). Separado das funções puras como o tagSchema; usado pelo formulário e pelo repositório.',
  'src/domain/transactions.ts':
    'Fase 4 (RF-02 item 5, D-39): compareByRecency (data, createdAt e id, comparados como texto) e takeMostRecent (sortByRecency + slice). Fase 5: sortByRecency (toSorted, sem alterar a original), usada também por listTransactionsInPeriod na lista (RF-04 / CA-04.1). O corte por data até hoje (D-40) fica na consulta do repositório, pelo índice date.',
  'src/components/ui/MoneyInput.tsx':
    'Fase 4 (CA-01.3/01.4, D-31, D-38(d)): máscara de app de banco — o valor sai sempre do texto inteiro (só dígitos, sem zeros à esquerda → digitsToCents), então colar ou substituir a seleção dá resultado coerente; inputMode="numeric", placeholder "R$ 0,00", alinhado à direita, cursor no fim. Liga-se ao Field por useFieldControl. Testado em MoneyInput.test.tsx.',
  'src/components/ui/DateInput.tsx':
    'Fase 4: <input type="date"> nativo com valor YYYY-MM-DD passado direto (princípio 2) e ajustes para o Safari do iOS. Testado em DateInput.test.tsx.',
  'src/components/ui/Field.tsx':
    'Fase 4: compound component Field + Field.Label + Field.Error; o contexto e o hook useFieldControl ficam em useFieldControl.ts, usado pelos controles (TextInput, MoneyInput, DateInput).',
  'src/components/ui/useFieldControl.ts':
    'FieldContext, useFieldContext (erro claro fora do <Field>) e useFieldControl: id, aria-invalid e aria-describedby do controle (RNF-06; aria-invalid conferido nos testes — melhoria da revisão).',
  'src/components/ui/TextInput.tsx':
    'Fase 4: input text com as props do useFieldControl e as classes comuns de inputClasses.ts.',
  'src/components/ui/inputClasses.ts':
    'TEXT_INPUT_CLASSES: alvo ≥ 44 px, fonte de 16 px (sem zoom do Safari no iOS) e borda vermelha com aria-invalid.',
  'src/components/ui/SignedAmount.tsx':
    'Fase 4 (CA-02.1): formatSignedBRL com verde/vermelho/neutro (contraste AA nos dois temas) e tamanhos sm | md | lg; o sinal está sempre no texto.',
  'src/components/ui/Toast.tsx':
    'Fase 4 (D-38(b)): região viva role="status" sempre montada, fixa no topo abaixo da safe area, pointer-events-none.',
  'src/components/ui/useToast.ts':
    'Estado do Toast: show(message) exibe por TOAST_DURATION_MS (3 s); a chave muda a cada show, então a mesma mensagem repetida reinicia o tempo.',
  'src/components/ui/useToday.ts':
    'Fase 4 (CA-02.2, D-38(g)): useSyncExternalStore assinando visibilitychange (document), focus e pageshow (window); snapshot = today() (string, sem render à toa). Sem timer: com o app em primeiro plano à meia-noite só atualiza no próximo foco/visibilidade (ver saúde).',
  'src/components/tags/TagPicker.tsx':
    'Fase 4 (RF-01, D-01, D-38(a)): chips-rádio nativos na cor da tag, contorno + "✓" na marcada, alvo de 44 px por chip (revisão), slot emptyState sem tags, erro por aria-describedby no fieldset. Fase 5: parte interna TagOption e prop allOptionLabel (opção "Todas" com valor "", chip neutro) para o TagFilter da lista (CA-04.2, D-45(a)). Testado em TagPicker.test.tsx e, com "Todas", nos testes de filtro da lista.',
  'src/components/tags/CreateTagDialog.tsx':
    'Fase 4 (CA-01.7): Modal "Nova tag" com TagForm; precisa ficar fora do <form> de quem o abre.',
  'src/components/tags/tagFormTexts.ts':
    'Fase 4: textos do formulário de tag (nome repetido — CA-03.4, falha ao salvar, tag inexistente), separados de features/tags/tagTexts.ts para components/ não importar de features (D-37).',
  'src/components/transactions/TransactionForm.tsx':
    'Fase 4 (RF-01, D-37): formulário único de lançamento (Início, novo, edição). Todos os campos por Controller (D-39); TagPicker com NoTagsNotice; CreateTagDialog e Toast fora do <form>; "Lançar"/"Salvar" com disabled={!canSubmit} (princípio 16); extraAction para o "Excluir" da edição. Lê useTags (repositório — permitido para components/<entidade>). Coberto pelos testes do Início e da edição.',
  'src/components/transactions/useTransactionForm.ts':
    'Fase 4: useForm com LIVE_VALIDATION + zodResolver(transactionInputSchema); defaultValues Saída + hoje ou os do lançamento; startsValid na edição; submit → createTransaction (reset mantendo tipo e data + Toast "Lançamento salvo") ou updateTransaction (onUpdated); erros de gravação em saveError (D-36); virada do dia troca a data só se ela ainda for a automática (ref autoFilledDate — D-38(g)).',
  'src/components/transactions/TransactionRow.tsx':
    'Fase 4: linha com Link para /lancamentos/:id (CA-01.5 / CA-04.5), descrição, TagChip, formatShortDate e SignedAmount(signedAmount). Fase 5: prop showDate (padrão true); a DaySection da lista passa showDate={false}, porque a data está no cabeçalho do dia (D-45(c)).',
  'src/components/transactions/NoTagsNotice.tsx': 'Fase 4 (CA-01.7): aviso sem tags + "Criar tag".',
  'src/components/transactions/transactionTexts.ts':
    'Fase 4: textos pt-BR do formulário de lançamento ("Lançamento salvo", falhas, lançamento/tag inexistente, aviso sem tags).',
  'src/features/home/HomePage.tsx':
    'Fase 4 (RF-02): Page com BalanceSummary (today de useToday), seção "Novo lançamento" com TransactionForm e RecentTransactions (today — D-40). Única tela fora do React.lazy (bundle decidido pela D-41). Fase 6: BackupReminder (today) no topo, antes do BalanceSummary (RF-10, D-11, D-48(c)).',
  'src/features/home/BalanceSummary.tsx':
    'Fase 4 (RF-02 itens 1–2, D-42, CA-02.3): useOverallBalance() (sem today) e useMonthTotals(periodOf(today)); "—" enquanto carrega; título com formatMonthLabel. Fase 5: entradas e saídas do mês pelo IncomeExpenseTotals.',
  'src/features/home/RecentTransactions.tsx':
    'Fase 4 (RF-02 item 5, D-40): prop today (do useToday do HomePage); useRecentTransactions(today, RECENT_TRANSACTIONS_COUNT) + useTags; TransactionRow ou EmptyState; link "Ver todos" para /lancamentos.',
  'src/features/home/homeTexts.ts': 'RECENT_TRANSACTIONS_COUNT = 5 e a mensagem da lista vazia.',
  'src/features/transactions/NewTransactionPage.tsx':
    'Fase 4: Page + BackLink (fallback /lancamentos) + TransactionForm. Parcelado na Fase 10.',
  'src/features/transactions/TransactionDetailPage.tsx':
    'Fase 4 (CA-01.5/01.6): TransactionForm em edição com "Excluir" e o modal de confirmação; "Lançamento não encontrado" para id inexistente (exceto durante a saída — isDone).',
  'src/features/transactions/useTransactionDetail.ts':
    'Fase 4: useTransaction(id), estado da exclusão (isConfirmingDelete, isDeleting, deleteError), isDone e finish → useGoBack("/lancamentos") depois de salvar ou excluir (D-38(c)).',
  'src/features/transactions/ConfirmDeleteTransactionDialog.tsx':
    'Fase 4 (CA-01.6): Modal "Excluir lançamento?" com ErrorAlert e "Excluir" desabilitado durante a exclusão.',
  'src/domain/text.ts':
    'Fase 5 (D-44(c)): foldText — normalize("NFD"), remove \\p{M} (só marcas combinantes; sinais avulsos ficam) e toLowerCase; não faz trim. Normalização única para a unicidade do nome da tag (toTagNameKey) e a busca na descrição (createTransactionMatcher). Testes de exemplos e de propriedade (idempotência, NFC × NFD).',
  'src/domain/transactionFilters.ts':
    'Fase 5 (RF-04, D-44), puro: TransactionFilters/EMPTY_TRANSACTION_FILTERS (§6.7), isPeriodInverted e effectivePeriod (período invertido não é aplicado), countActiveFilters/hasActiveFilters (período conta como um, mesmo inválido), createTransactionMatcher (testes baratos antes do foldText da descrição), filterTransactions, summarizeTransactionList (filtra, groupByDay e soma os totais pelos dias com addCents — CA-04.1/04.3) e countVisibleDays (páginas de dias inteiros — CA-04.6). Teste de desempenho com 10.000 lançamentos (< 300 ms — RNF-02), testes de propriedade e de auditoria.',
  'src/components/ui/useDebouncedValue.ts':
    'Fase 5 (D-44(c)): valor mais recente depois de delayMs sem mudanças, sem biblioteca. immediateValue (opcional) vale na hora e também substitui o valor atrasado (ajuste de estado durante a renderização, sem render extra): a busca vazia limpa a lista na hora e a anterior não reaparece se o usuário redigitar antes da espera (correção da revisão).',
  'src/components/ui/LoadMore.tsx':
    'Fase 5 (CA-04.6, D-44(d)): primitivo de fim de lista paginada. IntersectionObserver com rootMargin "0px 0px 600px 0px", refeito a cada página (loadedCount nas deps) para avisar de novo se o fim continuar à vista; botão "Carregar mais" como alternativa acessível. Sem IntersectionObserver (jsdom), só o botão.',
  'src/components/transactions/IncomeExpenseTotals.tsx':
    'Fase 5 (D-45(c)): <dl> com "Entradas" e "Saídas" escritos (RNF-06), formatBRL e tabular-nums. Extraído do BalanceSummary; usado também por DaySection e FilterSummary.',
  'src/features/transactions/TransactionsPage.tsx':
    'Fase 5 (RF-04, D-45): substitui o placeholder. Page.Header com NewTransactionLink (local) no trailing, FilterBar composto, FilterSummary com filtro aplicado, os dois EmptyState (sem lançamentos / sem resultado) e TransactionDayList com key = filtersKey. Nada aparece enquanto os dados carregam. Dados só por useTransactionList.',
  'src/features/transactions/useTransactionList.ts':
    'Fase 5 (RF-04, D-44): um seletor do Zustand por campo de transactionFilters; texto com useDebouncedValue(…, SEARCH_DEBOUNCE_MS, "") — só espaços conta como vazio; effectivePeriod; useTransactionsInPeriod (índice date), useTransactionCount e useTags. Tag do filtro excluída: vale como "Todas" nos filtros aplicados e um useEffect chama setFilters({ tagId: null }) (correção da revisão). summary = summarizeTransactionList(transações, filtros aplicados); isFiltering e filtersKey também pelos filtros aplicados (o resumo não mostra os totais sem filtro durante a espera — correção da revisão).',
  'src/features/transactions/transactionListTexts.ts':
    'Fase 5: textos pt-BR da lista (Limpar filtros, Carregar mais, Novo, estados vazios, aviso de período invertido), SEARCH_DEBOUNCE_MS = 250, LIST_PAGE_ITEM_COUNT = 50 e formatResultCount ("5.000 lançamentos encontrados", Intl.NumberFormat criado uma vez).',
  'src/features/transactions/filters/FilterBar.tsx':
    'Fase 5 (CA-04.2, D-45(a)): compound component com role="search". Estado local isPanelOpen, panelId (useId) e searchInputRef, repassados pelo FilterBarContext. Partes locais FilterBarActions e FilterBarPanel (hidden enquanto fechado); partes importadas por atribuição (FilterBar.Text = TextFilter etc.), que o scanner lê em compoundParts.',
  'src/features/transactions/filters/filterBarContext.ts':
    'Fase 5: FilterBarContext (isPanelOpen, togglePanel, panelId, searchInputRef) e useFilterBar(part) com erro claro quando a parte está fora do <FilterBar>.',
  'src/features/transactions/filters/FilterToggle.tsx':
    'Fase 5: botão "Filtros (N)" com aria-expanded/aria-controls; N = countActiveFilters de tipo, tag e período (o texto não conta). Só lê o Zustand.',
  'src/features/transactions/filters/ClearFiltersButton.tsx':
    'Fase 5 (CA-04.4): só aparece com filtro preenchido (hasActiveFilters dos 5 campos, pelo texto digitado); clearFilters() e foco no campo de busca pelo searchInputRef (RNF-06 — correção da revisão).',
  'src/features/transactions/filters/TextFilter.tsx':
    'Fase 5 (CA-04.2): Field "Buscar na descrição" + TextInput ligado ao searchInputRef; grava setFilters({ text }) a cada tecla; enterKeyHint="search" e Enter só fecha o teclado (D-45(a)).',
  'src/features/transactions/filters/TypeFilter.tsx':
    'Fase 5 (CA-04.2): createRadioGroup<TransactionTypeFilter>() segmented com Todos | Entradas | Saídas; grava setFilters({ type }).',
  'src/features/transactions/filters/TagFilter.tsx':
    'Fase 5 (CA-04.2): TagPicker com allOptionLabel="Todas" ("" ↔ null) e emptyState "Nenhuma tag cadastrada."; nada enquanto as tags carregam.',
  'src/features/transactions/filters/PeriodFilter.tsx':
    'Fase 5 (CA-04.2, D-44(b)): Data inicial e Data final (DateInput, "" ↔ null), inclusivas; período invertido mostra INVERTED_PERIOD_MESSAGE no campo final (Field.Error) e não é aplicado. Em coluna no iPhone, duas colunas a partir de sm.',
  'src/features/transactions/list/FilterSummary.tsx':
    'Fase 5 (CA-04.3): "N lançamentos encontrados" (role="status"), Resultado com SignedAmount e IncomeExpenseTotals do conjunto filtrado inteiro, não só da parte visível.',
  'src/features/transactions/list/DaySection.tsx':
    'Fase 5 (CA-04.1): h2 com formatLongDate (1ª letra maiúscula pelo CSS first-letter), totais do dia e TransactionRow com showDate={false}.',
  'src/features/transactions/list/TransactionDayList.tsx':
    'Fase 5 (CA-04.6, D-44(d)): guarda itemTarget (meta de itens) e deriva os dias visíveis por countVisibleDays a cada render, acompanhando a lista ao vivo; LoadMore pede itemCount + LIST_PAGE_ITEM_COUNT. Volta à 1ª página quando o pai troca a key.',
  'src/test/transactionList.ts':
    'Fase 5: apoio aos testes de tela da lista (openList, transactionLinks, expectRowCount, searchInput/typeSearch, openFiltersPanel e afins), sobre renderApp, seedRecords e makeTransaction.',
  'src/components/ui/Page.tsx':
    'Compound component Page (Page.Header com leading, Page.Body). Fase 5: slot trailing no Page.Header (h1 com flex-1), para o "+ Novo" da lista (D-45(e)).',
  'src/test/transactionForm.ts':
    'Fase 4: ações do formulário de lançamento para testes de tela (typeAmount dígito a dígito, chooseTag, fillTransactionForm, submit esperando o botão habilitar — princípio 16, expectSubmitEnabled), com escopo opcional (within).',
  'src/dev/architecture/model.ts':
    'Importa o JSON gerado e expõe graph/moduleById e filtros comuns. Os índices derivados ficam em layers.ts, composition.ts, traceability.ts, health.ts e search.ts, todos calculados uma vez no carregamento.',
  'src/lib/crypto.ts':
    'Fase 6 (RF-10, RNF-05, §6.8, D-47(a)): Web Crypto nativa (crypto.subtle, só em contexto seguro — RNF-09). encryptBackupText: sal de 16 e IV de 12 bytes novos por chamada (getRandomValues), deriveKey = importKey(raw, senha.normalize("NFC")) + deriveKey(PBKDF2-SHA-256, PBKDF2_ITERATIONS = 600.000) → chave AES-GCM 256 não extraível (encrypt/decrypt), encrypt e o envelope { format: "app-gastos-backup", formatVersion: 1, createdAt, kdf, cipher, ciphertext }. decryptBackupText usa o sal, o IV e as iterações do envelope; OperationError (autenticação do GCM) vira BackupDecryptionError ("Senha incorreta ou arquivo corrompido" — CA-10.2). bytesToBase64 em blocos de 32 KiB (não estoura a pilha); base64ToBytes lança em texto inválido. iterations e now só são passados pelos testes. A senha e o texto em claro nunca vão para log nem mensagem de erro (princípio 13).',
  'src/lib/backupFormat.ts':
    'Fase 6 (§6.8, CA-10.3 a CA-10.5, D-47(b)–(d)): sem Dexie (SCHEMA_VERSION chega por parâmetro). parseBackupEnvelope: zod do envelope (base64 do sal com 16 e do IV com 12 bytes, ciphertext com pelo menos a tag do GCM, iterações ≤ MAX_PBKDF2_ITERATIONS = 10.000.000). parseBackupContent: cabeçalho app/schemaVersion → NewerBackupVersionError se mais nova → migrateBackupContent em cadeia (BACKUP_MIGRATIONS vazio; migração faltando = InvalidBackupFileError) → zod dos registros (cents z.int().positive(), datas que existem, YYYY-MM, #RRGGBB, ISO 8601, pares recurringId/recurringPeriod e installmentGroupId/installmentNumber, 2 a 48 parcelas, .refine da ordem de amounts e do nameKey = toTagNameKey(name)) → hasReferentialIntegrity (IDs únicos por tabela, nameKey único, tagId/recurringId/installmentGroupId existentes, parcela ≤ count). Exportação: selectBackupSettings (só theme válido; senão []), buildBackupContent, backupFileName (data local). summarizeBackup para o modal. MAX_BACKUP_FILE_BYTES = 50 MB.',
  'src/lib/share.ts':
    'Fase 6 (RF-10, §6.8 passos 6–7): shareOrDownloadFile(file) → "shared" | "downloaded" | "cancelled" | "blocked". navigator.canShare({ files }) → navigator.share; AbortError = cancelled, NotAllowedError = blocked (sem toque recente — D-48(a)), outras falhas relançadas. Sem suporte: <a download> escondido e URL liberada depois de OBJECT_URL_REVOKE_DELAY_MS (10 s). Nada vai para a rede (princípio 5). Teste no projeto dom (DOM_TEST_FILES).',
  'src/domain/backupReminder.ts':
    'Fase 6 (RF-10, D-11, D-48(c)): BACKUP_REMINDER_DAYS = 7; daysSinceLastBackup(lastBackupAt ISO, today) em dias de calendário locais (parseISO + differenceInCalendarDays; relógio atrasado → 0; data inválida → null); describeLastBackup → "Último backup: nunca / hoje / há 1 dia / há N dias"; shouldShowBackupReminder exige pelo menos um lançamento e (nunca ou ≥ 7 dias).',
  'src/domain/backupPasswordSchema.ts':
    'Fase 6 (RF-10, D-08, D-48): exportPasswordSchema (senha ≥ 8 — BACKUP_PASSWORD_MIN_LENGTH — e confirmação igual, erro no campo confirmation) e importBackupSchema (arquivo obrigatório e senha preenchida — "Informe a senha"; o tamanho mínimo não é conferido na importação). Mensagens exportadas para os testes.',
  'src/repositories/backupRepository.ts':
    'Fase 6 (RF-10, §6.8, D-07, D-47(e)): único caminho da tela de backup até o Dexie (princípio 7), importado só pela tela lazy (crypto e zod fora do pacote principal — D-41). readBackupTables: transaction("r") nas 5 tabelas com toArray. createBackupFile(password): buildBackupContent → encryptBackupText → File(gastos-backup-YYYY-MM-DD.json). deliverBackupFile(file, share = shareOrDownloadFile) chama recordBackupDone (setSetting lastBackupAt, ISO 8601) só com shared/downloaded. openBackupFile(file, senha): tamanho → envelope → decrypt → conteúdo; não toca no banco. restoreBackup(data): uma transação("rw") nas 5 tabelas — clear das 4 tabelas de dados, bulkAdd de tags, recurrings, installmentGroups e transactions, put de settings.theme (o do backup ou system); lastBackupAt e persistRequested ficam; writeThemeMirror depois do commit (D-28) e devolve o tema.',
  'src/components/ui/PasswordInput.tsx':
    'Fase 6 (D-48(d)): input type="password" sem autocapitalização, autocorreção nem verificação ortográfica; autoComplete obrigatório (new-password | current-password); useFieldControl liga rótulo e erro do Field; ref como prop (React 19). Sem teste próprio (coberto por BackupPage.test.tsx).',
  'src/components/ui/FileInput.tsx':
    'Fase 6 (D-48(d)): input type="file" com o botão nativo estilizado (file:min-h-11, visual de botão secundário) e onFileChange(File | null) no lugar de value/onChange; useFieldControl e ref. Sem teste próprio (coberto por BackupPage.test.tsx).',
  'src/features/backup/BackupPage.tsx':
    'Fase 6 (RF-10): Page com BackLink (fallback /ajustes) e LastBackupStatus, ExportBackupSection e ImportBackupSection. Lazy (lazyPages.tsx); sem estado próprio.',
  'src/features/backup/LastBackupStatus.tsx':
    'Fase 6 (RF-10, D-48(c)): "Último backup: …" com useToday + useLastBackupAt; nada enquanto carrega.',
  'src/features/backup/ExportBackupSection.tsx':
    'Fase 6 (RF-10, D-48(a)): formulário de senha + confirmação com Controller → PasswordInput, ErrorAlert, status role="status" e um único botão: "Exportar backup"/"Gerando backup…" ou "Salvar backup" (ref saveButtonRef). statusRef e saveButtonRef saem do objeto do hook antes de ler o resto (regra react/refs).',
  'src/features/backup/useExportBackup.ts':
    'Fase 6 (RF-10, princípio 16, D-48(a)/(e)): useForm com LIVE_VALIDATION + zodResolver(exportPasswordSchema); form.subscribe na senha reconfere a confirmação já mexida. submit: createBackupFile → deliver (deliverBackupFile) → applyOutcome: blocked guarda pendingFile ("Salvar backup"), cancelled só a mensagem, shared/downloaded reset do formulário (a senha sai da memória) + "Backup exportado.". Falha → "Não foi possível gerar o backup. Tente novamente." em state.error (fora do setError — D-36). Foco por useEffect: botão "Salvar backup" ou a mensagem. Devolve statusRef e saveButtonRef; canSubmit = canSubmitForm && !isBusy.',
  'src/features/backup/ImportBackupSection.tsx':
    'Fase 6 (RF-10, D-48(b)): <form key={formKey}> com Controller → FileInput (accept application/json,.json) e PasswordInput (current-password), ErrorAlert do openError e "Importar backup"/"Verificando backup…"; status fora do <form> (sobrevive à recriação e recebe o foco); ConfirmImportDialog como irmão.',
  'src/features/backup/useImportBackup.ts':
    'Fase 6 (RF-10, CA-10.2/10.3/10.5, D-07, D-48(b)/(e)): useForm com zodResolver(importBackupSchema); submit → openBackupFile → pending { content, summary: summarizeBackup } ou openError = describeOpenError (limpo por form.subscribe ao trocar arquivo ou senha). confirmImport → restoreBackup → setPreference(tema) (useTheme) → reset + formKey + 1 + mensagem nova (objeto, para refocar); falha → restoreError no modal. cancelImport ignorado durante a substituição. Devolve statusRef.',
  'src/features/backup/ConfirmImportDialog.tsx':
    'Fase 6 (RF-10, D-07): Modal "Importar backup?" com InfoList (data e hora, lançamentos, tags, recorrentes), REPLACE_WARNING, ErrorAlert e Cancelar | Substituir dados (desabilitados durante a substituição). Sem estado.',
  'src/features/backup/backupTexts.ts':
    'Fase 6: rótulos e mensagens da tela de backup (as dos CA-10.2, CA-10.3 e CA-10.5 exatamente como na spec); describeOpenError mapeia BackupDecryptionError, InvalidBackupFileError e NewerBackupVersionError; formatCount (Intl pt-BR) e formatBackupDate ("17/10/2026 às 15:05", parseISO + format).',
  'src/features/home/BackupReminder.tsx':
    'Fase 6 (RF-10 "Lembrete", D-11, D-48(c)): recebe today; useLastBackupAt + useTransactionCount; null enquanto carrega ou sem motivo; Notice subtle com describeLastBackup + "Faça um backup para não perder seus dados." e Link "Fazer backup" para /ajustes/backup. Não importa o backupRepository (D-41).',
  'src/test/backupDataset.ts':
    'Fase 6 (testes reforçados, CA-10.1): generateBackupDataset(seed, { maxTransactions }) gera, com semente (createTestRandom, sem bibliotecas extras), as 5 tabelas da §6.3 — tags com nameKey, lançamentos avulsos, de recorrente e de parcelamento, recorrentes com histórico de valores e meses pulados, parcelamentos de 2 a 48 parcelas e as 3 chaves de settings — com textos difíceis (acentos, emoji, aspas, quebras de linha, escrita não latina) e IDs UUID reprodutíveis (princípio 9). Usado nos testes de ida e volta e de auditoria do backup.',
}
