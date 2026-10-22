import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { formatBRL, formatSignedBRL } from '@/domain/money'
import { INVERTED_PERIOD_MESSAGE } from '@/features/transactions/transactionListTexts'
import { useUiStore } from '@/stores/uiStore'
import {
  expectRowCount,
  openFiltersPanel,
  openList,
  searchInput,
  seedTags,
  seedTransactions,
  setDate,
  text,
  transactionLinks,
  typeSearch,
} from '@/test/transactionList'

function summary(): HTMLElement {
  return screen.getByRole('region', { name: 'Resumo dos filtros' })
}

async function expectSummaryCount(label: string): Promise<void> {
  await waitFor(() => expect(within(summary()).getByRole('status').textContent).toBe(label))
}

const rowTexts = () => transactionLinks().map((link) => link.textContent ?? '')

async function seedMarketData() {
  const tags = await seedTags()
  const { market, salary, health } = tags
  await seedTransactions(
    { description: 'Mercado', amountCents: 25000, date: '2026-10-20', tagId: market.id },
    { description: 'mercado do bairro', amountCents: 4590, date: '2026-10-12', tagId: market.id },
    { description: 'Feira', amountCents: 3000, date: '2026-09-28', tagId: market.id },
    {
      description: 'Salário',
      type: 'income',
      amountCents: 500000,
      date: '2026-10-05',
      tagId: salary.id,
    },
    { description: 'Farmácia', amountCents: 8990, date: '2026-10-15', tagId: health.id },
  )
  return tags
}

