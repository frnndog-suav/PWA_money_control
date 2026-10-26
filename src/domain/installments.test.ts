import { describe, expect, it } from 'vitest'
import {
  buildInstallmentTransactions,
  countPassedInstallments,
  displayDescription,
  installmentsToDelete,
  splitInstallments,
} from '@/domain/installments'
import {
  INSTALLMENT_COUNT_MESSAGE,
  INSTALLMENT_EXPENSE_ONLY_MESSAGE,
  installmentInputSchema,
  TOTAL_TOO_SMALL_MESSAGE,
  transactionFormSchema,
} from '@/domain/installmentSchema'
import { MAX_AMOUNT_CENTS } from '@/domain/money'

// RF-08 / §6.5 — parcelamento (Fase 10).

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

describe('splitInstallments — divisão e resto (RF-08 / CA-08.1)', () => {
  it('CA-08.1: R$ 100,00 em 3 → 33,34 + 33,33 + 33,33', () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333])
  })

  it('divisão exata não tem resto', () => {
    expect(splitInstallments(12000, 12)).toEqual(Array(12).fill(1000))
  })

  it('o resto inteiro vai para a 1ª parcela', () => {
    expect(splitInstallments(389999, 10)).toEqual([39008, ...Array(9).fill(38999)])
  })

  it('a soma é sempre igual ao total, de 2 a 48 parcelas', () => {
    for (const total of [2, 99, 100, 101, 12345, 999999, MAX_AMOUNT_CENTS]) {
      for (let count = 2; count <= 48 && count <= total; count++) {
        const parts = splitInstallments(total, count)
        expect(parts).toHaveLength(count)
        expect(sum(parts)).toBe(total)
        expect(parts.every((part) => Number.isSafeInteger(part) && part >= 1)).toBe(true)
      }
    }
  })

  it('o mínimo é 1 centavo por parcela', () => {
    expect(splitInstallments(2, 2)).toEqual([1, 1])
    expect(() => splitInstallments(1, 2)).toThrow(RangeError)
  })

  it('recusa número de parcelas fora de 2 a 48', () => {
    for (const count of [0, 1, 49, 2.5]) {
      expect(() => splitInstallments(10000, count)).toThrow(RangeError)
    }
  })
})

