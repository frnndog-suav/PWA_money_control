import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AES_KEY_LENGTH,
  base64ToBytes,
  BackupDecryptionError,
  bytesToBase64,
  decryptBackupText,
  encryptBackupText,
  ENVELOPE_FORMAT,
  ENVELOPE_FORMAT_VERSION,
  IV_BYTES,
  PBKDF2_ITERATIONS,
  SALT_BYTES,
  type BackupEnvelope,
} from '@/lib/crypto'

// RF-10 / RNF-05 / §6.8 — criptografia do backup (Web Crypto nativa do Node 22).
// Iterações reduzidas para os testes ficarem rápidos; um teste usa as 600.000 reais.
const FAST = { iterations: 1000 }
const PASSWORD = 'senha-forte-123'
const PLAINTEXT = JSON.stringify({
  description: 'Mercado do mês — pão de queijo',
  amountCents: 1999,
})

/** Troca um bit do byte `index` de um campo base64 do envelope. */
function flipBit(base64: string, index = 0): string {
  const bytes = base64ToBytes(base64)
  bytes[index] ^= 0b0000_0001
  return bytesToBase64(bytes)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('bytesToBase64 / base64ToBytes', () => {
  it('converte nos dois sentidos, inclusive vazio', () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe('')
    expect(bytesToBase64(new Uint8Array([0, 1, 254, 255]))).toBe('AAH+/w==')
    expect([...base64ToBytes('AAH+/w==')]).toEqual([0, 1, 254, 255])
  })

  it('aguenta arquivos grandes sem estourar a pilha (vários blocos)', () => {
    const big = new Uint8Array(3_000_001).map((_, index) => index % 256)
    const roundTrip = base64ToBytes(bytesToBase64(big))
    expect(roundTrip.length).toBe(big.length)
    expect(roundTrip[2_999_999]).toBe(big[2_999_999])
    expect(Buffer.from(big).toString('base64')).toBe(bytesToBase64(big))
  })

  it('recusa texto que não é base64', () => {
    expect(() => base64ToBytes('não é base64!')).toThrow()
  })
})

