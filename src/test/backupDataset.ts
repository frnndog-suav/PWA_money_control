import { toTagNameKey } from '@/domain/tags'
import type { InstallmentGroup, Recurring, Setting, Tag, Transaction } from '@/domain/types'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// RF-10 / CA-10.1 — dados de backup gerados com semente (sem bibliotecas extras), cobrindo as
// 5 tabelas da §6.3: tags, lançamentos (avulsos, de recorrente e de parcelamento), recorrentes
// com histórico de valores e meses pulados, parcelamentos e as 3 chaves de `settings`.

export interface BackupDataset {
  tags: Tag[]
  transactions: Transaction[]
  recurrings: Recurring[]
  installmentGroups: InstallmentGroup[]
  settings: Setting[]
}

// Textos com acentos, emoji, aspas, barras, quebras de linha e escrita não latina.
const TEXTS = [
  'Mercado',
  'Pão de queijo',
  'Açaí 🍇',
  'Salário — outubro',
  '“aspas” e \\ barra',
  'ç ñ ü ß',
  '  espaços nas pontas  ',
  '日本語のテキスト',
  'linha\nquebrada',
  '"json" {} [] : ,',
  'x'.repeat(100),
  '👨‍👩‍👧 família',
]

const THEMES = ['system', 'light', 'dark'] as const

export interface GenerateOptions {
  maxTransactions?: number
}

export function generateBackupDataset(
  seed: number,
  { maxTransactions = 40 }: GenerateOptions = {},
): BackupDataset {
  const random = createTestRandom(seed)
  const pick = <T>(items: readonly T[]): T => items[random.int(0, items.length - 1)]
  const hex = (length: number) =>
    Array.from({ length }, () => random.int(0, 15).toString(16)).join('')
  // Princípio 9 — IDs no formato UUID v4 (derivados da semente para serem reprodutíveis).
  const uuid = () =>
    `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`
  const pad = (value: number, length = 2) => String(value).padStart(length, '0')

  const randomDate = () => {
    const year = random.int(2020, 2030)
    const month = random.int(1, 12)
    return toDateString(year, month, random.int(1, daysInMonth(year, month)))
  }
  const randomPeriod = () => `${random.int(2020, 2030)}-${pad(random.int(1, 12))}`
  const addMonths = (period: string, months: number) => {
    const index = Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1 + months
    return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
  }
  const timestamp = () =>
    `${randomDate()}T${pad(random.int(0, 23))}:${pad(random.int(0, 59))}:${pad(random.int(0, 59))}.${pad(random.int(0, 999), 3)}Z`
  // §6.3 — centavos inteiros positivos, até o teto do RF-01 (D-31).
  const cents = () => random.int(1, 9_999_999_999)

  const tags: Tag[] = Array.from({ length: random.int(1, 6) }, (_, index) => {
    const createdAt = timestamp()
    const name = `${pick(TEXTS).trim()} ${index}`
    return {
      id: uuid(),
      name,
      nameKey: toTagNameKey(name),
      color: `#${hex(6).toUpperCase()}`,
      createdAt,
      updatedAt: random.next() < 0.5 ? createdAt : timestamp(),
    }
  })

  const recurrings: Recurring[] = Array.from({ length: random.int(0, 3) }, () => {
    const startPeriod = randomPeriod()
    let fromPeriod = startPeriod
    const amounts = Array.from({ length: random.int(1, 4) }, (_, index) => {
      if (index > 0) fromPeriod = addMonths(fromPeriod, random.int(1, 6))
      return { fromPeriod, amountCents: cents() }
    })
    const skippedPeriods = Array.from({ length: random.int(0, 3) }, (_, index) =>
      addMonths(startPeriod, index * 2 + 1),
    )
    return {
      id: uuid(),
      type: pick(['income', 'expense'] as const),
      description: pick(TEXTS),
      tagId: pick(tags).id,
      startPeriod,
      endPeriod: random.next() < 0.5 ? null : addMonths(startPeriod, random.int(12, 36)),
      amounts,
      skippedPeriods,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    }
  })

  const installmentGroups: InstallmentGroup[] = Array.from({ length: random.int(0, 3) }, () => ({
    id: uuid(),
    description: pick(TEXTS),
    tagId: pick(tags).id,
    totalCents: cents(),
    count: random.int(2, 48),
    firstDate: randomDate(),
    createdAt: timestamp(),
  }))

  const transactions: Transaction[] = Array.from({ length: random.int(0, maxTransactions) }, () => {
    const link = random.int(0, 2)
    const recurring = link === 1 && recurrings.length > 0 ? pick(recurrings) : null
    const group = link === 2 && installmentGroups.length > 0 ? pick(installmentGroups) : null
    return {
      id: uuid(),
      type: group ? 'expense' : pick(['income', 'expense'] as const),
      amountCents: cents(),
      date: randomDate(),
      description: pick(TEXTS),
      tagId: pick(tags).id,
      recurringId: recurring?.id ?? null,
      recurringPeriod: recurring ? addMonths(recurring.startPeriod, random.int(0, 11)) : null,
      installmentGroupId: group?.id ?? null,
      installmentNumber: group ? random.int(1, group.count) : null,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    }
  })

  const settings: Setting[] = [
    { key: 'lastBackupAt', value: timestamp() },
    { key: 'persistRequested', value: timestamp() },
  ]
  if (random.next() < 0.8) settings.push({ key: 'theme', value: pick(THEMES) })

  return { tags, transactions, recurrings, installmentGroups, settings }
}
