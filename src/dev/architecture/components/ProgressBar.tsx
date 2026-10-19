interface ProgressBarProps {
  label: string
  done: number
  total: number
  /** Fase opcional (ex.: Fase 12 — D-26): barra cinza e etiqueta "opcional", nunca "atrasada". */
  optional?: boolean
}

function barColor(percent: number, optional: boolean): string {
  if (percent === 100) return 'bg-emerald-600 dark:bg-emerald-500'
  if (optional) return 'bg-slate-500 dark:bg-slate-400'
  return 'bg-blue-600 dark:bg-blue-400'
}

export function ProgressBar({ label, done, total, optional = false }: ProgressBarProps) {
  const percent = total ? Math.round((done / total) * 100) : 0
  const accessibleLabel = optional ? `${label} (opcional)` : label
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-2">
          {optional && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              opcional
            </span>
          )}
          <span className="font-mono tabular-nums">
            {done}/{total}
          </span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={accessibleLabel}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700"
      >
        <div className={`h-full ${barColor(percent, optional)}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
