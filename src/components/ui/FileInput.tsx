import type { InputHTMLAttributes, Ref } from 'react'
import { useFieldControl } from '@/components/ui/useFieldControl'

interface FileInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'id' | 'value' | 'onChange'
> {
  /** Arquivo escolhido, ou `null` se a escolha foi desfeita. */
  onFileChange: (file: File | null) => void
  ref?: Ref<HTMLInputElement>
}

// O botão nativo ("Escolher arquivo") ganha alvo de toque ≥ 44 px e o visual dos botões
// secundários (RNF-06); o nome do arquivo escolhido aparece ao lado, como texto visível.
const FILE_INPUT_CLASSES =
  'w-full text-base file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-slate-300 file:bg-transparent file:px-4 file:font-semibold file:text-slate-900 dark:file:border-slate-600 dark:file:text-slate-100'

/** Escolha de um arquivo, ligada ao rótulo e ao erro do `<Field>` em volta. */
export function FileInput({ onFileChange, className = '', ...props }: FileInputProps) {
  const fieldProps = useFieldControl()
  return (
    <input
      type="file"
      {...fieldProps}
      {...props}
      onChange={(event) => onFileChange(event.currentTarget.files?.[0] ?? null)}
      className={`${FILE_INPUT_CLASSES} ${className}`}
    />
  )
}