describe('encryptBackupText / decryptBackupText', () => {
  // CA-10.1 (ida e volta) / §6.8 — envelope exatamente no formato da spec.
  it('monta o envelope da §6.8 e volta ao texto original com a senha certa', async () => {
    const now = new Date(2026, 9, 17, 15, 5)
    const envelope = await encryptBackupText(PLAINTEXT, PASSWORD, { ...FAST, now })

    expect(Object.keys(envelope)).toEqual([
      'format',
      'formatVersion',
      'createdAt',
      'kdf',
      'cipher',
      'ciphertext',
    ])
    expect(envelope.format).toBe(ENVELOPE_FORMAT)
    expect(envelope.formatVersion).toBe(ENVELOPE_FORMAT_VERSION)
    expect(envelope.createdAt).toMatch(/^2026-10-17T15:05:00(Z|[+-]\d{2}:\d{2})$/)
    expect(envelope.kdf).toEqual({
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: FAST.iterations,
      salt: expect.any(String),
    })
    expect(envelope.cipher).toEqual({
      name: 'AES-GCM',
      length: AES_KEY_LENGTH,
      iv: expect.any(String),
    })
    expect(base64ToBytes(envelope.kdf.salt)).toHaveLength(SALT_BYTES)
    expect(base64ToBytes(envelope.cipher.iv)).toHaveLength(IV_BYTES)

    await expect(decryptBackupText(envelope, PASSWORD)).resolves.toBe(PLAINTEXT)
  })

  // RNF-05 — sal e IV aleatórios a cada exportação.
  it('gera sal, IV e texto cifrado diferentes a cada chamada', async () => {
    const first = await encryptBackupText(PLAINTEXT, PASSWORD, FAST)
    const second = await encryptBackupText(PLAINTEXT, PASSWORD, FAST)
    expect(first.kdf.salt).not.toBe(second.kdf.salt)
    expect(first.cipher.iv).not.toBe(second.cipher.iv)
    expect(first.ciphertext).not.toBe(second.ciphertext)
  })

  // CA-10.6 — nada do texto em claro aparece no envelope.
  it('não deixa o texto em claro legível no envelope', async () => {
    const envelope = await encryptBackupText(PLAINTEXT, PASSWORD, FAST)
    const json = JSON.stringify(envelope)
    for (const fragment of ['Mercado', 'pão de queijo', '1999', 'amountCents']) {
      expect(json).not.toContain(fragment)
    }
  })

  // CA-10.2
  it('senha errada → BackupDecryptionError', async () => {
    const envelope = await encryptBackupText(PLAINTEXT, PASSWORD, FAST)
    await expect(decryptBackupText(envelope, 'senha-errada')).rejects.toBeInstanceOf(
      BackupDecryptionError,
    )
    await expect(decryptBackupText(envelope, 'senha-errada')).rejects.toThrow(
      'Senha incorreta ou arquivo corrompido',
    )
  })

  // CA-10.2 — adulteração: um bit trocado no texto cifrado, no IV ou no sal dá o mesmo erro.
  it.each<[string, (envelope: BackupEnvelope) => BackupEnvelope]>([
    ['texto cifrado', (e) => ({ ...e, ciphertext: flipBit(e.ciphertext, 5) })],
    [
      'marca de autenticação (fim do texto cifrado)',
      (e) => {
        const last = base64ToBytes(e.ciphertext).length - 1
        return { ...e, ciphertext: flipBit(e.ciphertext, last) }
      },
    ],
    ['IV', (e) => ({ ...e, cipher: { ...e.cipher, iv: flipBit(e.cipher.iv) } })],
    ['sal', (e) => ({ ...e, kdf: { ...e.kdf, salt: flipBit(e.kdf.salt) } })],
    ['iterações', (e) => ({ ...e, kdf: { ...e.kdf, iterations: e.kdf.iterations + 1 } })],
  ])('adulteração do %s → BackupDecryptionError', async (_, tamper) => {
    const envelope = await encryptBackupText(PLAINTEXT, PASSWORD, FAST)
    await expect(decryptBackupText(tamper(envelope), PASSWORD)).rejects.toBeInstanceOf(
      BackupDecryptionError,
    )
  })

  it('preserva texto com acentos, emoji e vazio (UTF-8)', async () => {
    for (const text of ['', 'Açaí 🍇 — “aspas” e ç']) {
      const envelope = await encryptBackupText(text, 'ção-ñ-🔑-senha', FAST)
      await expect(decryptBackupText(envelope, 'ção-ñ-🔑-senha')).resolves.toBe(text)
    }
  })

  it('relança falhas que não são de autenticação', async () => {
    const envelope = await encryptBackupText(PLAINTEXT, PASSWORD, FAST)
    vi.spyOn(crypto.subtle, 'decrypt').mockRejectedValueOnce(new TypeError('falha qualquer'))
    await expect(decryptBackupText(envelope, PASSWORD)).rejects.toBeInstanceOf(TypeError)
  })

  // RNF-05 — o padrão é o de produção: 600.000 iterações (teste lento de propósito).
  it('usa 600.000 iterações por padrão e decifra com elas', { timeout: 30_000 }, async () => {
    const startedAt = performance.now()
    const envelope = await encryptBackupText(PLAINTEXT, PASSWORD)
    const encryptMs = performance.now() - startedAt
    expect(envelope.kdf.iterations).toBe(PBKDF2_ITERATIONS)
    expect(PBKDF2_ITERATIONS).toBe(600_000)
    await expect(decryptBackupText(envelope, PASSWORD)).resolves.toBe(PLAINTEXT)
    // Referência de desempenho no PC de desenvolvimento (o iPhone fica na Fase 11).
    expect(encryptMs).toBeLessThan(30_000)
  })
})

// D-47 — a senha é normalizada em NFC antes da derivação: "é" composto (U+00E9) e "e" +
// acento combinante (U+0065 U+0301) abrem o mesmo backup.
describe('normalização NFC da senha', () => {
  const NFC_PASSWORD = 'café-açaí-senha'.normalize('NFC')
  const NFD_PASSWORD = NFC_PASSWORD.normalize('NFD')

  it('as duas grafias são textos diferentes', () => {
    expect(NFC_PASSWORD).not.toBe(NFD_PASSWORD)
  })

  it('exportado em NFC abre com a senha digitada em NFD', async () => {
    const envelope = await encryptBackupText(PLAINTEXT, NFC_PASSWORD, FAST)
    await expect(decryptBackupText(envelope, NFD_PASSWORD)).resolves.toBe(PLAINTEXT)
  })

  it('exportado em NFD abre com a senha digitada em NFC', async () => {
    const envelope = await encryptBackupText(PLAINTEXT, NFD_PASSWORD, FAST)
    await expect(decryptBackupText(envelope, NFC_PASSWORD)).resolves.toBe(PLAINTEXT)
  })

  it('outra letra continua sendo senha errada', async () => {
    const envelope = await encryptBackupText(PLAINTEXT, NFC_PASSWORD, FAST)
    await expect(decryptBackupText(envelope, 'cafe-açaí-senha')).rejects.toBeInstanceOf(
      BackupDecryptionError,
    )
  })
})