describe('buildInstallmentTransactions — datas (CA-08.1 / §6.11)', () => {
  const group = {
    id: 'group-1',
    description: 'Notebook',
    tagId: 'tag-1',
    totalCents: 10000,
    count: 3,
    firstDate: '2026-10-31',
  }

  it('CA-08.1: 31/10 → 30/11 → 31/12, com valores, número e vínculo', () => {
    expect(buildInstallmentTransactions(group)).toEqual([
      expect.objectContaining({ amountCents: 3334, date: '2026-10-31', installmentNumber: 1 }),
      expect.objectContaining({ amountCents: 3333, date: '2026-11-30', installmentNumber: 2 }),
      expect.objectContaining({ amountCents: 3333, date: '2026-12-31', installmentNumber: 3 }),
    ])
  })

  it('cada parcela é uma saída com a descrição base e a tag do grupo (D-06)', () => {
    for (const draft of buildInstallmentTransactions(group)) {
      expect(draft).toMatchObject({
        type: 'expense',
        description: 'Notebook',
        tagId: 'tag-1',
        installmentGroupId: 'group-1',
        recurringId: null,
        recurringPeriod: null,
      })
    }
  })

  it('RF-08: 31/01 → 28/02 em ano comum e 29/02 em bissexto; volta a 31/03', () => {
    const common = buildInstallmentTransactions({ ...group, firstDate: '2027-01-31' })
    expect(common.map((draft) => draft.date)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
    const leap = buildInstallmentTransactions({ ...group, firstDate: '2028-01-31' })
    expect(leap.map((draft) => draft.date)).toEqual(['2028-01-31', '2028-02-29', '2028-03-31'])
  })

  it('48 parcelas atravessam 4 anos sem perder o dia', () => {
    const drafts = buildInstallmentTransactions({
      ...group,
      totalCents: 480000,
      count: 48,
      firstDate: '2026-01-15',
    })
    expect(drafts).toHaveLength(48)
    expect(drafts.at(-1)?.date).toBe('2029-12-15')
  })
})

describe('displayDescription — "Descrição (k/n)" (RF-08)', () => {
  it('parcela ganha o sufixo; lançamento comum fica como está', () => {
    expect(displayDescription({ description: 'Notebook', installmentNumber: 2 }, 12)).toBe(
      'Notebook (2/12)',
    )
    expect(displayDescription({ description: 'Feira', installmentNumber: null }, undefined)).toBe(
      'Feira',
    )
  })

  it('sem o grupo carregado, mostra só a descrição', () => {
    expect(displayDescription({ description: 'Notebook', installmentNumber: 2 }, undefined)).toBe(
      'Notebook',
    )
  })
})

describe('countPassedInstallments (CA-08.5 / D-53)', () => {
  const plan = { count: 3, firstDate: '2026-10-31' } // 31/10, 30/11, 31/12

  it('conta as parcelas do plano com data até hoje, inclusive', () => {
    expect(countPassedInstallments(plan, '2026-10-30')).toBe(0)
    expect(countPassedInstallments(plan, '2026-10-31')).toBe(1)
    expect(countPassedInstallments(plan, '2026-11-29')).toBe(1)
    expect(countPassedInstallments(plan, '2026-11-30')).toBe(2)
    expect(countPassedInstallments(plan, '2027-06-01')).toBe(3)
  })

  it('segue o ajuste de fim de mês do plano', () => {
    expect(countPassedInstallments({ count: 3, firstDate: '2027-01-31' }, '2027-02-28')).toBe(2)
  })
})

describe('installmentsToDelete (CA-08.4)', () => {
  const installments = [1, 2, 3, 4].map((number) => ({
    id: `p${number}`,
    installmentNumber: number,
  }))
  const second = installments[1]

  it('"Só esta"', () => {
    expect(installmentsToDelete(installments, second, 'one').map((i) => i.id)).toEqual(['p2'])
  })

  it('"Esta e as seguintes": pelo número da parcela', () => {
    expect(installmentsToDelete(installments, second, 'following').map((i) => i.id)).toEqual([
      'p2',
      'p3',
      'p4',
    ])
  })

  it('"Todas as parcelas"', () => {
    expect(installmentsToDelete(installments, second, 'all')).toHaveLength(4)
  })
})

describe('installmentInputSchema / transactionFormSchema (RF-08)', () => {
  const valid = {
    totalCents: 10000,
    count: 3,
    firstDate: '2026-10-31',
    tagId: 'tag-1',
    description: ' Notebook ',
  }

  const firstError = (result: { error?: { issues: { message: string }[] } }) =>
    result.error?.issues[0]?.message

  it('aceita e tira os espaços da descrição', () => {
    expect(installmentInputSchema.parse(valid).description).toBe('Notebook')
  })

  it.each([
    [{ count: 1 }, INSTALLMENT_COUNT_MESSAGE],
    [{ count: 49 }, INSTALLMENT_COUNT_MESSAGE],
    [{ totalCents: 2, count: 3 }, TOTAL_TOO_SMALL_MESSAGE],
    [{ firstDate: '2026-02-30' }, 'Informe a data'],
  ])('%o → %s', (override, message) => {
    expect(firstError(installmentInputSchema.safeParse({ ...valid, ...override }))).toBe(message)
  })

  const form = {
    type: 'expense' as const,
    amountCents: 10000,
    date: '2026-10-31',
    tagId: 'tag-1',
    description: 'Notebook',
    isInstallment: true,
    installmentCount: 3,
  }

  it('formulário: "Parcelado" desligado ignora o número de parcelas', () => {
    expect(
      transactionFormSchema.safeParse({ ...form, isInstallment: false, installmentCount: 0 })
        .success,
    ).toBe(true)
  })

  it.each([
    [{ type: 'income' as const }, INSTALLMENT_EXPENSE_ONLY_MESSAGE],
    [{ installmentCount: 1 }, INSTALLMENT_COUNT_MESSAGE],
    [{ installmentCount: 50 }, INSTALLMENT_COUNT_MESSAGE],
    [{ amountCents: 2, installmentCount: 3 }, TOTAL_TOO_SMALL_MESSAGE],
  ])('formulário parcelado: %o → %s', (override, message) => {
    expect(firstError(transactionFormSchema.safeParse({ ...form, ...override }))).toBe(message)
  })

  it('formulário parcelado válido', () => {
    expect(transactionFormSchema.safeParse(form).success).toBe(true)
  })
})
