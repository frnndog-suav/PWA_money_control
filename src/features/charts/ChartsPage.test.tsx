import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ViewGranularity } from '@/domain/periodViews'
import {
  CHARTS_DAY_NOTICE,
  NO_EXPENSES_MESSAGE,
  NO_PERIOD_TRANSACTIONS_MESSAGE,
} from '@/features/charts/chartTexts'
import { saveThemePreference } from '@/repositories/themeRepository'
import { useUiStore } from '@/stores/uiStore'
import { chartProps, clickChart, PIXELS_PER_INDEX } from '@/test/chartMock'
import { renderApp } from '@/test/renderApp'
import { seedTags, seedTransactions, text } from '@/test/transactionList'

vi.mock('react-chartjs-2', () => import('@/test/chartStubs'))

// RF-06 / Fase 8 — tela de gráficos. O Chart.js é substituído (jsdom não tem canvas): os testes
// conferem os dados entregues a ele e simulam os toques pelas opções.

async function openCharts(granularity: ViewGranularity, anchorDate: string) {
  useUiStore.setState({ viewGranularity: granularity, viewAnchorDate: anchorDate })
  const router = renderApp(['/graficos'])
  await screen.findByRole('heading', { level: 1, name: 'Gráficos' })
  return router
}

function card(title: string): HTMLElement {
  return screen.getByRole('region', { name: title })
}

function canvasIn(title: string): HTMLCanvasElement {
  const canvas = card(title).querySelector('canvas')
  if (!canvas) throw new Error(`Sem gráfico em ${title}`)
  return canvas
}

function panelText(title: string): string {
  return text(card(title).querySelector('[aria-live]')?.textContent ?? '')
}

function legendButtons(title: string): HTMLElement[] {
  return within(within(card(title)).getByRole('list', { name: title })).getAllByRole('button')
}

function firstDataset(title: string): Record<string, unknown> {
  return chartProps(canvasIn(title)).data.datasets[0]
}

async function seedOctober() {
  const { market, salary, health } = await seedTags()
  await seedTransactions(
    { type: 'income', amountCents: 500000, date: '2026-10-05', tagId: salary.id },
    { type: 'expense', amountCents: 2000, date: '2026-10-20', tagId: market.id },
    { type: 'income', amountCents: 1000, date: '2026-10-20', tagId: salary.id },
    { type: 'expense', amountCents: 1550, date: '2026-10-25', tagId: market.id },
    { type: 'expense', amountCents: 4450, date: '2026-10-15', tagId: health.id },
    // Fora de outubro: depois (não entra) e antes (só no saldo inicial da linha).
    { type: 'expense', amountCents: 150000, date: '2026-11-01', tagId: market.id },
    { type: 'income', amountCents: 30000, date: '2026-09-30', tagId: salary.id },
  )
  return { market, salary, health }
}

describe('ChartsPage — período (RF-06 / CA-06.1 / D-50)', () => {
  it('usa o período das Visões, com os mesmos controles', async () => {
    await seedOctober()
    await openCharts('month', '2026-10-24')

    expect(screen.getByRole('heading', { level: 2, name: 'outubro de 2026' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Mês' })).toHaveProperty('checked', true)
    await screen.findByRole('region', { name: 'Saídas por tag' })

    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(useUiStore.getState().viewAnchorDate).toBe('2026-11-24')
  })

  it('na granularidade Dia mostra o aviso e nenhum gráfico', async () => {
    await seedOctober()
    await openCharts('day', '2026-10-20')

    expect(screen.getByText(CHARTS_DAY_NOTICE)).toBeTruthy()
    expect(document.querySelector('canvas')).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: 'Semana' }))
    expect(await screen.findByRole('region', { name: 'Entradas × Saídas' })).toBeTruthy()
    expect(screen.queryByText(CHARTS_DAY_NOTICE)).toBeNull()
  })

  // CA-06.10
  it('período sem lançamentos mostra o estado vazio, sem gráficos', async () => {
    await seedOctober()
    await openCharts('month', '2026-08-10')

    expect(await screen.findByText(NO_PERIOD_TRANSACTIONS_MESSAGE)).toBeTruthy()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('a linha de saldo existe só no Mês e no Ano', async () => {
    await seedOctober()
    await openCharts('week', '2026-10-20')

    await screen.findByRole('region', { name: 'Entradas × Saídas' })
    expect(screen.queryByRole('region', { name: 'Evolução do saldo' })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: 'Ano' }))
    expect(await screen.findByRole('region', { name: 'Evolução do saldo' })).toBeTruthy()
  })
})

