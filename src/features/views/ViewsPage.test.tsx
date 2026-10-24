import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatBRL, formatSignedBRL } from '@/domain/money'
import type { ViewGranularity } from '@/domain/periodViews'
import {
  NO_DAY_TRANSACTIONS_MESSAGE,
  NO_MONTH_TRANSACTIONS_MESSAGE,
} from '@/features/views/viewTexts'
import { useUiStore } from '@/stores/uiStore'
import { renderApp } from '@/test/renderApp'
import { seedTags, seedTransactions, text } from '@/test/transactionList'

// RF-05 / Fase 7 — visões por período (sem recorrentes: Fase 9).

async function openViews(granularity: ViewGranularity, anchorDate: string) {
  useUiStore.setState({ viewGranularity: granularity, viewAnchorDate: anchorDate })
  const router = renderApp(['/visoes'])
  await screen.findByRole('heading', { level: 1, name: 'Visões' })
  return router
}

function periodTitle(): HTMLElement {
  return screen.getByRole('heading', { level: 2 })
}

async function expectTitle(title: string): Promise<void> {
  await waitFor(() => expect(periodTitle().textContent).toBe(title))
}

/** Valor ao lado do rótulo no cartão de resumo. */
function summaryValue(label: 'Entradas' | 'Saídas' | 'Resultado'): string {
  const card = screen.getByRole('region', { name: 'Resumo do período' })
  const term = within(card).getByText(label)
  return text(term.nextElementSibling?.textContent ?? '')
}

async function expectSummary(incomeCents: number, expenseCents: number): Promise<void> {
  await waitFor(() => {
    expect(summaryValue('Entradas')).toBe(text(formatBRL(incomeCents)))
    expect(summaryValue('Saídas')).toBe(text(formatBRL(expenseCents)))
    expect(summaryValue('Resultado')).toBe(text(formatSignedBRL(incomeCents - expenseCents)))
  })
}

async function rowsOf(listName: string): Promise<HTMLElement[]> {
  const list = await screen.findByRole('list', { name: listName })
  return within(list).getAllByRole('button')
}

async function seedOctober() {
  const { market, salary } = await seedTags()
  await seedTransactions(
    {
      description: 'Salário',
      type: 'income',
      amountCents: 500000,
      date: '2026-10-05',
      tagId: salary.id,
    },
    {
      description: 'Feira',
      type: 'expense',
      amountCents: 2000,
      date: '2026-10-20',
      tagId: market.id,
    },
    {
      description: 'Pix recebido',
      type: 'income',
      amountCents: 1000,
      date: '2026-10-20',
      tagId: salary.id,
    },
    {
      description: 'Padaria',
      type: 'expense',
      amountCents: 1550,
      date: '2026-10-25',
      tagId: market.id,
    },
    // Fora de outubro (CA-05.1).
    {
      description: 'Aluguel',
      type: 'expense',
      amountCents: 150000,
      date: '2026-11-01',
      tagId: market.id,
    },
    {
      description: 'Bônus',
      type: 'income',
      amountCents: 30000,
      date: '2026-09-30',
      tagId: salary.id,
    },
  )
}

describe('ViewsPage — visão Dia (RF-05)', () => {
  it('totais de entrada e saída do dia e a lista dos lançamentos', async () => {
    await seedOctober()
    await openViews('day', '2026-10-20')

    await expectTitle('terça-feira, 20 de outubro de 2026')
    await expectSummary(1000, 2000)
    const list = await screen.findByRole('list', { name: 'Lançamentos do dia' })
    const links = within(list).getAllByRole('link')
    const descriptions = links.map((link) => link.textContent ?? '')
    expect(descriptions).toHaveLength(2)
    expect(descriptions.some((value) => value.includes('Feira'))).toBe(true)
    expect(descriptions.some((value) => value.includes('Pix recebido'))).toBe(true)
  })

  it('dia sem lançamentos mostra o estado vazio e totais zerados', async () => {
    await seedOctober()
    await openViews('day', '2026-10-21')

    expect(await screen.findByText(NO_DAY_TRANSACTIONS_MESSAGE)).toBeTruthy()
    await expectSummary(0, 0)
  })

  it('tocar num lançamento abre a edição (CA-01.5)', async () => {
    await seedOctober()
    const router = await openViews('day', '2026-10-25')

    fireEvent.click(await screen.findByRole('link', { name: /Padaria/ }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/lancamentos\/.+/))
  })
})

describe('ViewsPage — visão Semana (RF-05 / CA-05.3)', () => {
  it('7 linhas de segunda a domingo e o intervalo no título', async () => {
    await seedOctober()
    await openViews('week', '2026-10-22')

    await expectTitle('19 a 25 de out. de 2026')
    await expectSummary(1000, 3550)
    const rows = await rowsOf('Dias da semana')
    expect(rows.map((row) => row.textContent?.split(/Entradas/)[0])).toEqual([
      'segunda-feira, 19/10',
      'terça-feira, 20/10',
      'quarta-feira, 21/10',
      'quinta-feira, 22/10',
      'sexta-feira, 23/10',
      'sábado, 24/10',
      'domingo, 25/10',
    ])
    expect(text(rows[1].textContent ?? '')).toContain(text(`Entradas ${formatBRL(1000)}`))
    expect(text(rows[1].textContent ?? '')).toContain(text(`Saídas ${formatBRL(2000)}`))
    expect(text(rows[1].textContent ?? '')).toContain(text(formatSignedBRL(-1000)))
  })

  it('tocar num dia abre a visão Dia e leva o foco ao título', async () => {
    await seedOctober()
    await openViews('week', '2026-10-22')

    fireEvent.click((await rowsOf('Dias da semana'))[6])
    await expectTitle('domingo, 25 de outubro de 2026')
    expect(document.activeElement).toBe(periodTitle())
    expect(screen.getByRole('radio', { name: 'Dia' })).toHaveProperty('checked', true)
    await expectSummary(0, 1550)
  })

  // CA-05.1 — enquanto o dia novo carrega, nada da semana anterior aparece com o título novo.
  it('não mostra, nem por um instante, os lançamentos e totais do período anterior', async () => {
    await seedOctober()
    await openViews('week', '2026-10-22')
    await expectSummary(1000, 3550)

    fireEvent.click((await rowsOf('Dias da semana'))[6])
    expect(periodTitle().textContent).toBe('domingo, 25 de outubro de 2026')
    expect(screen.queryByRole('link', { name: /Feira/ })).toBeNull()
    expect(summaryValue('Saídas')).not.toBe(text(formatBRL(3550)))

    expect(await screen.findByRole('link', { name: /Padaria/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Feira/ })).toBeNull()
  })
})

