import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { formatLongDate } from '@/domain/dates'
import { formatBRL } from '@/domain/money'
import {
  NO_FILTER_RESULTS_MESSAGE,
  NO_TRANSACTIONS_YET_MESSAGE,
} from '@/features/transactions/transactionListTexts'
import {
  expectRowCount,
  openList,
  seedTags,
  seedTransactions,
  text,
  transactionLinks,
  typeSearch,
} from '@/test/transactionList'

function daySection(date: string): HTMLElement {
  return screen.getByRole('region', { name: formatLongDate(date) })
}

describe('TransactionsPage — lista agrupada por dia (RF-04 / CA-04.1)', () => {
  it('cabeçalho com a data por extenso e os totais do dia, do mais recente ao mais antigo', async () => {
    const { market, salary } = await seedTags()
    await seedTransactions(
      {
        description: 'Salário',
        type: 'income',
        amountCents: 100000,
        date: '2026-10-20',
        tagId: salary.id,
      },
      {
        description: 'Feira',
        type: 'expense',
        amountCents: 25000,
        date: '2026-10-20',
        tagId: market.id,
      },
      {
        description: 'Padaria',
        type: 'expense',
        amountCents: 1550,
        date: '2026-10-18',
        tagId: market.id,
      },
      // Datas futuras também aparecem na lista (a D-40 vale só para a tela inicial).
      {
        description: 'Parcela futura',
        type: 'expense',
        amountCents: 9900,
        date: '2027-01-05',
        tagId: market.id,
      },
    )
    await openList()

    const headings = await screen.findAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'terça-feira, 5 de janeiro de 2027',
      'terça-feira, 20 de outubro de 2026',
      'domingo, 18 de outubro de 2026',
    ])

    const day20 = daySection('2026-10-20')
    expect(within(day20).getByText(text(formatBRL(100000)))).toBeDefined()
    expect(within(day20).getByText(text(formatBRL(25000)))).toBeDefined()
    expect(within(day20).getAllByRole('link')).toHaveLength(2)

    const day18 = daySection('2026-10-18')
    expect(within(day18).getByText(text(formatBRL(0)))).toBeDefined()
    expect(within(day18).getByText(text(formatBRL(1550)))).toBeDefined()
    // Cada linha mostra a tag; a data já está no cabeçalho.
    expect(within(day18).getByText('Mercado')).toBeDefined()
    expect(within(day18).queryByText('18/10/2026')).toBeNull()
  })

  it('no mesmo dia, o criado por último vem primeiro (mesma ordem da tela inicial)', async () => {
    const { market } = await seedTags()
    await seedTransactions(
      {
        description: 'Primeiro',
        date: '2026-10-20',
        createdAt: '2026-10-20T10:00:00.000Z',
        tagId: market.id,
      },
      {
        description: 'Segundo',
        date: '2026-10-20',
        createdAt: '2026-10-20T11:00:00.000Z',
        tagId: market.id,
      },
    )
    await openList()
    await expectRowCount(2)
    expect(transactionLinks().map((link) => link.textContent)).toEqual([
      expect.stringContaining('Segundo'),
      expect.stringContaining('Primeiro'),
    ])
  })

  // CA-04.5 — e o "Voltar" da edição volta para a lista.
  it('tocar num lançamento abre a edição; "Voltar" retorna à lista', async () => {
    const { market } = await seedTags()
    const [coffee] = await seedTransactions({ description: 'Café', tagId: market.id })
    const router = await openList()

    fireEvent.click(await screen.findByRole('link', { name: /Café/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Lançamento' })).toBeDefined()
    expect(router.state.location.pathname).toBe(`/lancamentos/${coffee.id}`)

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Lançamentos' })).toBeDefined()
    expect(router.state.location.pathname).toBe('/lancamentos')
  })

  it('tem o atalho para "Novo lançamento"', async () => {
    const router = await openList()
    fireEvent.click(screen.getByRole('link', { name: 'Novo lançamento' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Novo lançamento' })).toBeDefined()
    expect(router.state.location.pathname).toBe('/lancamentos/novo')
  })
})

describe('TransactionsPage — estados vazios (RF-04)', () => {
  it('sem nenhum lançamento cadastrado', async () => {
    await openList()
    expect(await screen.findByText(NO_TRANSACTIONS_YET_MESSAGE)).toBeDefined()
    expect(screen.queryByText(NO_FILTER_RESULTS_MESSAGE)).toBeNull()
  })

  it('com lançamentos, mas nenhum resultado para os filtros', async () => {
    const { market } = await seedTags()
    await seedTransactions({ description: 'Mercado', tagId: market.id })
    await openList()
    await expectRowCount(1)

    typeSearch('não existe')
    expect(await screen.findByText(NO_FILTER_RESULTS_MESSAGE)).toBeDefined()
    expect(screen.queryByText(NO_TRANSACTIONS_YET_MESSAGE)).toBeNull()
    expect(transactionLinks()).toHaveLength(0)
    const summary = screen.getByRole('region', { name: 'Resumo dos filtros' })
    expect(within(summary).getByRole('status').textContent).toBe('0 lançamentos encontrados')
  })
})
