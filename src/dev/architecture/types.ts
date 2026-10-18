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
  storesUsed: string[]
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
  config?: Record<string, ConfigValue>
}

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
}

export interface GraphPackage {
  version: string | null
  installed: string | null
  declared: boolean
  dev: boolean
  builtin: boolean
  importedBy: string[]
}

/** Folha de estilo encontrada pelo scanner (CSS importado pelo código ou por outro CSS). */
export interface GraphStylesheet {
  /** `@import` relativos (CSS → CSS), já resolvidos para caminhos do repositório. */
  imports: string[]
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

export interface GraphPhase {
  number: number
  title: string
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
  routes: GraphRoute[]
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
  /** Para `debt`: quando a dívida será paga (fase e decisão). */
  deadline?: string
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

export type DecisionStatus = 'confirmed' | 'pending'

export interface DecisionInfo {
  id: string
  title: string
  status: DecisionStatus
  /** Módulos/arquivos onde a decisão aparece no código (além dos que citam o ID). */
  impacts: string[]
}

export interface PlannedTable {
  name: string
  indexes: string
  type: string
  inBackup: string
  phase: number
}

export interface PlannedUiField {
  name: string
  type: string
  actions: string[]
  phase: number
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
