// §6.3 — modelo de dados. Dinheiro em centavos inteiros (princípio 1) e datas sem fuso
// (princípio 2).

export type TransactionType = 'income' | 'expense'
export type DateString = string // 'YYYY-MM-DD'
export type PeriodString = string // 'YYYY-MM'
export type Cents = number // inteiro

export interface Tag {
  id: string
  name: string
  nameKey: string // nome normalizado: minúsculas, sem acentos, sem espaços nas pontas (unicidade)
  color: string // '#RRGGBB'
  createdAt: string // ISO 8601
  updatedAt: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amountCents: Cents // > 0
  date: DateString
  description: string
  tagId: string
  // Vínculo com recorrente (RF-07)
  recurringId: string | null
  recurringPeriod: PeriodString | null // mês da ocorrência
  // Vínculo com parcelamento (RF-08)
  installmentGroupId: string | null
  installmentNumber: number | null // 1..n
  createdAt: string
  updatedAt: string
}

export interface RecurringAmount {
  fromPeriod: PeriodString // vale a partir deste mês
  amountCents: Cents
}

export interface Recurring {
  id: string
  type: TransactionType
  description: string
  tagId: string
  startPeriod: PeriodString
  endPeriod: PeriodString | null
  amounts: RecurringAmount[] // ordenado por fromPeriod; o 1º tem fromPeriod = startPeriod
  skippedPeriods: PeriodString[] // meses pulados
  createdAt: string
  updatedAt: string
}

export interface InstallmentGroup {
  id: string
  description: string
  tagId: string
  totalCents: Cents
  count: number // 2..48
  firstDate: DateString
  createdAt: string
}

export interface Setting {
  key: 'theme' | 'lastBackupAt' | 'persistRequested'
  value: string
}
