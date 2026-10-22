import { TagPicker } from '@/components/tags/TagPicker'
import type { Tag } from '@/domain/types'
import { useUiStore } from '@/stores/uiStore'

interface TagFilterProps {
  /** Tags em ordem de nome; `undefined` enquanto carregam. */
  tags: readonly Tag[] | undefined
}

/** CA-04.2 — tag: "Todas" ou uma específica, nos mesmos chips do formulário (CA-03.6). */
export function TagFilter({ tags }: TagFilterProps) {
  const tagId = useUiStore((state) => state.transactionFilters.tagId)
  const setFilters = useUiStore((state) => state.setFilters)

  if (!tags) return null
  return (
    <TagPicker
      tags={tags}
      value={tagId ?? ''}
      onChange={(value) => setFilters({ tagId: value === '' ? null : value })}
      allOptionLabel="Todas"
      emptyState={<p className="text-slate-600 dark:text-slate-300">Nenhuma tag cadastrada.</p>}
    />
  )
}