describe('ChartsPage — pizzas por tag (CA-06.3 / CA-06.6 / CA-06.7)', () => {
  it('legenda do maior para o menor, com valor e percentual, e as cores das tags', async () => {
    const { market, health } = await seedOctober()
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Saídas por tag' })

    expect(legendButtons('Saídas por tag').map((button) => text(button.textContent ?? ''))).toEqual(
      ['SaúdeR$ 44,50 · 55,6%', 'MercadoR$ 35,50 · 44,4%'],
    )
    expect(firstDataset('Saídas por tag')).toMatchObject({
      data: [4450, 3550],
      backgroundColor: [health.color, market.color],
    })
    expect(panelText('Saídas por tag')).toBe('Total de saídas: R$ 80,00')
    expect(
      legendButtons('Entradas por tag').map((button) => text(button.textContent ?? '')),
    ).toEqual(['SalárioR$ 5.010,00 · 100,0%'])
  })

  it('tocar no item seleciona a fatia; tocar de novo limpa', async () => {
    const { market, health } = await seedOctober()
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Saídas por tag' })

    const [, marketItem] = legendButtons('Saídas por tag')
    fireEvent.click(marketItem)
    expect(marketItem.getAttribute('aria-pressed')).toBe('true')
    expect(legendButtons('Saídas por tag')[0].getAttribute('aria-pressed')).toBe('false')
    expect(firstDataset('Saídas por tag')).toMatchObject({
      offset: [0, 12],
      backgroundColor: [`${health.color}59`, market.color],
    })
    expect(panelText('Saídas por tag')).toBe('Mercado — R$ 35,50 · 44,4%')

    fireEvent.click(marketItem)
    expect(marketItem.getAttribute('aria-pressed')).toBe('false')
    expect(firstDataset('Saídas por tag')).toMatchObject({ offset: [0, 0] })
    expect(panelText('Saídas por tag')).toBe('Total de saídas: R$ 80,00')
  })

  it('tocar na fatia seleciona o item; tocar fora do cartão limpa', async () => {
    await seedOctober()
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Saídas por tag' })

    act(() => clickChart(canvasIn('Saídas por tag'), 0))
    expect(legendButtons('Saídas por tag')[0].getAttribute('aria-pressed')).toBe('true')
    // A seleção de uma pizza não afeta a outra.
    expect(legendButtons('Entradas por tag')[0].getAttribute('aria-pressed')).toBe('false')

    fireEvent.pointerDown(card('Entradas × Saídas'))
    expect(legendButtons('Saídas por tag')[0].getAttribute('aria-pressed')).toBe('false')
  })

  it('tocar no gráfico fora das fatias também limpa', async () => {
    await seedOctober()
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Saídas por tag' })

    act(() => clickChart(canvasIn('Saídas por tag'), 1))
    expect(panelText('Saídas por tag')).toBe('Mercado — R$ 35,50 · 44,4%')
    act(() => clickChart(canvasIn('Saídas por tag'), null))
    expect(panelText('Saídas por tag')).toBe('Total de saídas: R$ 80,00')
  })

  it('sem saídas no período, a pizza de saídas mostra o próprio estado vazio', async () => {
    const { salary } = await seedTags()
    await seedTransactions({
      type: 'income',
      amountCents: 100,
      date: '2026-10-05',
      tagId: salary.id,
    })
    await openCharts('month', '2026-10-24')

    expect(await screen.findByText(NO_EXPENSES_MESSAGE)).toBeTruthy()
    expect(card('Saídas por tag').querySelector('canvas')).toBeNull()
  })
})

describe('ChartsPage — barras Entradas × Saídas (CA-06.4)', () => {
  it('sem seleção, o painel mostra o período inteiro; tocar na coluna mostra o dia', async () => {
    await seedOctober()
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Entradas × Saídas' })

    const options = chartProps(canvasIn('Entradas × Saídas')).options
    expect(options).toMatchObject({
      interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { enabled: false }, legend: { display: false } },
    })
    expect(chartProps(canvasIn('Entradas × Saídas')).data.labels).toHaveLength(31)
    expect(panelText('Entradas × Saídas')).toBe(
      'Período inteiro: Entradas R$ 5.010,00 · Saídas R$ 80,00 · Resultado +R$ 4.930,00',
    )

    act(() => clickChart(canvasIn('Entradas × Saídas'), 19))
    expect(panelText('Entradas × Saídas')).toBe(
      '20 de out.: Entradas R$ 10,00 · Saídas R$ 20,00 · Resultado −R$ 10,00',
    )
    expect(chartProps(canvasIn('Entradas × Saídas')).options).toMatchObject({
      plugins: { selectionHighlight: { index: 19, style: 'band' } },
    })
  })

  it('setas do teclado mudam a seleção; Esc limpa (RNF-06)', async () => {
    await seedOctober()
    await openCharts('year', '2026-10-24')
    const group = await screen.findByRole('group', { name: /^Entradas × Saídas/ })

    fireEvent.keyDown(group, { key: 'End' })
    expect(panelText('Entradas × Saídas')).toMatch(/^dezembro de 2026:/)
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(panelText('Entradas × Saídas')).toBe(
      'outubro de 2026: Entradas R$ 5.010,00 · Saídas R$ 80,00 · Resultado +R$ 4.930,00',
    )
    fireEvent.keyDown(group, { key: 'Escape' })
    expect(panelText('Entradas × Saídas')).toMatch(/^Período inteiro:/)
  })
})

