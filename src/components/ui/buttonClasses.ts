export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-700 text-white dark:bg-blue-600',
  secondary: 'border border-slate-300 text-slate-900 dark:border-slate-600 dark:text-slate-100',
  danger: 'bg-red-700 text-white dark:bg-red-600',
  'danger-outline': 'border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300',
}

/** Aparência do `Button` (sem os estados de desabilitado), também para um `Link` com cara de botão. */
export function buttonVariantClasses(variant: ButtonVariant): string {
  return `min-h-11 rounded-lg px-4 font-semibold ${VARIANT_CLASSES[variant]}`
}
