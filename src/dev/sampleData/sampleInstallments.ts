import { addMonthsClamped } from '@/domain/dates'
import type { Cents, DateString, InstallmentGroup, Transaction } from '@/domain/types'
import { tagIdOf, timestampOf, type SampleContext } from '@/dev/sampleData/sampleContext'

// §6.11 / RF-08 — 3 parcelamentos de exemplo (saídas — D-06), com parcelas passadas e
// futuras. As datas usam addMonthsClamped e uma compra começa no dia 31, para exercitar
// o ajuste ao último dia do mês.

interface InstallmentSpec {
  description: string
  tagName: string
  totalCents: Cents
  count: number
  firstDate: (today: DateString) => DateString
}

const INSTALLMENT_SPECS: readonly InstallmentSpec[] = [
  {
    description: 'Notebook',
    tagName: 'Educação',
    totalCents: 459990,
    count: 12,
    // 31 de janeiro do ano de 6 meses atrás: passa por fevereiro e pelos meses de 30 dias.
    firstDate: (today) => `${addMonthsClamped(today, -6).slice(0, 4)}-01-31`,
  },
  {
    description: 'Geladeira',
    tagName: 'Moradia',
    totalCents: 389999, // não divide por 10: o resto vai para a 1ª parcela
    count: 10,
    firstDate: (today) => addMonthsClamped(today, -15),
  },
  {
    description: 'Passagens aéreas',
    tagName: 'Lazer',
    totalCents: 250000,
    count: 6,
    firstDate: (today) => addMonthsClamped(today, -2),
  },
]

/** Divisão inteira com o resto somado à 1ª parcela (D-06); a soma é igual ao total. */
function splitTotal(totalCents: Cents, count: number): Cents[] {
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  return Array.from({ length: count }, (_, index) => (index === 0 ? base + remainder : base))
}

export function buildSampleInstallments(context: SampleContext): {
  groups: InstallmentGroup[]
  transactions: Transaction[]
} {
  const groups: InstallmentGroup[] = []
  const transactions: Transaction[] = []

  for (const spec of INSTALLMENT_SPECS) {
    const firstDate = spec.firstDate(context.today)
    const group: InstallmentGroup = {
      id: context.random.uuid(),
      description: spec.description,
      tagId: tagIdOf(context, spec.tagName),
      totalCents: spec.totalCents,
      count: spec.count,
      firstDate,
      createdAt: timestampOf(firstDate),
    }
    groups.push(group)

    splitTotal(spec.totalCents, spec.count).forEach((amountCents, index) => {
      const date = addMonthsClamped(firstDate, index)
      transactions.push({
        id: context.random.uuid(),
        type: 'expense',
        amountCents,
        date,
        // A descrição guardada é a base, sem o sufixo "(k/n)" (§6.5).
        description: group.description,
        tagId: group.tagId,
        recurringId: null,
        recurringPeriod: null,
        installmentGroupId: group.id,
        installmentNumber: index + 1,
        createdAt: group.createdAt,
        updatedAt: group.createdAt,
      })
    })
  }

  return { groups, transactions }
}
