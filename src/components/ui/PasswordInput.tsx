import type { InputHTMLAttributes, Ref } from 'react'
import { useFieldControl } from '@/components/ui/useFieldControl'
import { TEXT_INPUT_CLASSES } from '@/components/ui/inputClasses'

interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'id' | 'autoComplete'
> {
  /** `new-password` ao criar uma senha; `current-password` ao digitar uma existente. */
  autoComplete: 'new-password' | 'current-password'
  ref?: Ref<HTMLInputElement>
}

/** Campo de senha ligado ao rótulo e ao erro do `<Field>` em volta. */
export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const fieldProps = useFieldControl()
  return (
    <input
      type="password"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      {...fieldProps}
      {...props}
      className={`${TEXT_INPUT_CLASSES} ${className}`}
    />
  )
}
