import type { ViewGranularity } from '@/domain/periodViews'

// RF-05 — textos da tela de visões.

export const GRANULARITY_LABELS: Record<ViewGranularity, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
}

export const PREVIOUS_PERIOD_LABELS: Record<ViewGranularity, string> = {
  day: 'Dia anterior',
  week: 'Semana anterior',
  month: 'Mês anterior',
  year: 'Ano anterior',
}

export const NEXT_PERIOD_LABELS: Record<ViewGranularity, string> = {
  day: 'Próximo dia',
  week: 'Próxima semana',
  month: 'Próximo mês',
  year: 'Próximo ano',
}

export const TODAY_LABEL = 'Hoje'

export const NO_DAY_TRANSACTIONS_MESSAGE = 'Nenhum lançamento neste dia.'

export const NO_MONTH_TRANSACTIONS_MESSAGE = 'Nenhum lançamento neste mês.'
