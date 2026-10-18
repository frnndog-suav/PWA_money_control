interface ProgressBarProps {
  label: string
  done: number
  total: number
}

export function ProgressBar({ label, done, total }: ProgressBarProps) {
  const percent = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-mono tabular-nums">
          {done}/{total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700"
      >
        <div
          className={`h-full ${percent === 100 ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-blue-600 dark:bg-blue-400'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
