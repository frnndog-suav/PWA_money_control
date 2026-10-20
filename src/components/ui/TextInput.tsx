import type { InputHTMLAttributes, Ref } from 'react'
import { useFieldControl } from '@/components/ui/useFieldControl'
import { TEXT_INPUT_CLASSES } from '@/components/ui/inputClasses'

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  ref?: Ref<HTMLInputElement>
}

/** Campo de texto de uma linha, ligado ao rótulo e ao erro do `<Field>` em volta. */
export function TextInput({ className = '', ...props }: TextInputProps) {
  const fieldProps = useFieldControl()
  return (
    <input
      type="text"
      {...fieldProps}
      {...props}
      className={`${TEXT_INPUT_CLASSES} ${className}`}
    />
  )
}
