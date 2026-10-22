import { useId, type ReactNode, type Ref } from 'react'
import { readableTextColor } from '@/domain/tagColor'
import type { Tag } from '@/domain/types'

interface TagPickerProps {
  tags: readonly Tag[]
  /** `id` da tag escolhida, ou `''` (nenhuma ou, com `allOptionLabel`, todas). */
  value: string
  onChange: (tagId: string) => void
  onBlur?: () => void
  error?: string
  /** Mostrado no lugar das opções quando não há nenhuma tag (CA-01.7). */
  emptyState: ReactNode
  /** Com um texto (ex.: "Todas"), a 1ª opção vale `''`: usado no filtro da lista (CA-04.2). */
  allOptionLabel?: string
  /** Recebe o 1º rádio, para o formulário focar o campo quando ele tiver erro. */
  ref?: Ref<HTMLInputElement>
}

interface TagOptionProps {
  groupName: string
  value: string
  label: string
  /** Cor da tag; sem cor, o chip é neutro (opção "Todas"). */
  color?: string
  checked: boolean
  onChange: (value: string) => void
  onBlur?: () => void
  ref?: Ref<HTMLInputElement>
}

const NEUTRAL_CHIP_CLASSES = 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'

function TagOption({
  groupName,
  value,
  label,
  color,
  checked,
  onChange,
  onBlur,
  ref,
}: TagOptionProps) {
  return (
    <label className="flex min-h-11 min-w-11 max-w-full cursor-pointer items-center">
      <input
        ref={ref}
        type="radio"
        name={groupName}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        onBlur={onBlur}
        className="peer sr-only"
      />
      <span
        className={`inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-black/10 ring-inset peer-checked:outline-3 peer-checked:outline-offset-2 peer-checked:outline-slate-900 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 dark:ring-white/25 dark:peer-checked:outline-white dark:peer-focus-visible:outline-blue-400 ${color ? '' : NEUTRAL_CHIP_CLASSES}`}
        style={color ? { backgroundColor: color, color: readableTextColor(color) } : undefined}
      >
        {checked && <span aria-hidden="true">✓</span>}
        <span className="truncate">{label}</span>
      </span>
    </label>
  )
}

/**
 * RF-01 — escolha de exatamente uma tag (D-01), com cada opção no visual do chip da tag
 * (CA-03.6). Rádios nativos: setas do teclado e estado marcado anunciado pelo leitor de tela.
 * A marcada ganha contorno e "✓", não só uma cor diferente (RNF-06).
 */
export function TagPicker({
  tags,
  value,
  onChange,
  onBlur,
  error,
  emptyState,
  allOptionLabel,
  ref,
}: TagPickerProps) {
  const groupName = useId()
  const errorId = useId()
  const hasAllOption = allOptionLabel !== undefined

  return (
    // aria-invalid não vale em <fieldset> (ARIA 1.2); o erro fica ligado pelo aria-describedby.
    <fieldset aria-describedby={error ? errorId : undefined} className="flex flex-col gap-1">
      <legend className="mb-1 font-semibold">Tag</legend>
      {tags.length === 0 ? (
        emptyState
      ) : (
        <div className="flex flex-wrap gap-1">
          {hasAllOption && (
            <TagOption
              ref={ref}
              groupName={groupName}
              value=""
              label={allOptionLabel}
              checked={value === ''}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}
          {tags.map((tag, index) => (
            <TagOption
              key={tag.id}
              ref={index === 0 && !hasAllOption ? ref : undefined}
              groupName={groupName}
              value={tag.id}
              label={tag.name}
              color={tag.color}
              checked={value === tag.id}
              onChange={onChange}
              onBlur={onBlur}
            />
          ))}
        </div>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </fieldset>
  )
}