describe('TransactionsPage — filtros (RF-04 / CA-04.2 a CA-04.4)', () => {
  it('sem filtros não mostra o resumo nem "Limpar filtros"', async () => {
    await seedMarketData()
    await openList()
    await expectRowCount(5)
    expect(screen.queryByRole('region', { name: 'Resumo dos filtros' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull()
  })

  // Roteiro da Fase 5, item 2.
  it('buscar "merc" encontra "Mercado" e "mercado do bairro", com quantidade e totais', async () => {
    await seedMarketData()
    await openList()
    await expectRowCount(5)

    typeSearch('merc')
    await expectRowCount(2)
    expect(rowTexts()).toEqual([
      expect.stringContaining('Mercado'),
      expect.stringContaining('mercado do bairro'),
    ])
    await expectSummaryCount('2 lançamentos encontrados')
    const box = summary()
    expect(within(box).getByText(text(formatBRL(0)))).toBeDefined()
    expect(within(box).getByText(text(formatBRL(29590)))).toBeDefined()
    expect(within(box).getByText(text(formatSignedBRL(-29590)))).toBeDefined()
  })

  it('a busca ignora maiúsculas e acentos', async () => {
    await seedMarketData()
    await openList()
    typeSearch('FARMACIA')
    await expectRowCount(1)
    expect(rowTexts()[0]).toContain('Farmácia')
  })

  // Roteiro da Fase 5, item 3 — tag + período: os totais batem com a soma dos itens.
  it('tag + período combinados, com os totais do conjunto filtrado', async () => {
    await seedMarketData()
    await openList()
    await expectRowCount(5)

    openFiltersPanel()
    fireEvent.click(await screen.findByRole('radio', { name: 'Mercado' }))
    setDate('Data inicial', '2026-10-01')
    setDate('Data final', '2026-10-31')

    await expectRowCount(2)
    await expectSummaryCount('2 lançamentos encontrados')
    // 250,00 + 45,90 = 295,90 de saídas; resultado −295,90.
    expect(within(summary()).getByText(text(formatBRL(29590)))).toBeDefined()
    expect(within(summary()).getByText(text(formatSignedBRL(-29590)))).toBeDefined()
    expect(screen.getByRole('button', { name: 'Filtros (2)' })).toBeDefined()
  })

  it('tipo: só entradas', async () => {
    await seedMarketData()
    await openList()
    openFiltersPanel()
    fireEvent.click(screen.getByRole('radio', { name: 'Entradas' }))
    await expectRowCount(1)
    await expectSummaryCount('1 lançamento encontrado')
    expect(within(summary()).getByText(text(formatSignedBRL(500000)))).toBeDefined()
  })

  it('o painel de filtros abre e fecha pelo botão "Filtros"', async () => {
    await openList()
    const toggle = screen.getByRole('button', { name: /^Filtros/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('radio', { name: 'Entradas' })).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Todos' })).toBeDefined()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('data inicial depois da final: aviso e o período não é aplicado', async () => {
    await seedMarketData()
    await openList()
    openFiltersPanel()
    setDate('Data inicial', '2026-10-31')
    setDate('Data final', '2026-10-01')

    expect(await screen.findByText(INVERTED_PERIOD_MESSAGE)).toBeDefined()
    expect(screen.getByLabelText('Data final').getAttribute('aria-invalid')).toBe('true')
    await expectRowCount(5)
    await expectSummaryCount('5 lançamentos encontrados')
  })

  // CA-04.4
  it('"Limpar filtros" zera todos os filtros e volta à lista completa', async () => {
    await seedMarketData()
    await openList()
    typeSearch('merc')
    openFiltersPanel()
    fireEvent.click(await screen.findByRole('radio', { name: 'Saídas' }))
    setDate('Data inicial', '2026-10-15')
    await expectRowCount(1)

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await expectRowCount(5)
    expect(searchInput().value).toBe('')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Todos' }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Todas' }).checked).toBe(true)
    expect(screen.getByLabelText<HTMLInputElement>('Data inicial').value).toBe('')
    expect(screen.queryByRole('region', { name: 'Resumo dos filtros' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull()
    expect(useUiStore.getState().transactionFilters.text).toBe('')
  })

  // CA-04.4 / roteiro da Fase 5, item 4 — os filtros ficam no Zustand ao trocar de tela.
  it('trocar de aba e voltar mantém os filtros', async () => {
    const { market } = await seedMarketData()
    await openList(['/', '/lancamentos'])
    typeSearch('merc')
    openFiltersPanel()
    fireEvent.click(await screen.findByRole('radio', { name: 'Mercado' }))
    await expectRowCount(2)

    fireEvent.click(screen.getByRole('link', { name: 'Início' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeDefined()
    fireEvent.click(screen.getByRole('link', { name: 'Lançamentos' }))
    await screen.findByRole('heading', { level: 1, name: 'Lançamentos' })

    expect(searchInput().value).toBe('merc')
    await expectRowCount(2)
    await expectSummaryCount('2 lançamentos encontrados')
    expect(screen.getByRole('button', { name: 'Filtros (1)' })).toBeDefined()
    expect(useUiStore.getState().transactionFilters.tagId).toBe(market.id)
  })

  // CA-04.5 — editar e voltar mantém os filtros.
  it('abrir um lançamento filtrado e voltar mantém os filtros', async () => {
    await seedMarketData()
    await openList()
    typeSearch('bairro')
    await expectRowCount(1)

    fireEvent.click(transactionLinks()[0])
    await screen.findByRole('heading', { level: 1, name: 'Lançamento' })
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    await screen.findByRole('heading', { level: 1, name: 'Lançamentos' })
    expect(searchInput().value).toBe('bairro')
    await expectRowCount(1)
  })
})

describe('TransactionsPage — ajustes da revisão (RF-04 / RNF-06)', () => {
  // RNF-06 — o botão some ao limpar; o foco vai para a busca, e não para o <body>.
  it('depois de "Limpar filtros" o foco vai para "Buscar na descrição"', async () => {
    await seedMarketData()
    await openList()
    typeSearch('merc')
    const clear = await screen.findByRole('button', { name: 'Limpar filtros' })
    clear.focus()

    fireEvent.click(clear)

    await waitFor(() => expect(document.activeElement).toBe(searchInput()))
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull()
  })

  // CA-04.2 — a tag do filtro foi excluída: vale como "Todas".
  it('filtro com uma tag que não existe mais é tratado como "Todas"', async () => {
    await seedMarketData()
    useUiStore.getState().setFilters({ tagId: 'tag-excluida' })
    await openList()

    await expectRowCount(5)
    await waitFor(() => expect(useUiStore.getState().transactionFilters.tagId).toBeNull())
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeDefined()
    expect(screen.queryByRole('region', { name: 'Resumo dos filtros' })).toBeNull()
    openFiltersPanel()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Todas' }).checked).toBe(true)
  })

  // CA-04.3 — o resumo só aparece com a busca já aplicada (nunca com os totais sem filtro).
  it('o resumo da busca só aparece com o resultado filtrado', async () => {
    await seedMarketData()
    await openList()
    await expectRowCount(5)

    typeSearch('merc')
    expect(screen.queryByRole('region', { name: 'Resumo dos filtros' })).toBeNull()
    await expectSummaryCount('2 lançamentos encontrados')
  })
})
