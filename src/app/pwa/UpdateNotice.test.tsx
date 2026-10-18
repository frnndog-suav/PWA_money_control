import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UpdateNotice } from '@/app/pwa/UpdateNotice'
import { useUiStore } from '@/stores/uiStore'

const { applyPwaUpdate } = vi.hoisted(() => ({ applyPwaUpdate: vi.fn(() => Promise.resolve()) }))
vi.mock('@/app/pwa/registerPwa', () => ({ applyPwaUpdate }))

// RF-11 / CA-11.3
describe('UpdateNotice', () => {
  it('não mostra nada enquanto não há versão nova', () => {
    render(<UpdateNotice />)
    expect(screen.getByRole('status').textContent).toBe('')
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull()
  })

  it('mostra "Nova versão disponível" com o botão "Atualizar" quando há versão nova', () => {
    render(<UpdateNotice />)
    act(() => useUiStore.getState().setUpdateAvailable(true))

    expect(screen.getByRole('status').textContent).toContain('Nova versão disponível')
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeDefined()
  })

  it('só ativa a versão nova quando o usuário toca "Atualizar"', () => {
    useUiStore.getState().setUpdateAvailable(true)
    render(<UpdateNotice />)
    expect(applyPwaUpdate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))

    expect(applyPwaUpdate).toHaveBeenCalledTimes(1)
  })
})
