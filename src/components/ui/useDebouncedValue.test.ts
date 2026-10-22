import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from '@/components/ui/useDebouncedValue'

// RF-04 / CA-04.6 / D-44(c) — a busca só recalcula a lista depois de um intervalo sem
// mudanças (250 ms na tela). O hook é genérico; aqui com timers falsos.

const DELAY = 250

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function setup(initial: string, delayMs = DELAY) {
  return renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
    initialProps: { value: initial, delay: delayMs },
  })
}

describe('useDebouncedValue (D-44(c))', () => {
  it('devolve o valor inicial na hora', () => {
    const { result } = setup('a')
    expect(result.current).toBe('a')
  })

  it('só aplica o novo valor depois do atraso', () => {
    const { result, rerender } = setup('')
    rerender({ value: 'merc', delay: DELAY })
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(DELAY - 1))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('merc')
  })

  it('reinicia a contagem a cada mudança e aplica só o último valor', () => {
    const { result, rerender } = setup('')
    rerender({ value: 'm', delay: DELAY })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'me', delay: DELAY })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'mer', delay: DELAY })
    act(() => vi.advanceTimersByTime(DELAY - 1))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('mer')
    // Nenhum valor intermediário fica pendente.
    act(() => vi.advanceTimersByTime(10 * DELAY))
    expect(result.current).toBe('mer')
  })

  it('mudar o atraso também reinicia a contagem', () => {
    const { result, rerender } = setup('a')
    rerender({ value: 'b', delay: DELAY })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'b', delay: 500 })
    act(() => vi.advanceTimersByTime(499))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('b')
  })

  it('limpa o timer ao desmontar', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { rerender, unmount } = setup('a')
    rerender({ value: 'b', delay: DELAY })
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(clearSpy).toHaveBeenCalled()
    // Avançar depois de desmontar não dispara nada (nem erro de setState em componente morto).
    expect(() => act(() => vi.advanceTimersByTime(DELAY))).not.toThrow()
  })
})

describe('useDebouncedValue — valor imediato (D-44(c))', () => {
  function setupImmediate(initial: string) {
    return renderHook(({ value }) => useDebouncedValue(value, DELAY, ''), {
      initialProps: { value: initial },
    })
  }

  it('o valor imediato vale na mesma renderização, sem timer', () => {
    const { result, rerender } = setupImmediate('merc')
    rerender({ value: '' })
    expect(result.current).toBe('')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('depois do valor imediato, redigitar não traz de volta o valor antigo', () => {
    const { result, rerender } = setupImmediate('merc')
    rerender({ value: '' })
    rerender({ value: 'far' })
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(DELAY))
    expect(result.current).toBe('far')
  })

  it('os outros valores continuam esperando', () => {
    const { result, rerender } = setupImmediate('')
    rerender({ value: 'm' })
    act(() => vi.advanceTimersByTime(DELAY - 1))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('m')
  })
})