describe('ViewsPage — visão Mês (RF-05)', () => {
  it('só os dias com movimento e os totais do mês (CA-05.1)', async () => {
    await seedOctober()
    await openViews('month', '2026-10-01')

    await expectTitle('outubro de 2026')
    await expectSummary(501000, 3550)
    const rows = await rowsOf('Dias do mês')
    expect(rows.map((row) => row.textContent?.split(/Entradas/)[0])).toEqual([
      'segunda-feira, 05/10',
      'terça-feira, 20/10',
      'domingo, 25/10',
    ])
  })

  it('tocar num dia abre a visão Dia', async () => {
    await seedOctober()
    await openViews('month', '2026-10-01')

    fireEvent.click((await rowsOf('Dias do mês'))[0])
    await expectTitle('segunda-feira, 5 de outubro de 2026')
    expect(await screen.findByRole('link', { name: /Salário/ })).toBeTruthy()
  })

  it('mês sem movimento mostra o estado vazio', async () => {
    await seedOctober()
    await openViews('month', '2026-08-10')

    expect(await screen.findByText(NO_MONTH_TRANSACTIONS_MESSAGE)).toBeTruthy()
    await expectSummary(0, 0)
  })

  it('a lista se atualiza sozinha quando um lançamento é gravado (useLiveQuery)', async () => {
    await seedOctober()
    await openViews('month', '2026-10-01')
    await expectSummary(501000, 3550)

    await act(() => seedTransactions({ type: 'expense', amountCents: 450, date: '2026-10-31' }))
    await expectSummary(501000, 4000)
    expect(await rowsOf('Dias do mês')).toHaveLength(4)
  })
})

describe('ViewsPage — visão Ano (RF-05)', () => {
  it('12 meses e tocar num mês abre a visão Mês', async () => {
    await seedOctober()
    await openViews('year', '2026-10-24')

    await expectTitle('2026')
    await expectSummary(531000, 153550)
    const rows = await rowsOf('Meses do ano')
    expect(rows).toHaveLength(12)
    expect(rows[0].textContent).toMatch(/^janeiro/)
    expect(rows[11].textContent).toMatch(/^dezembro/)
    expect(text(rows[9].textContent ?? '')).toContain(text(formatSignedBRL(497450)))

    fireEvent.click(rows[10])
    await expectTitle('novembro de 2026')
    expect(document.activeElement).toBe(periodTitle())
    expect(screen.getByRole('radio', { name: 'Mês' })).toHaveProperty('checked', true)
    await expectSummary(0, 150000)
  })
})

describe('ViewsPage — navegação (RF-05)', () => {
  afterEach(() => vi.useRealTimers())

  it('setas atravessam a virada do ano: dezembro → janeiro → dezembro', async () => {
    await openViews('month', '2026-12-10')
    await expectTitle('dezembro de 2026')

    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await expectTitle('janeiro de 2027')
    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await expectTitle('dezembro de 2026')
  })

  it('as setas mudam o nome conforme a granularidade', async () => {
    await openViews('week', '2026-12-30')
    await expectTitle('28 de dez. de 2026 a 3 de jan. de 2027')

    fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))
    await expectTitle('4 a 10 de jan. de 2027')
    fireEvent.click(screen.getByRole('radio', { name: 'Ano' }))
    await expectTitle('2027')
    fireEvent.click(screen.getByRole('button', { name: 'Ano anterior' }))
    await expectTitle('2026')
    fireEvent.click(screen.getByRole('radio', { name: 'Dia' }))
    await expectTitle('terça-feira, 6 de janeiro de 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Próximo dia' }))
    await expectTitle('quarta-feira, 7 de janeiro de 2026')
  })

  it('"Hoje" volta ao período atual mantendo a granularidade', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 24, 9, 30))
    await openViews('month', '2025-03-10')
    await expectTitle('março de 2025')

    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }))
    await expectTitle('outubro de 2026')
    expect(screen.getByRole('radio', { name: 'Mês' })).toHaveProperty('checked', true)
  })

  // CA-05.4 — o período fica no Zustand: sair e voltar para a tela mantém a escolha.
  it('mantém granularidade e período ao trocar de aba', async () => {
    const router = await openViews('month', '2026-10-01')
    fireEvent.click(screen.getByRole('radio', { name: 'Semana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))
    await expectTitle('5 a 11 de out. de 2026')

    await act(() => router.navigate('/lancamentos'))
    await screen.findByRole('heading', { level: 1, name: 'Lançamentos' })
    await act(() => router.navigate('/visoes'))
    await screen.findByRole('heading', { level: 1, name: 'Visões' })
    await expectTitle('5 a 11 de out. de 2026')
    expect(screen.getByRole('radio', { name: 'Semana' })).toHaveProperty('checked', true)
  })
})
