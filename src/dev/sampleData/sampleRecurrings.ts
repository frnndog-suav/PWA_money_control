import { periodOf, periodsBetween } from '@/domain/dates'
import type {
  Cents,
  PeriodString,
  Recurring,
  RecurringAmount,
  Transaction,
  TransactionType,
} from '@/domain/types'
import { tagIdOf, timestampOf, type SampleContext } from '@/dev/sampleData/sampleContext'

// §6.11 / RF-07 — 4 recorrentes de exemplo com as ocorrências confirmadas até o mês
// passado. O mês atual fica pendente, para as telas de pendências terem o que mostrar.
// As posições abaixo são índices na lista de meses do período (0 = primeiro mês).

interface RecurringSpec {
  description: string
  tagName: string
  type: TransactionType
  startIndex: number
  /** Meses antes do mês atual em que o recorrente termina; `null` = sem fim. */
  endsMonthsAgo: number | null
  amounts: readonly { fromIndex: number; amountCents: Cents }[]
  skippedIndexes: readonly number[]
}

const RECURRING_SPECS: readonly RecurringSpec[] = [
  {
    description: 'Salário',
    tagName: 'Salário',
    type: 'income',
    startIndex: 0,
    endsMonthsAgo: null,
    amounts: [
      { fromIndex: 0, amountCents: 650000 },
      { fromIndex: 18, amountCents: 720000 },
    ],
    skippedIndexes: [],
  },
  {
    description: 'Aluguel',
    tagName: 'Moradia',
    type: 'expense',
    startIndex: 0,
    endsMonthsAgo: null,
    amounts: [
      { fromIndex: 0, amountCents: 180000 },
      { fromIndex: 12, amountCents: 195000 },
      { fromIndex: 24, amountCents: 210000 },
    ],
    skippedIndexes: [],
  },
  {
    description: 'Streaming de vídeo',
    tagName: 'Assinaturas',
    type: 'expense',
    startIndex: 6,
    endsMonthsAgo: null,
    amounts: [
      { fromIndex: 6, amountCents: 3990 },
      { fromIndex: 20, amountCents: 5590 },
    ],
    skippedIndexes: [10, 25],
  },
  {
    description: 'Academia',
    tagName: 'Saúde',
    type: 'expense',
    startIndex: 12,
    endsMonthsAgo: 6,
    amounts: [{ fromIndex: 12, amountCents: 12000 }],
    skippedIndexes: [],
  },
]

const MAX_SAFE_DAY = 28 // existe em todos os meses

/** Valor vigente no mês: o último item de `amounts` com `fromPeriod <= period` (RF-07). */
function amountIn(amounts: readonly RecurringAmount[], period: PeriodString): Cents {
  return amounts.reduce(
    (current, amount) => (amount.fromPeriod <= period ? amount.amountCents : current),
    amounts[0].amountCents,
  )
}

export function buildSampleRecurrings(context: SampleContext): {
  recurrings: Recurring[]
  transactions: Transaction[]
} {
  const { random } = context
  const periods = periodsBetween(periodOf(context.firstDate), periodOf(context.today))
  const currentIndex = periods.length - 1
  const recurrings: Recurring[] = []
  const transactions: Transaction[] = []

  for (const spec of RECURRING_SPECS) {
    const endIndex = spec.endsMonthsAgo === null ? null : currentIndex - spec.endsMonthsAgo
    const recurring: Recurring = {
      id: random.uuid(),
      type: spec.type,
      description: spec.description,
      tagId: tagIdOf(context, spec.tagName),
      startPeriod: periods[spec.startIndex],
      endPeriod: endIndex === null ? null : periods[endIndex],
      amounts: spec.amounts.map(({ fromIndex, amountCents }) => ({
        fromPeriod: periods[fromIndex],
        amountCents,
      })),
      skippedPeriods: spec.skippedIndexes.map((index) => periods[index]),
      createdAt: timestampOf(`${periods[spec.startIndex]}-01`),
      updatedAt: timestampOf(`${periods[spec.startIndex]}-01`),
    }
    recurrings.push(recurring)

    const lastConfirmedIndex = Math.min(endIndex ?? currentIndex - 1, currentIndex - 1)
    for (let index = spec.startIndex; index <= lastConfirmedIndex; index++) {
      if (spec.skippedIndexes.includes(index)) continue
      const period = periods[index]
      const date = `${period}-${String(random.int(1, MAX_SAFE_DAY)).padStart(2, '0')}`
      transactions.push({
        id: random.uuid(),
        type: recurring.type,
        amountCents: amountIn(recurring.amounts, period),
        date,
        description: recurring.description,
        tagId: recurring.tagId,
        recurringId: recurring.id,
        recurringPeriod: period,
        installmentGroupId: null,
        installmentNumber: null,
        createdAt: timestampOf(date),
        updatedAt: timestampOf(date),
      })
    }
  }

  return { recurrings, transactions }
}
