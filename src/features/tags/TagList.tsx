import { TagChip } from '@/components/ui/TagChip'
import type { Tag } from '@/domain/types'
import { formatTransactionCount } from '@/features/tags/tagTexts'
import type { TagWithTransactionCount } from '@/repositories/tagsRepository'

interface TagListProps {
  items: TagWithTransactionCount[]
  onSelect: (tag: Tag) => void
}

/** CA-03.5 — nome e cor (chip) e quantidade de lançamentos; tocar abre a edição. */
export function TagList({ items, onSelect }: TagListProps) {
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {items.map(({ tag, transactionCount }) => (
        <li key={tag.id}>
          <button
            type="button"
            onClick={() => onSelect(tag)}
            className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left"
          >
            <span className="min-w-0 flex-1">
              <TagChip name={tag.name} color={tag.color} overflow="wrap" />
            </span>
            <span className="shrink-0 text-sm text-slate-600 tabular-nums dark:text-slate-300">
              {formatTransactionCount(transactionCount)}
            </span>
            <span aria-hidden="true" className="text-slate-500 dark:text-slate-400">
              ›
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
