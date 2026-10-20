import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { addMonthsClamped } from '@/domain/dates'
import { toTagNameKey } from '@/domain/tags'
import type { DateString, InstallmentGroup, Recurring, Tag, Transaction } from '@/domain/types'
import { SAMPLE_TAGS } from '@/dev/sampleData/sampleCatalog'
import { tagIdOf, timestampOf, type SampleContext } from '@/dev/sampleData/sampleContext'
import { buildSampleInstallments } from '@/dev/sampleData/sampleInstallments'
import { buildSampleRecurrings } from '@/dev/sampleData/sampleRecurrings'
import { createSeededRandom } from '@/dev/sampleData/seededRandom'

// §6.11 — massa de dados de exemplo (somente desenvolvimento): 12 tags, 5.000 lançamentos
// em 3 anos, 4 recorrentes e 3 parcelamentos. Função pura: mesma semente e mesma data de
// referência dão os mesmos dados.

export const SAMPLE_TRANSACTION_COUNT = 5000
export const SAMPLE_MONTHS = 36
export const DEFAULT_SAMPLE_SEED = 20261019

export interface SampleData {
  tags: Tag[]
  transactions: Transaction[]
  recurrings: Recurring[]
  installmentGroups: InstallmentGroup[]
}

function buildTags(context: Pick<SampleContext, 'random' | 'firstDate'>): Tag[] {
  return SAMPLE_TAGS.map((spec) => ({
    id: context.random.uuid(),
    name: spec.name,
    nameKey: toTagNameKey(spec.name),
    color: spec.color,
    createdAt: timestampOf(context.firstDate),
    updatedAt: timestampOf(context.firstDate),
  }))
}

/** Lançamentos avulsos espalhados entre a primeira data e hoje. */
function buildLooseTransactions(context: SampleContext, count: number): Transaction[] {
  const { random, firstDate, today } = context
  const start = parseISO(firstDate)
  const dayCount = differenceInCalendarDays(parseISO(today), start)

  return Array.from({ length: count }, () => {
    const spec = random.pick(SAMPLE_TAGS)
    const date = format(addDays(start, random.int(0, dayCount)), 'yyyy-MM-dd')
    return {
      id: random.uuid(),
      type: spec.type,
      amountCents: random.int(spec.minCents, spec.maxCents),
      date,
      description: random.pick(spec.descriptions),
      tagId: tagIdOf(context, spec.name),
      recurringId: null,
      recurringPeriod: null,
      installmentGroupId: null,
      installmentNumber: null,
      createdAt: timestampOf(date),
      updatedAt: timestampOf(date),
    }
  })
}

export function buildSampleData(today: DateString, seed = DEFAULT_SAMPLE_SEED): SampleData {
  const random = createSeededRandom(seed)
  const firstDate = addMonthsClamped(today, -SAMPLE_MONTHS)
  const tags = buildTags({ random, firstDate })
  const context: SampleContext = {
    random,
    today,
    firstDate,
    tagIdByName: new Map(tags.map((tag) => [tag.name, tag.id])),
  }

  const recurring = buildSampleRecurrings(context)
  const installments = buildSampleInstallments(context)
  const linkedCount = recurring.transactions.length + installments.transactions.length
  const loose = buildLooseTransactions(context, SAMPLE_TRANSACTION_COUNT - linkedCount)

  return {
    tags,
    transactions: [...loose, ...recurring.transactions, ...installments.transactions],
    recurrings: recurring.recurrings,
    installmentGroups: installments.groups,
  }
}
