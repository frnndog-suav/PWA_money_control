import { describe, expect, it, vi } from 'vitest'
import {
  base64ToBytes,
  BackupDecryptionError,
  bytesToBase64,
  decryptBackupText,
  encryptBackupText,
  type BackupEnvelope,
} from '@/lib/crypto'
import { createTestRandom } from '@/test/propertyHelpers'

// RNF-05 / §6.8 / CA-10.1 / CA-10.2 / CA-10.6 — auditoria da criptografia do backup.
// Iterações reduzidas (o teste com as 600.000 reais fica em crypto.test.ts).
const ITERATIONS = 1000

const encoder = new TextEncoder()
const fromNodeBase64 = (base64: string) => new Uint8Array(Buffer.from(base64, 'base64'))

/**
 * Implementação independente (sem as funções do módulo): PBKDF2-SHA-256 com `deriveBits`
 * (e não `deriveKey`), chave AES-GCM 256 importada crua, base64 do Node. Se ela abre o
 * arquivo, o formato é o padrão da §6.8, e não um formato próprio. A senha é normalizada em
 * NFC antes de virar UTF-8, como no módulo (D-47).
 */
async function independentKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: 'encrypt' | 'decrypt',
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    256,
  )
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM', length: 256 }, false, [usage])
}

async function independentDecrypt(envelopeJson: string, password: string): Promise<string> {
  const envelope = JSON.parse(envelopeJson) as BackupEnvelope
  const key = await independentKey(
    password,
    fromNodeBase64(envelope.kdf.salt),
    envelope.kdf.iterations,
    'decrypt',
  )
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromNodeBase64(envelope.cipher.iv), tagLength: 128 },
    key,
    fromNodeBase64(envelope.ciphertext),
  )
  return new TextDecoder('utf-8', { fatal: true }).decode(plaintext)
}

/** Texto aleatório (válido em UTF-16) com ASCII, acentos, combinantes, CJK, emoji e controle. */
function randomText(random: ReturnType<typeof createTestRandom>, maxLength: number): string {
  const pools: [number, number][] = [
    [0x20, 0x7e], // ASCII visível
    [0x00, 0x1f], // controle (inclusive \0, \n, \t)
    [0xc0, 0x17f], // latim com acentos
    [0x300, 0x36f], // marcas combinantes
    [0x4e00, 0x4fff], // CJK
    [0x1f300, 0x1faff], // emoji (par substituto)
  ]
  let text = ''
  const length = random.int(0, maxLength)
  for (let index = 0; index < length; index++) {
    const [min, max] = pools[random.int(0, pools.length - 1)]
    text += String.fromCodePoint(random.int(min, max))
  }
  return text
}

/** Troca um único caractere da senha por outro diferente. */
function changeOneCharacter(password: string, random: ReturnType<typeof createTestRandom>) {
  const chars = [...password]
  const index = random.int(0, chars.length - 1)
  chars[index] = chars[index] === 'a' ? 'b' : 'a'
  return chars.join('')
}

