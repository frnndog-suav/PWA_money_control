import { formatTenthsPercent, type TagSlice } from '@/domain/charts'
import { formatBRL } from '@/domain/money'

interface TagLegendListProps {
  /** Nome acessível da lista, ex.: "Saídas por tag". */
  label: string
  slices: TagSlice[]
  selectedTagId: string | null
  onToggle: (tagId: string) => void
}

/**
 * CA-06.3 / CA-06.6 / CA-06.7 — legenda sempre visível, do maior para o menor valor: um
 * botão por tag ("● Mercado — R$ 1.230,50 · 41,2%"), com alvo de 44 px mesmo para fatias
 * finas. O item selecionado fica em negrito, com borda e `aria-pressed` (não só pela cor).
 */
export function TagLegendList({ label, slices, selectedTagId, onToggle }: TagLegendListProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-1">
      {slices.map((slice) => {
        const isSelected = slice.tagId === selectedTagId
        return (
          <li key={slice.tagId}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(slice.tagId)}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:font-semibold dark:aria-pressed:border-blue-400 dark:aria-pressed:bg-slate-800"
            >
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate">{slice.name}</span>
              <span className="shrink-0 tabular-nums">
                {formatBRL(slice.cents)} · {formatTenthsPercent(slice.tenths)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
