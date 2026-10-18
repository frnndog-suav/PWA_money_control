import { PACKAGE_SOURCES } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { ModuleList } from '@/dev/architecture/components/ModuleList'
import { Section } from '@/dev/architecture/components/Section'
import { StylesheetsCard } from '@/dev/architecture/components/StylesheetsCard'
import { graph } from '@/dev/architecture/model'

const packages = Object.entries(graph.packages)
  .filter(([, p]) => !p.builtin)
  .sort(([a, pa], [b, pb]) => Number(pa.dev) - Number(pb.dev) || a.localeCompare(b))

const cellClass = 'border-b border-slate-200 p-2 align-top dark:border-slate-700'

export function PackagesSection() {
  return (
    <Section
      id="dependencias"
      title="Dependências externas"
      description="Pacotes do package.json (versão declarada e instalada em node_modules) e os módulos que os importam. A autorização vem da §6.1, das decisões D-18/D-19/D-20 ou do template Vite original; qualquer outro aparece em vermelho."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {['Pacote', 'Versão', 'Tipo', 'Autorização', 'Importado por'].map((h) => (
                <th key={h} className={`${cellClass} font-semibold`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.map(([name, p]) => {
              const source = PACKAGE_SOURCES[name]
              const isPinned = p.version !== null && /^\d/.test(p.version)
              return (
                <tr key={name}>
                  <td className={cellClass}>
                    <code>{name}</code>
                  </td>
                  <td className={cellClass}>
                    <code className="text-xs">{p.version ?? '(não declarado)'}</code>
                    {p.installed && p.installed !== p.version && (
                      <span className="text-xs text-slate-500"> instalado {p.installed}</span>
                    )}
                    {!isPinned && <Badge variant="danger">versão não fixa (D-20)</Badge>}
                  </td>
                  <td className={cellClass}>{p.dev ? 'devDependency' : 'dependency'}</td>
                  <td className={cellClass}>
                    {source ? (
                      <Badge variant="ok">{source}</Badge>
                    ) : (
                      <Badge variant="danger">fora da lista</Badge>
                    )}
                  </td>
                  <td className={cellClass}>
                    <ModuleList ids={p.importedBy} short empty="ferramenta (CLI/config)" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <StylesheetsCard />
    </Section>
  )
}
