// O jsdom não implementa showModal()/close() do <dialog>. Este substituto mínimo só
// alterna o atributo `open` (que o jsdom já usa para mostrar ou esconder o elemento) e
// dispara o evento `close`, como o navegador. Foco preso e camada superior não são simulados.
export function installDialogPolyfill(): void {
  const prototype = HTMLDialogElement.prototype
  if (typeof prototype.showModal === 'function') return

  if (!('open' in prototype)) {
    Object.defineProperty(prototype, 'open', {
      configurable: true,
      get(this: HTMLDialogElement) {
        return this.hasAttribute('open')
      },
      set(this: HTMLDialogElement, value: boolean) {
        this.toggleAttribute('open', value)
      },
    })
  }

  prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  prototype.show = prototype.showModal
  prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
