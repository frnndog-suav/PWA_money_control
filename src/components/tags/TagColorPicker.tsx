import { useId } from 'react'
import { readableTextColor } from '@/domain/tagColor'
import { findSuggestedTagColor, SUGGESTED_TAG_COLORS } from '@/domain/tags'

interface TagColorPickerProps {
  /** `#RRGGBB` */
  value: string
  onChange: (color: string) => void
}

/**
 * RF-03 — paleta de 12 cores sugeridas (rádios nativos: setas do teclado, estado marcado
 * anunciado pelo leitor de tela) e seletor livre `<input type="color">`. A cor escolhida
 * também aparece em texto, porque a cor não pode ser a única informação (RNF-06).
 */
export function TagColorPicker({ value, onChange }: TagColorPickerProps) {
  const groupName = useId()
  const customColorId = useId()
  const suggested = findSuggestedTagColor(value)
  const upperValue = value.toUpperCase()

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">Cor</legend>

      <div className="grid grid-cols-6 gap-1.5">
        {SUGGESTED_TAG_COLORS.map(({ label, hex }) => (
          <label key={hex} className="flex justify-center">
            <input
              type="radio"
              name={groupName}
              value={hex}
              checked={upperValue === hex}
              onChange={() => onChange(hex)}
              className="peer sr-only"
            />
            <span className="sr-only">{label}</span>
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-full text-lg font-bold ring-1 ring-black/10 ring-inset peer-checked:outline-3 peer-checked:outline-offset-2 peer-checked:outline-slate-900 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 dark:ring-white/25 dark:peer-checked:outline-white dark:peer-focus-visible:outline-blue-400"
              style={{ backgroundColor: hex, color: readableTextColor(hex) }}
            >
              {upperValue === hex ? '✓' : ''}
            </span>
          </label>
        ))}
      </div>

      <div className="flex min-h-11 items-center gap-3">
        <input
          id={customColorId}
          type="color"
          // O seletor nativo só aceita minúsculas.
          value={value.toLowerCase()}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-lg border border-slate-500 bg-transparent p-1 dark:border-slate-400"
        />
        <label htmlFor={customColorId}>Outra cor</label>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Cor escolhida: {suggested ? suggested.label : `personalizada (${upperValue})`}
      </p>
    </fieldset>
  )
}
