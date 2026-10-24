import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_UI_STATE, useUiStore } from '@/stores/uiStore'

// RF-05 / CA-05.4 — granularidade e data de referência das visões no Zustand.

describe('uiStore — visões por período (RF-05 / CA-05.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 24, 10, 0))
    useUiStore.setState({ ...INITIAL_UI_STATE, viewAnchorDate: '2026-10-24' })
  })

  afterEach(() => vi.useRealTimers())

  const view = () => {
    const { viewGranularity, viewAnchorDate } = useUiStore.getState()
    return { viewGranularity, viewAnchorDate }
  }

  it('começa na visão Mês do dia em que o app abriu', () => {
    expect(INITIAL_UI_STATE.viewGranularity).toBe('month')
    expect(INITIAL_UI_STATE.viewAnchorDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('setGranularity troca a granularidade e mantém a data de referência', () => {
    useUiStore.getState().setGranularity('week')
    expect(view()).toEqual({ viewGranularity: 'week', viewAnchorDate: '2026-10-24' })
  })

  it('goPrev e goNext andam um período da granularidade atual', () => {
    const { setGranularity, goPrev, goNext } = useUiStore.getState()
    setGranularity('day')
    goNext()
    expect(view().viewAnchorDate).toBe('2026-10-25')
    setGranularity('week')
    goPrev()
    expect(view().viewAnchorDate).toBe('2026-10-18')
    setGranularity('month')
    goNext()
    expect(view().viewAnchorDate).toBe('2026-11-18')
    setGranularity('year')
    goPrev()
    expect(view().viewAnchorDate).toBe('2025-11-18')
  })

  it('navega de dezembro para janeiro (virada de ano) e volta', () => {
    useUiStore.setState({ viewGranularity: 'month', viewAnchorDate: '2026-12-31' })
    useUiStore.getState().goNext()
    expect(view().viewAnchorDate).toBe('2027-01-31')
    useUiStore.getState().goPrev()
    expect(view().viewAnchorDate).toBe('2026-12-31')
  })

  it('goToday volta para hoje e mantém a granularidade', () => {
    useUiStore.setState({ viewGranularity: 'year', viewAnchorDate: '2020-03-15' })
    useUiStore.getState().goToday()
    expect(view()).toEqual({ viewGranularity: 'year', viewAnchorDate: '2026-10-24' })
  })

  it('openPeriod troca granularidade e data juntas (detalhamento)', () => {
    useUiStore.getState().openPeriod('day', '2026-03-05')
    expect(view()).toEqual({ viewGranularity: 'day', viewAnchorDate: '2026-03-05' })
  })

  it('não mexe nos filtros da lista', () => {
    useUiStore.getState().setFilters({ text: 'merc' })
    useUiStore.getState().goNext()
    useUiStore.getState().openPeriod('week', '2026-01-01')
    expect(useUiStore.getState().transactionFilters.text).toBe('merc')
  })
})
