// Tipos do grafo gerado pelo scanner (data/module-graph.json) e dos dados curados à mão
// (data/curated.ts, data/timeline.ts) — §6.12.

export type Layer =
  | 'config'
  | 'entry'
  | 'app'
  | 'features'
  | 'components'
  | 'repositories'
  | 'db'
  | 'stores'
  | 'domain'
  | 'lib'
  | 'test'
  | 'dev'
  | 'assets'
  | 'other'

export type ModuleKind =
  | 'test'
  | 'component'
  | 'page'
  | 'lazy'
  | 'hook'
  | 'store'
  | 'database'
  | 'routing'
  | 'context'
  | 'data'
  | 'types'
  | 'module'
  | 'config'
  | 'html'

export type ConfigValue = string | number | boolean | null | string[]

export interface ExternalImport {
  package: string
  specifier: string
  kind: string
  names: string[]
}

export interface DexieTableUse {
  reads: string[]
  writes: string[]
}

export interface GraphModule {
  id: string
  layer: Layer
  feature: string | null
  group: string
  kinds: ModuleKind[]
  loc: number
  exports: string[]
  typeExports: string[]
  defaultExport: string | null
  functions: { name: string; signature: string }[]
  components: string[]
  props: Record<string, number>
  hooksDefined: string[]
  hooksUsed: string[]
  jsxUsed: string[]
  /** Partes de compound component atribuídas no módulo (`FilterBar.Text = TextFilter` → Text: TextFilter). */
  compoundParts?: Record<string, string>
  storesUsed: string[]
  /** Só em stores Zustand: chaves das interfaces `*State` e `*Actions` (§6.7). */
  store?: { state: string[]; actions: string[] }
  /** Campos/ações de stores importadas diretamente que aparecem no código deste módulo. */
  storeMembersUsed: string[]
  dexieTables: Record<string, DexieTableUse>
  usesTransaction: boolean
  usesLiveQuery: boolean
  devOnly: boolean
  lazyImports: string[]
  lazyComponents: Record<string, string>
  routes: string[]
  requirementRefs: string[]
  external: ExternalImport[]
  importedBy: string[]
  imports: string[]
  assets: string[]
  testedBy?: string[]
  /** Só em arquivos de teste: projeto do Vitest em que roda (D-46 — DOM_TEST_FILES no vite.config.ts). */
  testProject?: TestProject
  config?: Record<string, ConfigValue>
}

/** Projetos do Vitest (D-46): `unit` em node, `dom` em jsdom. */
export type TestProject = 'unit' | 'dom'

export interface GraphEdge {
  from: string
  to: string
  kind: 'static' | 'type' | 'dynamic' | 'side-effect' | 'reexport'
  names: string[]
}

export interface GraphRoute {
  path: string
  definedIn: string
  element: string | null
  elements: string[]
  module: string | null
  lazyVia: string | null
  lazy: boolean
  devOnly: boolean
  layout: boolean
  /** Rota sem caminho que só agrupa as telas para dar a elas um errorElement próprio. */
  errorBoundary: boolean
  /** Componente do errorElement da rota (null sem tela de erro própria). */
  errorElement: string | null
  errorModule: string | null
}

export interface GraphPackage {
  version: string | null
  installed: string | null
  declared: boolean
  dev: boolean
  builtin: boolean
  importedBy: string[]
}

/** Destino de um alias de CSS conforme o comando do Vite. */
export interface GraphCssAliasVariant {
  when: 'build' | 'serve' | 'always'
  target: string
}

export interface GraphCssAliasImport {
  alias: string
  variants: GraphCssAliasVariant[]
}

/** Folha de estilo encontrada pelo scanner (CSS importado pelo código ou por outro CSS). */
export interface GraphStylesheet {
  /** `@import` relativos (CSS → CSS), já resolvidos para caminhos do repositório. */
  imports: string[]
  /**
   * `@import` por alias do vite.config.ts (ex.: `@tailwind-sources`, D-43). Cada variante diz
   * para qual arquivo o alias aponta em cada comando do Vite (`build`, `serve` ou `always`).
   */
  aliasImports: GraphCssAliasImport[]
  /** `@import` de pacotes (ex.: tailwindcss). */
  packages: string[]
  /** `@import 'tailwindcss' source(none)`: desliga a detecção automática de fontes. */
  sourceNone: boolean
  /** Pastas varridas por `@source`. */
  sources: string[]
  /** Pastas excluídas por `@source not`. */
  sourceNot: string[]
  importedBy: string[]
}

/** Arquivo de public/ (copiado como está para o dist/): quem o cita e quem o gera. */
export interface GraphPublicFile {
  referencedBy: string[]
  generatedBy: string[]
}

