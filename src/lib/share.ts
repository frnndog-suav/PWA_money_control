// RF-10 / §6.8 exportar, passos 6 e 7 — entrega o arquivo pela folha de compartilhamento
// do sistema (Web Share API com arquivo: no iPhone, "Salvar em Arquivos") ou, sem suporte,
// pelo download com `<a download>`. Nada é enviado pela rede (princípio 5).

/**
 * - `shared`: a folha de compartilhamento terminou sem cancelamento;
 * - `downloaded`: o download foi iniciado (o navegador não compartilha arquivos ou, com
 *   `downloadIfBlocked`, recusou abrir a folha);
 * - `cancelled`: o usuário fechou a folha (`AbortError`);
 * - `blocked`: o navegador recusou abrir a folha (`NotAllowedError`), por exemplo por falta
 *   de um toque recente depois da derivação demorada da chave; pede um novo toque.
 */
export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'blocked'

/** Tempo até liberar a URL do arquivo: o download precisa dela depois do clique. */
export const OBJECT_URL_REVOKE_DELAY_MS = 10_000

function errorName(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : null
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS)
}

export interface ShareOrDownloadOptions {
  /**
   * Com `true`, a recusa da folha (`NotAllowedError`) vira download em vez de `blocked`. Usado
   * na nova tentativa feita por um toque recente: se a folha ainda recusa, o motivo não é o
   * toque (ex.: o navegador do PC não aceita o tipo do arquivo) e tentar de novo não adianta.
   * Na 1ª tentativa os dois motivos dão o mesmo erro e não dá para distingui-los (D-48).
   */
  downloadIfBlocked?: boolean
}

/** Compartilha ou baixa o arquivo; outras falhas do compartilhamento são relançadas. */
export async function shareOrDownloadFile(
  file: File,
  { downloadIfBlocked = false }: ShareOrDownloadOptions = {},
): Promise<ShareOutcome> {
  const shareData: ShareData = { files: [file] }
  if (!navigator.canShare?.(shareData)) {
    downloadFile(file)
    return 'downloaded'
  }
  try {
    await navigator.share(shareData)
    return 'shared'
  } catch (error) {
    const name = errorName(error)
    if (name === 'AbortError') return 'cancelled'
    if (name !== 'NotAllowedError') throw error
    if (!downloadIfBlocked) return 'blocked'
    downloadFile(file)
    return 'downloaded'
  }
}
