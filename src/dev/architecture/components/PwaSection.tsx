import { ARCHITECTURE_FINDINGS } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { Card } from '@/dev/architecture/components/Card'
import { CodeList } from '@/dev/architecture/components/CodeList'
import { Fields } from '@/dev/architecture/components/Fields'
import { formatInstant, formatInteger } from '@/dev/architecture/components/format'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { PwaTopologyDiagram } from '@/dev/architecture/components/PwaTopologyDiagram'
import { Section } from '@/dev/architecture/components/Section'
import { baseName, currentPhase, graph, optionalPhases } from '@/dev/architecture/model'

const { build, pwa } = graph
const publicFiles = Object.entries(graph.publicFiles)
const precache = new Set(build?.precache ?? [])

/** D-43 — destino do alias de fontes do Tailwind no `vite build` (lido pelo scanner). */
const tailwindBuildSources = Object.entries(graph.stylesheets).flatMap(([id, sheet]) =>
  sheet.aliasImports.flatMap(({ alias, variants }) =>
    variants
      .filter((variant) => variant.when !== 'serve')
      .map((variant) => {
        const excluded = graph.stylesheets[variant.target]?.sourceNot ?? []
        const scope = excluded.length > 0 ? ` (@source not ${excluded.join(', ')})` : ''
        return `${baseName(id)} → ${alias} → ${baseName(variant.target)}${scope}`
      }),
  ),
)

const pendingHumanTasks = graph.phases
  .filter((phase) => !phase.optional && phase.number <= currentPhase)
  .flatMap((phase) =>
    phase.tasks
      .filter((task) => task.human && !task.done)
      .map((task) => ({ phase: phase.number, text: task.text })),
  )

/** Tarefas das fases opcionais (ex.: Fase 12 — acesso restrito, D-26): não são pendências. */
const optionalPhaseTasks = graph.phases
  .filter((phase) => phase.optional)
  .flatMap((phase) =>
    phase.tasks
      .filter((task) => !task.done)
      .map((task) => ({ phase: phase.number, text: task.text, human: task.human })),
  )

const openPwaFindings = ARCHITECTURE_FINDINGS.filter(
  (finding) => !finding.resolved && finding.modules.some((m) => m.startsWith('src/app/pwa/')),
)
const pwaRisks = openPwaFindings.filter(
  (f) => f.optionalPhase === undefined || !optionalPhases.has(f.optionalPhase),
)
const optionalPhaseRisks = openPwaFindings.filter(
  (f) => f.optionalPhase !== undefined && optionalPhases.has(f.optionalPhase),
)

const stripHumanMark = (text: string) => text.replace('*(Humano)* ', '')

const formatKilobytes = (bytes: number) => `${formatInteger(Math.round(bytes / 100) / 10)} kB`

function PluginOptionsCard() {
  if (!pwa) {
    return (
      <Card tone="warn">
        <Card.Title>Configuração do plugin</Card.Title>
        <p className="text-sm">O scanner não encontrou um módulo que exporte VitePWAOptions.</p>
      </Card>
    )
  }
  return (
    <Card>
      <Card.Title trailing={<Badge variant="info">scanner</Badge>}>
        Configuração do vite-plugin-pwa
      </Card.Title>
      <Fields>
        <Fields.Item label="Módulo">
          <ModuleLink id={pwa.optionsModule} /> usado por <ModuleList ids={pwa.usedBy} short />
        </Fields.Item>
        <Fields.Item label="Registro do service worker">
          <ModuleList ids={pwa.registeredBy} /> (virtual:pwa-register → src/app/pwa/registerPwa.ts)
        </Fields.Item>
        <Fields.Item label="Comportamento">
          <CodeList
            items={[
              `registerType: ${pwa.registerType}`,
              `injectRegister: ${String(pwa.injectRegister)}`,
              `useCredentials: ${String(pwa.useCredentials)}`,
              `includeManifestIcons: ${String(pwa.includeManifestIcons)}`,
            ]}
          />
        </Fields.Item>
        <Fields.Item label="Manifest">
          <CodeList
            items={Object.entries(pwa.manifest).map(([key, value]) => `${key}: ${String(value)}`)}
          />
        </Fields.Item>
        <Fields.Item label="Ícones do manifest">
          <CodeList
            items={pwa.icons.map(
              (icon) => `${icon.src} ${icon.sizes}${icon.purpose ? ` (${icon.purpose})` : ''}`,
            )}
          />
        </Fields.Item>
        <Fields.Item label="Workbox">
          <CodeList
            items={[
              ...pwa.globPatterns.map((pattern) => `precache ${pattern}`),
              `navigateFallback: ${pwa.navigateFallback}`,
              ...pwa.navigateFallbackDenylist.map((pattern) => `denylist ${pattern}`),
            ]}
          />
        </Fields.Item>
      </Fields>
    </Card>
  )
}