describe('ChartsPage — linha Evolução do saldo (CA-06.5)', () => {
  it('saldo acumulado com o saldo anterior ao período; o arraste move o marcador', async () => {
    await seedOctober()
    await openCharts('month', '2026-10-24')
    const group = await screen.findByRole('group', { name: /^Evolução do saldo/ })

    // Setembro deixa R$ 300,00; outubro soma +R$ 4.930,00.
    await waitFor(() =>
      expect(panelText('Evolução do saldo')).toBe('Saldo ao fim do período: +R$ 5.230,00'),
    )
    expect(group.className).toContain('touch-pan-y')
    expect(chartProps(canvasIn('Evolução do saldo')).options).toMatchObject({ events: [] })

    fireEvent.pointerDown(group, { clientX: 4 * PIXELS_PER_INDEX, pointerId: 1 })
    expect(panelText('Evolução do saldo')).toBe('5 de out.: saldo +R$ 5.300,00')

    fireEvent.pointerMove(group, { clientX: 19 * PIXELS_PER_INDEX + 3, pointerId: 1 })
    expect(panelText('Evolução do saldo')).toBe('20 de out.: saldo +R$ 5.245,50')
    expect(chartProps(canvasIn('Evolução do saldo')).options).toMatchObject({
      plugins: { selectionHighlight: { index: 19, style: 'line' } },
    })

    // Depois de soltar, mover sem tocar não muda nada e a seleção permanece.
    fireEvent.pointerUp(group, { pointerId: 1 })
    fireEvent.pointerMove(group, { clientX: 0, pointerId: 1 })
    expect(panelText('Evolução do saldo')).toBe('20 de out.: saldo +R$ 5.245,50')

    // Arrastar além das bordas fica no primeiro/último ponto.
    fireEvent.pointerDown(group, { clientX: 999 * PIXELS_PER_INDEX, pointerId: 2 })
    expect(panelText('Evolução do saldo')).toBe('31 de out.: saldo +R$ 5.230,00')

    fireEvent.pointerDown(document.body)
    expect(panelText('Evolução do saldo')).toBe('Saldo ao fim do período: +R$ 5.230,00')
  })
})

describe('ChartsPage — seleção e tema (CA-06.8 / CA-06.9)', () => {
  it('trocar de período limpa a seleção', async () => {
    await seedOctober()
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Saídas por tag' })

    fireEvent.click(legendButtons('Saídas por tag')[0])
    act(() => clickChart(canvasIn('Entradas × Saídas'), 4))

    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() =>
      expect(legendButtons('Saídas por tag')[0].getAttribute('aria-pressed')).toBe('false'),
    )
    expect(panelText('Entradas × Saídas')).toMatch(/^Período inteiro:/)
  })

  it('trocar a granularidade limpa a seleção', async () => {
    await seedOctober()
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Saídas por tag' })

    fireEvent.click(legendButtons('Saídas por tag')[0])
    fireEvent.click(screen.getByRole('radio', { name: 'Ano' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mês' }))
    await waitFor(() =>
      expect(legendButtons('Saídas por tag')[0].getAttribute('aria-pressed')).toBe('false'),
    )
  })

  it('no tema escuro, eixos, grade e séries usam as cores escuras', async () => {
    await seedOctober()
    await saveThemePreference('dark')
    await openCharts('month', '2026-10-24')
    await screen.findByRole('region', { name: 'Entradas × Saídas' })

    await waitFor(() =>
      expect(chartProps(canvasIn('Entradas × Saídas')).options).toMatchObject({
        scales: { x: { ticks: { color: '#CBD5E1' } }, y: { grid: { color: '#334155' } } },
      }),
    )
    expect(firstDataset('Entradas × Saídas')).toMatchObject({
      backgroundColor: expect.arrayContaining(['#4ADE80']),
    })
  })
})
