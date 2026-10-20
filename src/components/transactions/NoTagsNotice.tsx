import { NO_TAGS_MESSAGE } from '@/components/transactions/transactionTexts'
import { Button } from '@/components/ui/Button'

interface NoTagsNoticeProps {
  onCreateTag: () => void
}

/** CA-01.7 — sem nenhuma tag: explica e oferece o atalho para criar uma ali mesmo. */
export function NoTagsNotice({ onCreateTag }: NoTagsNoticeProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600">
      <p className="text-sm text-slate-700 dark:text-slate-200">{NO_TAGS_MESSAGE}</p>
      <Button variant="secondary" onClick={onCreateTag}>
        Criar tag
      </Button>
    </div>
  )
}
