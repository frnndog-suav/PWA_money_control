import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTag, deleteTag, listTags, updateTag, useTags } from '@/repositories/tagsRepository'

// RF-01 (campo Tag) / D-38(a) — tags em ordem de nome para os chips do formulário.

describe('listTags (RF-01)', () => {
  it('sem tags → lista vazia', async () => {
    expect(await listTags()).toEqual([])
  })

  it('ordem de nome pt-BR, sem diferenciar caixa nem acento', async () => {
    for (const name of ['mercado', 'Água', 'Lazer', 'aluguel', 'Saúde']) {
      await createTag({ name, color: '#16A34A' })
    }
    expect((await listTags()).map((tag) => tag.name)).toEqual([
      'Água',
      'aluguel',
      'Lazer',
      'mercado',
      'Saúde',
    ])
  })

  it('devolve as tags completas, como gravadas', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16a34a' })
    expect(await listTags()).toEqual([tag])
  })
})

describe('useTags (RF-01 / CA-01.7)', () => {
  it('carrega, e se atualiza ao criar, renomear e excluir', async () => {
    const { result } = renderHook(() => useTags())
    await waitFor(() => expect(result.current).toEqual([]))

    let tag = await act(() => createTag({ name: 'Mercado', color: '#16A34A' }))
    await waitFor(() => expect(result.current?.map((t) => t.name)).toEqual(['Mercado']))

    await act(() => createTag({ name: 'Aluguel', color: '#2563EB' }))
    await waitFor(() => expect(result.current?.map((t) => t.name)).toEqual(['Aluguel', 'Mercado']))

    tag = await act(() => updateTag(tag.id, { name: 'Abastecimento', color: '#16A34A' }))
    await waitFor(() =>
      expect(result.current?.map((t) => t.name)).toEqual(['Abastecimento', 'Aluguel']),
    )

    await act(() => deleteTag(tag.id))
    await waitFor(() => expect(result.current?.map((t) => t.name)).toEqual(['Aluguel']))
  })
})
