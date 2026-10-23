import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OBJECT_URL_REVOKE_DELAY_MS, shareOrDownloadFile } from '@/lib/share'

// RF-10 / §6.8 exportar, passos 6 e 7 — Web Share API com arquivo ou download.
// Roda no projeto `dom` (precisa de document para o <a download>).

const file = new File(['{}'], 'gastos-backup-2026-10-17.json', { type: 'application/json' })

function domException(name: string): Error {
  return Object.assign(new Error(name), { name })
}

function stubShare(share: () => Promise<void>, canShare = true) {
  const navigatorStub = {
    canShare: vi.fn(() => canShare),
    share: vi.fn(share),
  }
  vi.stubGlobal('navigator', navigatorStub)
  return navigatorStub
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:backup')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('shareOrDownloadFile', () => {
  it('abre a folha de compartilhamento com o arquivo quando o navegador permite', async () => {
    const stub = stubShare(() => Promise.resolve())
    await expect(shareOrDownloadFile(file)).resolves.toBe('shared')
    expect(stub.canShare).toHaveBeenCalledWith({ files: [file] })
    expect(stub.share).toHaveBeenCalledWith({ files: [file] })
  })

  // §6.8 passo 8 — fechar a folha não é erro: é cancelamento.
  it('AbortError → cancelled', async () => {
    stubShare(() => Promise.reject(domException('AbortError')))
    await expect(shareOrDownloadFile(file)).resolves.toBe('cancelled')
  })

  it('NotAllowedError (sem toque recente) → blocked', async () => {
    stubShare(() => Promise.reject(domException('NotAllowedError')))
    await expect(shareOrDownloadFile(file)).resolves.toBe('blocked')
  })

  describe('com downloadIfBlocked (nova tentativa por toque recente — RF-10 / §6.8 / D-48)', () => {
    function spyClicks() {
      const clicks: HTMLAnchorElement[] = []
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicks.push(this)
      })
      return clicks
    }

    it('NotAllowedError → baixa com <a download> e devolve downloaded', async () => {
      const stub = stubShare(() => Promise.reject(domException('NotAllowedError')))
      const clicks = spyClicks()

      await expect(shareOrDownloadFile(file, { downloadIfBlocked: true })).resolves.toBe(
        'downloaded',
      )

      expect(stub.share).toHaveBeenCalledTimes(1)
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)
      expect(clicks).toHaveLength(1)
      expect(clicks[0].download).toBe(file.name)
    })

    it.each([
      ['compartilhado', () => Promise.resolve(), 'shared'],
      ['cancelado', () => Promise.reject(domException('AbortError')), 'cancelled'],
    ] as const)('%s → %s, sem download', async (_, share, outcome) => {
      stubShare(share)
      const clicks = spyClicks()
      await expect(shareOrDownloadFile(file, { downloadIfBlocked: true })).resolves.toBe(outcome)
      expect(clicks).toHaveLength(0)
      expect(URL.createObjectURL).not.toHaveBeenCalled()
    })

    it('relança outras falhas, sem download', async () => {
      stubShare(() => Promise.reject(new TypeError('falhou')))
      const clicks = spyClicks()
      await expect(shareOrDownloadFile(file, { downloadIfBlocked: true })).rejects.toBeInstanceOf(
        TypeError,
      )
      expect(clicks).toHaveLength(0)
    })

    it('sem a opção, NotAllowedError não baixa (1º toque pede "Salvar backup")', async () => {
      stubShare(() => Promise.reject(domException('NotAllowedError')))
      const clicks = spyClicks()
      await expect(shareOrDownloadFile(file, { downloadIfBlocked: false })).resolves.toBe('blocked')
      expect(clicks).toHaveLength(0)
    })
  })

  it('relança outras falhas', async () => {
    stubShare(() => Promise.reject(new TypeError('falhou')))
    await expect(shareOrDownloadFile(file)).rejects.toBeInstanceOf(TypeError)
    stubShare(() => Promise.reject('sem nome'))
    await expect(shareOrDownloadFile(file)).rejects.toBe('sem nome')
  })

  it.each([
    ['canShare devolve false', { canShare: () => false, share: vi.fn() }],
    ['sem Web Share API', {}],
  ])('baixa com <a download> quando %s, e libera a URL depois', async (_, navigatorStub) => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', navigatorStub)
    const clicks: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this)
    })

    await expect(shareOrDownloadFile(file)).resolves.toBe('downloaded')

    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe(file.name)
    expect(clicks[0].getAttribute('href')).toBe('blob:backup')
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
    expect(document.querySelector('a')).toBeNull()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup')
  })
})