describe('envelope (§6.8 / RNF-05)', () => {
  it('tem exatamente os campos e valores da §6.8; sal de 16 e IV de 12 bytes', async () => {
    const envelope = await encryptBackupText('{}', 'senha-forte', { iterations: ITERATIONS })
    const json = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>

    expect(Object.keys(json).sort()).toEqual(
      ['cipher', 'ciphertext', 'createdAt', 'format', 'formatVersion', 'kdf'].sort(),
    )
    expect(json.format).toBe('app-gastos-backup')
    expect(json.formatVersion).toBe(1)
    expect(json.kdf).toStrictEqual({
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: ITERATIONS,
      salt: envelope.kdf.salt,
    })
    expect(json.cipher).toStrictEqual({ name: 'AES-GCM', length: 256, iv: envelope.cipher.iv })
    expect(typeof json.ciphertext).toBe('string')
    expect(fromNodeBase64(envelope.kdf.salt)).toHaveLength(16)
    expect(fromNodeBase64(envelope.cipher.iv)).toHaveLength(12)
    // AES-GCM: texto cifrado = tamanho do texto em claro + 16 bytes da marca de autenticação.
    expect(fromNodeBase64(envelope.ciphertext)).toHaveLength(2 + 16)
  })

  it('o padrão de produção são 600.000 iterações gravadas no envelope (sem derivar)', async () => {
    // Só confere o parâmetro passado à Web Crypto; o teste lento real fica em crypto.test.ts.
    const original = crypto.subtle.deriveKey.bind(crypto.subtle)
    const spy = vi
      .spyOn(crypto.subtle, 'deriveKey')
      .mockImplementation((algorithm, baseKey, derivedKeyType, extractable, keyUsages) =>
        original(
          { ...(algorithm as Pbkdf2Params), iterations: 1 },
          baseKey,
          derivedKeyType,
          extractable,
          keyUsages,
        ),
      )
    try {
      const envelope = await encryptBackupText('x', 'senha-forte')
      expect(envelope.kdf.iterations).toBe(600_000)
      expect(spy).toHaveBeenCalledTimes(1)
      const [algorithm, , derivedKeyType, extractable] = spy.mock.calls[0]
      expect(algorithm).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000 })
      expect(derivedKeyType).toEqual({ name: 'AES-GCM', length: 256 })
      // D-47 (a) — chave não extraível.
      expect(extractable).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('interoperabilidade: PBKDF2-SHA-256 + AES-GCM padrão (§6.8)', () => {
  it('uma implementação independente abre o envelope gerado pelo módulo', async () => {
    const plaintext = JSON.stringify({ description: 'Pão de queijo 🧀', amountCents: 1999 })
    const password = 'senha com espaço e ç'
    const envelope = await encryptBackupText(plaintext, password, { iterations: ITERATIONS })
    await expect(independentDecrypt(JSON.stringify(envelope), password)).resolves.toBe(plaintext)
  })

  it('o módulo abre um envelope gerado pela implementação independente', async () => {
    const plaintext = 'Açaí — R$ 19,99'
    const password = 'outra senha 🔑'
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await independentKey(password, salt, ITERATIONS, 'encrypt')
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext),
    )
    const envelope: BackupEnvelope = {
      format: 'app-gastos-backup',
      formatVersion: 1,
      createdAt: '2026-10-17T15:05:00-03:00',
      kdf: {
        name: 'PBKDF2',
        hash: 'SHA-256',
        iterations: ITERATIONS,
        salt: Buffer.from(salt).toString('base64'),
      },
      cipher: { name: 'AES-GCM', length: 256, iv: Buffer.from(iv).toString('base64') },
      ciphertext: Buffer.from(new Uint8Array(ciphertext)).toString('base64'),
    }
    await expect(decryptBackupText(envelope, password)).resolves.toBe(plaintext)
  })

  it('a senha em NFD gera a mesma chave que a referência em NFC (D-47)', async () => {
    const plaintext = 'Pão'
    const password = 'senha com é e ç'.normalize('NFD')
    const envelope = await encryptBackupText(plaintext, password, { iterations: ITERATIONS })
    await expect(
      independentDecrypt(JSON.stringify(envelope), password.normalize('NFC')),
    ).resolves.toBe(plaintext)
  })
})

describe('ida e volta com semente (CA-10.1 / CA-10.2)', () => {
  it('textos e senhas variados voltam iguais; uma letra trocada na senha falha', async () => {
    const random = createTestRandom(20261022)
    const fixedTexts = ['', '🍇', 'Açúcar, pão, café', '{"a":"\\u0000"}']
    const fixedPasswords = ['12345678', '  espaços  ', 'senha🔑ção', 'パスワード ñ', ' '.repeat(8)]
    for (let round = 0; round < 24; round++) {
      const text = round < fixedTexts.length ? fixedTexts[round] : randomText(random, 300)
      const password =
        round < fixedPasswords.length
          ? fixedPasswords[round]
          : randomText(random, 20).padEnd(8, ' ')
      const envelope = await encryptBackupText(text, password, { iterations: ITERATIONS })
      await expect(decryptBackupText(envelope, password)).resolves.toBe(text)

      const wrong = changeOneCharacter(password, random)
      const failure = decryptBackupText(envelope, wrong)
      await expect(failure).rejects.toBeInstanceOf(BackupDecryptionError)
      await expect(failure).rejects.toThrow('Senha incorreta ou arquivo corrompido')
    }
  })

  it('texto de ~1 MB volta igual e o envelope não contém o texto em claro (CA-10.6)', async () => {
    const random = createTestRandom(7)
    const chunk = randomText(random, 2000) + ' descrição secreta '
    const text = chunk.repeat(Math.ceil(1_000_000 / chunk.length))
    const envelope = await encryptBackupText(text, 'senha grande', { iterations: ITERATIONS })
    expect(JSON.stringify(envelope)).not.toContain('descrição secreta')
    await expect(decryptBackupText(envelope, 'senha grande')).resolves.toBe(text)
  })

  it.each([
    ['vazia', ''],
    ['com um espaço a mais no fim', 'senha-forte '],
    ['com maiúscula', 'Senha-forte'],
  ])('senha %s → BackupDecryptionError (CA-10.2)', async (_, wrong) => {
    const envelope = await encryptBackupText('dados', 'senha-forte', { iterations: ITERATIONS })
    await expect(decryptBackupText(envelope, wrong)).rejects.toBeInstanceOf(BackupDecryptionError)
  })
})

describe('base64 próprio (blocos de 32 KiB)', () => {
  const SIZES = [0, 1, 2, 3, 4, 5, 32_767, 32_768, 32_769, 65_535, 65_536, 65_537, 98_305]

  it.each(SIZES)('%i bytes: ida e volta e compatível com o Buffer do Node', (size) => {
    const random = createTestRandom(size + 1)
    const bytes = new Uint8Array(size).map(() => random.int(0, 255))
    const nodeBase64 = Buffer.from(bytes).toString('base64')

    expect(bytesToBase64(bytes)).toBe(nodeBase64)
    expect(base64ToBytes(nodeBase64)).toEqual(bytes)
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes)
    expect(new Uint8Array(Buffer.from(bytesToBase64(bytes), 'base64'))).toEqual(bytes)
  })

  it('aceita uma visão parcial (subarray) de um buffer maior', () => {
    const buffer = new Uint8Array([9, 9, 1, 2, 3, 9])
    expect(bytesToBase64(buffer.subarray(2, 5))).toBe(Buffer.from([1, 2, 3]).toString('base64'))
  })
})

describe('sal e IV únicos (RNF-05)', () => {
  it('em 50 criptografias nenhum sal nem IV se repete', async () => {
    const envelopes = await Promise.all(
      Array.from({ length: 50 }, () =>
        encryptBackupText('mesmo texto', 'mesma senha', { iterations: 1 }),
      ),
    )
    expect(new Set(envelopes.map((e) => e.kdf.salt)).size).toBe(50)
    expect(new Set(envelopes.map((e) => e.cipher.iv)).size).toBe(50)
    expect(new Set(envelopes.map((e) => e.ciphertext)).size).toBe(50)
  })
})