function BuildCard() {
  if (!build) {
    return (
      <Card tone="warn">
        <Card.Title>Último build</Card.Title>
        <p className="text-sm">
          Não havia dist/ no momento do scan. Rode npm run build e depois o scanner.
        </p>
      </Card>
    )
  }
  const hasLeaks = build.devLeaks.length > 0
  return (
    <Card tone={hasLeaks ? 'danger' : 'default'}>
      <Card.Title
        trailing={
          <Badge variant={hasLeaks ? 'danger' : 'ok'}>
            {hasLeaks ? `${build.devLeaks.length} vazamento(s) da página DEV` : '0 vazamentos DEV'}
          </Badge>
        }
      >
        Artefatos do último build (dist/)
      </Card.Title>
      <p className="text-xs text-slate-500">
        Lido do dist/ quando o scanner rodou (build de {formatInstant(build.builtAt)}). Procura
        ArchitecturePage, module-graph, __dev, arquitetura, sampleData e SampleData (página DEV e
        dados de exemplo — D-17, D-30) em todos os .js/.css/.html do dist/, inclusive o sw.js.
      </p>
      <Fields>
        <Fields.Item label="Service worker">
          <CodeList
            items={[
              build.serviceWorker ?? '(sem sw.js)',
              build.workboxRuntime ?? '(sem runtime do Workbox)',
              build.navigationRoute ? 'NavigationRoute ativa' : 'sem NavigationRoute',
            ]}
          />
        </Fields.Item>
        <Fields.Item label="Manifest">
          <code className="text-xs break-all">{build.manifestLink ?? '(link não injetado)'}</code>
        </Fields.Item>
        <Fields.Item label="CSS de produção">
          <CodeList
            items={build.css.map(
              (sheet) => `${baseName(sheet.file)} · ${formatKilobytes(sheet.bytes)}`,
            )}
          />
        </Fields.Item>
        <Fields.Item label="Fontes do Tailwind no build (D-43)">
          <CodeList items={tailwindBuildSources} />
        </Fields.Item>
        <Fields.Item label="JS (maiores primeiro — RNF-02)">
          <CodeList
            items={build.js
              .slice(0, 5)
              .map((chunk) => `${baseName(chunk.file)} · ${formatKilobytes(chunk.bytes)}`)}
          />
        </Fields.Item>
        <Fields.Item label="Tamanho total do dist/">
          {formatKilobytes(build.totalBytes)}
        </Fields.Item>
        {hasLeaks && (
          <Fields.Item label="Arquivos com marcas da página DEV">
            <CodeList items={build.devLeaks} />
          </Fields.Item>
        )}
      </Fields>
      <details className="text-sm">
        <summary className="min-h-9 cursor-pointer py-2 font-semibold">
          Precache ({build.precache.length} arquivos)
        </summary>
        <CodeList items={build.precache} />
      </details>
    </Card>
  )
}

function PublicFilesCard() {
  return (
    <Card>
      <Card.Title>public/ (copiado como está para o dist/)</Card.Title>
      <ul className="flex flex-col divide-y divide-slate-200 text-sm dark:divide-slate-700">
        {publicFiles.map(([id, file]) => {
          const name = id.slice('public/'.length)
          return (
            <li key={id} className="flex flex-col gap-1 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs font-semibold">{id}</code>
                {build && (
                  <Badge variant={precache.has(name) ? 'ok' : 'warn'}>
                    {precache.has(name) ? 'no precache' : 'fora do precache'}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                gerado por <ModuleList ids={file.generatedBy} short empty="(à mão)" />· citado por{' '}
                <ModuleList ids={file.referencedBy} short empty="ninguém" />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-slate-500">
        public/favicon.svg (template Vite) foi removido na Fase 1 (D-25).
      </p>
    </Card>
  )
}

function OptionalPhaseCard() {
  if (!optionalPhaseTasks.length && !optionalPhaseRisks.length) return null
  return (
    <Card>
      <Card.Title trailing={<Badge>opcional</Badge>}>
        Acesso restrito: itens da Fase 12 (D-26)
      </Card.Title>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Não são pendências: a Fase 12 só começa depois da Fase 11, se o dono decidir. Até lá o site
        fica sem restrição de acesso e os dados continuam só no aparelho (princípio 5). Prontos para
        a Fase 12 no código: o manifest com crossorigin=&quot;use-credentials&quot; (useCredentials)
        e a denylist /cdn-cgi/ do service worker.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {optionalPhaseTasks.map((task) => (
          <li key={task.text} className="flex flex-wrap items-center gap-2">
            <Badge>
              Fase {task.phase} · {task.human ? 'humano' : 'código'}
            </Badge>
            <span>{stripHumanMark(task.text)}</span>
          </li>
        ))}
        {optionalPhaseRisks.map((risk) => (
          <li key={risk.title} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>a verificar na Fase {risk.optionalPhase}</Badge>
              <span className="font-semibold">{risk.title}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">{risk.detail}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function PendingCard() {
  const isEmpty = !pendingHumanTasks.length && !pwaRisks.length
  return (
    <Card tone={pwaRisks.length ? 'warn' : 'default'}>
      <Card.Title trailing={isEmpty ? <Badge variant="ok">nenhuma</Badge> : undefined}>
        Pendências humanas e riscos
      </Card.Title>
      {!pendingHumanTasks.length && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Fase 1 concluída: deploy no Cloudflare Pages feito e roteiro aprovado no iPhone
          (instalação, offline e aviso de nova versão).
        </p>
      )}
      <ul className="flex flex-col gap-2 text-sm">
        {pendingHumanTasks.map((task) => (
          <li key={task.text} className="flex flex-wrap items-center gap-2">
            <Badge variant="warn">Fase {task.phase} · humano</Badge>
            <span>{stripHumanMark(task.text)}</span>
          </li>
        ))}
        {pwaRisks.map((risk) => (
          <li key={risk.title} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={risk.severity === 'warn' ? 'warn' : 'info'}>risco</Badge>
              <span className="font-semibold">{risk.title}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">{risk.detail}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function PwaSection() {
  return (
    <Section
      id="pwa"
      title="PWA e artefatos do build"
      description="Do código ao dist/: as opções do vite-plugin-pwa (lidas pelo scanner em src/app/pwa/pwaOptions.ts), os arquivos de public/ e o que o último npm run build gerou (service worker, manifest, precache). Toque numa caixa com módulo para abri-lo no inspetor."
    >
      <div className="overflow-x-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
        <PwaTopologyDiagram />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <PluginOptionsCard />
        <BuildCard />
        <PublicFilesCard />
        <PendingCard />
        <OptionalPhaseCard />
      </div>
    </Section>
  )
}
