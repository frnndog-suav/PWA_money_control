import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createRadioGroup } from '@/components/ui/createRadioGroup'

type Fruit = 'apple' | 'pear'
const FruitRadio = createRadioGroup<Fruit>()

function renderFruits(value: Fruit, onValueChange: (value: Fruit) => void) {
  render(
    <FruitRadio.Root legend="Fruta" value={value} onValueChange={onValueChange}>
      <FruitRadio.Option value="apple">Maçã</FruitRadio.Option>
      <FruitRadio.Option value="pear">Pera</FruitRadio.Option>
    </FruitRadio.Root>,
  )
}

describe('createRadioGroup', () => {
  it('agrupa as opções sob a legenda e marca o valor atual', () => {
    renderFruits('pear', () => {})
    expect(screen.getByRole('group', { name: 'Fruta' })).toBeDefined()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Pera' }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Maçã' }).checked).toBe(false)
  })

  it('entrega o valor tipado da opção escolhida', () => {
    const onValueChange = vi.fn<(value: Fruit) => void>()
    renderFruits('pear', onValueChange)
    fireEvent.click(screen.getByRole('radio', { name: 'Maçã' }))
    expect(onValueChange).toHaveBeenCalledWith('apple')
  })

  it('não compila com valor fora do tipo do grupo', () => {
    // Verificado pelo `npm run typecheck`: se o erro de tipo sumir, o @ts-expect-error falha.
    const invalidOption = () => (
      // @ts-expect-error 'banana' não pertence a Fruit
      <FruitRadio.Option value="banana">Banana</FruitRadio.Option>
    )
    const invalidRoot = () => (
      // @ts-expect-error o valor atual também precisa ser Fruit
      <FruitRadio.Root legend="Fruta" value="banana" onValueChange={() => {}}>
        {null}
      </FruitRadio.Root>
    )
    expect(typeof invalidOption).toBe('function')
    expect(typeof invalidRoot).toBe('function')
  })

  it('Option fora do Root lança erro claro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<FruitRadio.Option value="apple">Maçã</FruitRadio.Option>)).toThrow(
      /dentro do <Root>/,
    )
    vi.restoreAllMocks()
  })
})
