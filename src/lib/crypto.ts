import { formatISO } from 'date-fns'

// RF-10 / RNF-05 / §6.8 — criptografia do arquivo de backup com a Web Crypto nativa
// (`crypto.subtle`, só em contexto seguro — RNF-09). Nada sai do aparelho (princípio 5) e
// nenhum segredo fica no código (princípio 13): a chave vem só da senha digitada.
// A senha e o texto em claro nunca vão para log nem para mensagens de erro.

/** RNF-05 — iterações do PBKDF2-SHA-256 em produção. */
export const PBKDF2_ITERATIONS = 600_000
export const SALT_BYTES = 16
export const IV_BYTES = 12
export const AES_KEY_LENGTH = 256

export const ENVELOPE_FORMAT = 'app-gastos-backup'
export const ENVELOPE_FORMAT_VERSION = 1

const KDF_NAME = 'PBKDF2'
const KDF_HASH = 'SHA-256'
const CIPHER_NAME = 'AES-GCM'

/** §6.8 — arquivo gravado: parâmetros públicos da criptografia e o texto cifrado. */
export interface BackupEnvelope {
  format: typeof ENVELOPE_FORMAT
  formatVersion: typeof ENVELOPE_FORMAT_VERSION
  createdAt: string
  kdf: { name: typeof KDF_NAME; hash: typeof KDF_HASH; iterations: number; salt: string }
  cipher: { name: typeof CIPHER_NAME; length: typeof AES_KEY_LENGTH; iv: string }
  ciphertext: string
}

/** CA-10.2 — a autenticação do AES-GCM falhou: senha incorreta ou arquivo alterado. */
export class BackupDecryptionError extends Error {
  constructor() {
    super('Senha incorreta ou arquivo corrompido')
    this.name = 'BackupDecryptionError'
  }
}

export interface EncryptOptions {
  /** Só os testes reduzem as iterações; o padrão é o valor de produção (RNF-05). */
  iterations?: number
  now?: Date
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// `String.fromCharCode(...bytes)` com milhões de bytes estoura a pilha de argumentos; em
// blocos de 32 KiB o custo continua linear e cabe em qualquer motor.
const BASE64_CHUNK_BYTES = 0x8000

export function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES)))
  }
  return btoa(chunks.join(''))
}

/** Lança `DOMException` (`InvalidCharacterError`) se o texto não for base64. */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

/** §6.8 passo 4 — PBKDF2(senha, sal, iterações, SHA-256) → chave AES-GCM de 256 bits. */
async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    // NFC: "é" digitado como um caractere ou como "e" + acento gera a mesma chave, na
    // exportação e na importação (teclados e sistemas diferentes compõem de jeitos diferentes).
    textEncoder.encode(password.normalize('NFC')),
    KDF_NAME,
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: KDF_NAME, hash: KDF_HASH, salt, iterations },
    baseKey,
    { name: CIPHER_NAME, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * §6.8 passos 3 a 5 — criptografa o texto (UTF-8) com sal e IV novos a cada chamada (RNF-05)
 * e monta o envelope.
 */
export async function encryptBackupText(
  plaintext: string,
  password: string,
  { iterations = PBKDF2_ITERATIONS, now = new Date() }: EncryptOptions = {},
): Promise<BackupEnvelope> {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = await deriveKey(password, salt, iterations)
  const ciphertext = await crypto.subtle.encrypt(
    { name: CIPHER_NAME, iv },
    key,
    textEncoder.encode(plaintext),
  )
  return {
    format: ENVELOPE_FORMAT,
    formatVersion: ENVELOPE_FORMAT_VERSION,
    createdAt: formatISO(now),
    kdf: { name: KDF_NAME, hash: KDF_HASH, iterations, salt: bytesToBase64(salt) },
    cipher: { name: CIPHER_NAME, length: AES_KEY_LENGTH, iv: bytesToBase64(iv) },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

function isOperationError(error: unknown): boolean {
  // DOMException herda de Error nos navegadores, mas a checagem pelo nome vale em qualquer motor.
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'OperationError'
  )
}

/**
 * §6.8 importar, passo 3 — deriva a chave com as iterações, o sal e o IV do envelope e
 * descriptografa. Falha de autenticação vira `BackupDecryptionError` (CA-10.2).
 */
export async function decryptBackupText(
  envelope: BackupEnvelope,
  password: string,
): Promise<string> {
  const key = await deriveKey(password, base64ToBytes(envelope.kdf.salt), envelope.kdf.iterations)
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: CIPHER_NAME, iv: base64ToBytes(envelope.cipher.iv) },
      key,
      base64ToBytes(envelope.ciphertext),
    )
    return textDecoder.decode(plaintext)
  } catch (error) {
    if (isOperationError(error)) throw new BackupDecryptionError()
    throw error
  }
}
