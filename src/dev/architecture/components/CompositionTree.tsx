import { COMPOSITION_NOTES } from '@/dev/architecture/data/curated'
import { Badge } from '@/dev/architecture/components/Badge'
import { ModuleLink } from '@/dev/architecture/components/ModuleLink'
import type { TreeNode } from '@/dev/architecture/composition'

interface CompositionTreeProps {
  nodes: readonly TreeNode[]
}

const noteFor = (name: string) => COMPOSITION_NOTES.find((n) => n.component === name)?.note

function TreeItem({ node }: { node: TreeNode }) {
  const note = noteFor(node.name)
  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <code className="font-semibold">{`<${node.name}>`}</code>
        {node.parts.map((part) => (
          <code key={part} className="text-xs text-slate-600 dark:text-slate-400">
            .{part}
          </code>
        ))}
        {node.module && <ModuleLink id={node.module} short />}
        {node.external && node.external !== 'local' && <Badge>{node.external}</Badge>}
        {node.external === 'local' && <Badge>definido no próprio módulo</Badge>}
        {node.repeated && <span className="text-xs text-slate-500">(expandido acima)</span>}
      </div>
      {note && <p className="text-xs text-slate-600 dark:text-slate-400">{note}</p>}
      {node.children.length > 0 && <CompositionTree nodes={node.children} />}
    </li>
  )
}

/** Componentes renderizados, recursivamente (derivado do JSX; a ordem do JSX não é preservada). */
export function CompositionTree({ nodes }: CompositionTreeProps) {
  if (!nodes.length) return <p className="text-sm text-slate-500">não renderiza componentes</p>
  return (
    <ul className="flex flex-col gap-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
      {nodes.map((node) => (
        <TreeItem key={node.name} node={node} />
      ))}
    </ul>
  )
}