/** Opções do vite-plugin-pwa lidas pelo scanner do módulo que exporta `VitePWAOptions`. */
export interface GraphPwa {
  optionsModule: string
  usedBy: string[]
  registeredBy: string[]
  registerType: string | null
  injectRegister: string | boolean | null
  useCredentials: boolean | string | null
  includeManifestIcons: boolean | string | null
  manifest: Record<string, string | boolean | null>
  icons: { src: string | null; sizes: string | null; purpose: string | null }[]
  globPatterns: string[]
  navigateFallback: string | null
  navigateFallbackDenylist: string[]
}

/** Último `npm run build` encontrado em dist/ no momento do scan (null se não houver). */
export interface GraphBuild {
  builtAt: string
  serviceWorker: string | null
  workboxRuntime: string | null
  manifest: string | null
  manifestLink: string | null
  precache: string[]
  navigationRoute: boolean
  css: { file: string; bytes: number }[]
  /** Chunks JS de assets/, do maior para o menor (RNF-02: tamanho do pacote principal). */
  js: { file: string; bytes: number }[]
  totalBytes: number
  /** Arquivos de texto do dist/ com marcas da página DEV (precisa ser vazio — D-17). */
  devLeaks: string[]
}

/** Esquema Dexie lido da classe do banco (§6.4); null enquanto não houver banco. */
export interface GraphSchema {
  module: string
  databaseName: string | null
  schemaVersion: number | null
  versions: { version: number; stores: Record<string, string> }[]
}

export interface GraphPhase {
  number: number
  title: string
  /** Fase marcada como "(opcional …)" no título da §7 (ex.: Fase 12, D-26). Não conta como atrasada. */
  optional?: boolean
  requirements: string
  tasks: { done: boolean; text: string; human: boolean }[]
  done: number
  total: number
}

export interface GraphCommit {
  hash: string
  date: string
  author: string
  subject: string
  refs: string[]
  files: { status: string; path: string }[]
}

export interface LayerStats {
  modules: number
  loc: number
  components: number
  hooks: number
  tests: number
}

export interface ModuleGraph {
  generatedAt: string
  totals: LayerStats & { edges: number; configFiles: number }
  layerSummary: Partial<Record<Layer, LayerStats>>
  specVersion: string | null
  phases: GraphPhase[]
  modules: GraphModule[]
  edges: GraphEdge[]
  assets: Record<string, string[]>
  stylesheets: Record<string, GraphStylesheet>
  packages: Record<string, GraphPackage>
  tables: Record<string, { readers: string[]; writers: string[] }>
  schema: GraphSchema | null
  routes: GraphRoute[]
  publicFiles: Record<string, GraphPublicFile>
  pwa: GraphPwa | null
  build: GraphBuild | null
  violations: { from: string; to: string; rule: string }[]
  unresolved: { from: string; to: string }[]
  cycles: string[][]
  git: {
    branch: string | null
    head: string | null
    workingTree: { status: string; path: string }[]
  }
  commits: GraphCommit[]
  repoFiles: string[]
}

// ---------- dados curados ----------

export interface LayerInfo {
  id: Layer
  label: string
  folder: string
  description: string
  /** Posição da caixa no diagrama de camadas (viewBox 920 × 540). */
  position: { x: number; y: number }
}

/**
 * `exception`: permitida de forma restrita e definitiva (ex.: app → dev só por import dinâmico).
 * `debt`: proibida pela regra, mas tolerada até um prazo registrado em decisão (amarelo).
 */
export type DependencyStatus = 'allowed' | 'exception' | 'debt'

export interface AllowedDependency {
  from: Layer
  to: Layer
  status: DependencyStatus
  reason: string
  /** Quando presente, só imports para caminhos com estes prefixos são tolerados. */
  onlyTargets?: string[]
  /**
   * Quando presente, só imports vindos de caminhos com estes prefixos são tolerados
   * (ex.: components → repositories só a partir de src/components/<entidade>/ — D-37).
   */
  onlySources?: string[]
  /** Para `debt`: quando a dívida será paga (fase e decisão). */
  deadline?: string
}

/** Direção proibida entre camadas: se aparecer no código, vira violação (vermelho). */
export interface ForbiddenDependency {
  from: Layer
  to: Layer
  /** Regra da spec ou decisão que proíbe (ex.: §2.7, D-22). */
  rule: string
  reason: string
  /** Desenhar a direção proibida no diagrama de camadas (só as mais relevantes, para não poluir). */
  inDiagram?: boolean
  /**
   * Quando presente, a proibição vale só para módulos de origem com estes prefixos
   * (ex.: src/components/ui/ → repositories — D-37); o resto da camada segue a regra permitida.
   */
  onlySources?: string[]
}

export interface RouteNote {
  route: string
  screen: string
  requirements: string[]
  description: string
  /** Fase em que a tela ganha conteúdo de verdade (placeholder até lá). */
  contentPhase: number | null
}

export interface FlowParticipant {
  id: string
  label: string
  /** Módulo responsável (caminho real); ausente para atores externos (usuário, navegador). */
  module?: string
}

export interface FlowStep {
  from: string
  to: string
  label: string
  detail: string
  refs: string[]
  kind: 'call' | 'return' | 'event'
}

