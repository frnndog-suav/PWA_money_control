import { DateInput } from '@/components/ui/DateInput'
import { Field } from '@/components/ui/Field'
import { isPeriodInverted } from '@/domain/transactionFilters'
import { INVERTED_PERIOD_MESSAGE } from '@/features/transactions/transactionListTexts'
import { useUiStore } from '@/stores/uiStore'

// O campo de data devolve '' quando o usuário o limpa: sem limite naquele lado.
const toDateFilter = (value: string) => (value === '' ? null : value)

/**
 * CA-04.2 — período com data inicial e final, ambas opcionais e inclusivas. Se a inicial vier
 * depois da final, o aviso aparece no campo da data final e o período não é aplicado.
 */
export function PeriodFilter() {
  const from = useUiStore((state) => state.transactionFilters.from)
  const to = useUiStore((state) => state.transactionFilters.to)
  const setFilters = useUiStore((state) => state.setFilters)
  const error = isPeriodInverted({ from, to }) ? INVERTED_PERIOD_MESSAGE : undefined

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-semibold">Período</legend>
      {/* Um embaixo do outro no iPhone, para o aviso caber sem quebrar em várias linhas. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Field.Label>Data inicial</Field.Label>
          <DateInput
            value={from ?? ''}
            onChange={(value) => setFilters({ from: toDateFilter(value) })}
          />
        </Field>
        <Field error={error}>
          <Field.Label>Data final</Field.Label>
          <DateInput
            value={to ?? ''}
            onChange={(value) => setFilters({ to: toDateFilter(value) })}
          />
          <Field.Error />
        </Field>
      </div>
    </fieldset>
  )
}
