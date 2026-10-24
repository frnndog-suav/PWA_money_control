import type { ViewGranularity } from '@/domain/periodViews'

// RF-05 / RF-06 — textos dos controles de período, usados nas Visões e nos Gráficos (D-50).

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