export interface Flow {
  id: string
  title: string
  summary: string
  requirements: string[]
  participants: FlowParticipant[]
  steps: FlowStep[]
  /** Testes que cobrem o fluxo (caminhos reais). */
  tests: string[]
}

/**
 * Caixa do diagrama do pipeline de criptografia do backup (§6.8). A posição é uma grade:
 * `column` da esquerda para a direita e `row` 0 (cadeia principal) ou 1 (entradas aleatórias
 * e o texto em claro, abaixo).
 */
export interface PipelineBox {
  id: string
  title: string
  lines: string[]
  /** Detalhe mostrado em texto na lista abaixo do diagrama (nada depende de hover). */
  detail: string
  column: number
  row: 0 | 1
  tone: 'input' | 'secret' | 'process' | 'output'
  /** Módulo responsável (caminho real); abre o inspetor ao tocar. */
  module?: string
  refs: string[]
}

export interface PipelineArrow {
  from: string
  to: string
  /** Tracejada: o valor só é copiado (em base64) para o envelope, não entra no cálculo. */
  copy?: boolean
}

export interface PlannedFlow {
  title: string
  phase: number
  requirements: string[]
  summary: string
}

export interface RequirementInfo {
  id: string
  title: string
  phases: number[]
}

/** Princípio da §2 e onde ele vira código: padrão reutilizável, testes e verificação. */
export interface PrincipleInfo {
  number: number
  title: string
  /** Como é garantido (lint, check-consistency, regra de camada, teste, revisão). */
  enforcement: string
  /** Módulos que implementam o padrão (caminhos reais). */
  modules: string[]
  /** Testes que citam o princípio ou cobrem o padrão. */
  tests: string[]
  decisions: string[]
}

export type DecisionStatus = 'confirmed' | 'pending' | 'superseded'

export interface DecisionInfo {
  id: string
  title: string
  status: DecisionStatus
  /** Decisão que substituiu esta (só com status superseded). */
  supersededBy?: string
  /** Módulos/arquivos onde a decisão aparece no código (além dos que citam o ID). */
  impacts: string[]
}

/** O que o scanner não sabe sobre uma tabela Dexie (índices e leitores/escritores vêm do grafo). */
export interface TableNote {
  name: string
  type: string
  /** §8.3 — toda tabela precisa estar no backup e no teste de ida e volta. */
  inBackup: boolean
  /** O que vai para o arquivo (ex.: só a chave theme de settings — §6.8). */
  backupDetail: string
  /** Fase em que a tabela passa a ser usada pelo app (repositórios de produção). */
  usedFromPhase: number
  note: string
}

export interface PlannedUiField {
  name: string
  type: string
  actions: string[]
  phase: number
}

/**
 * Acesso a subcampos de um campo da store (ex.: `transactionFilters.text`), que o scanner não
 * separa: ele só vê o campo de primeiro nível em `storeMembersUsed`.
 */
export interface UiFieldAccess {
  /** Módulo que lê/escreve (caminho real). */
  module: string
  /** Subcampos lidos, cada um com seu seletor (ex.: `transactionFilters.text`). */
  reads: string[]
  /** Ações chamadas e o que gravam (ex.: `setFilters({ text })`). */
  writes: string[]
  note?: string
}

export interface PlannedDomainFunction {
  module: string
  names: string[]
  phase: number
}

export type PackageSource = '§6.1' | 'D-18' | 'D-19' | 'D-20' | 'template Vite'

export interface CompositionNote {
  /** Nome do componente como aparece no JSX (ex.: `Page`, `ThemeRadio`). */
  component: string
  note: string
}

export interface ScreenComposition {
  route: string
  /** Onde fica o estado e de onde vêm os dados desta tela. */
  stateAndData: string
}

export interface ArchitectureFinding {
  title: string
  severity: 'info' | 'warn' | 'danger'
  detail: string
  modules: string[]
  /** Achado que só vale se uma fase opcional for feita (ex.: 12 — acesso restrito, D-26). */
  optionalPhase?: number
  /** Achado que continua aberto, mas com decisão tomada (ex.: aguardar a Fase 11 — D-41). */
  decided?: string
  /** Preenchido quando o achado foi resolvido: como e quando (fica no histórico, em verde). */
  resolved?: string
}

// ---------- linha do tempo ----------

export type TimelineType = 'feature' | 'fix' | 'refactor' | 'config' | 'docs' | 'test' | 'decision'

/** `'pre'` = antes da Fase 0 (configuração inicial do repositório). */
export type TimelinePhase = number | 'pre'

export interface TimelineEntry {
  id: string
  date: string
  phase: TimelinePhase
  type: TimelineType
  title: string
  summary: string
  /** Hashes curtos; vazio enquanto a entrega não foi commitada. */
  commits: string[]
  committed: boolean
  requirements: string[]
  decisions: string[]
  files: { created: string[]; modified: string[]; removed: string[] }
  impact: string[]
}
