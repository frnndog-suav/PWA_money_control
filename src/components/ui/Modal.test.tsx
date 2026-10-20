import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from '@/components/ui/Modal'

describe('Modal (D-33 / RNF-06)', () => {
  it('o título é o nome acessível do diálogo', () => {
    render(
      <Modal open title="Excluir tag?" onClose={() => {}}>
        <Modal.Body>Conteúdo</Modal.Body>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Excluir tag?' })).toBeDefined()
    expect(screen.getByText('Conteúdo')).toBeDefined()
  })

  it('fechado: não mostra o conteúdo, mas o id do aria-labelledby continua existindo', () => {
    const { container } = render(
      <Modal open={false} title="Nova tag" onClose={() => {}}>
        <p>Conteúdo</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Conteúdo')).toBeNull()
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')).not.toBeNull()
  })

  it('Esc pede para fechar e deixa a decisão para quem usa', () => {
    const onClose = vi.fn()
    render(
      <Modal open title="Nova tag" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Nova tag' })
    const cancel = new Event('cancel', { cancelable: true })
    fireEvent(dialog, cancel)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(cancel.defaultPrevented).toBe(true)
  })
})
