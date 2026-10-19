// §6.11 — gerador pseudoaleatório com semente (mulberry32): os dados de exemplo saem
// iguais a cada geração com a mesma semente e a mesma data de referência.

export interface SeededRandom {
  /** Número em [0, 1). */
  next: () => number
  /** Inteiro em [min, max], inclusive. */
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  /** UUID v4 válido, mas determinístico (crypto.randomUUID não aceita semente). */
  uuid: () => string
}

const UINT32_RANGE = 2 ** 32
const UUID_BYTES = 16

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE
  }

  function int(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1))
  }

  function pick<T>(items: readonly T[]): T {
    return items[int(0, items.length - 1)]
  }

  function uuid(): string {
    const bytes = Array.from({ length: UUID_BYTES }, () => int(0, 255))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // versão 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
    const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return { next, int, pick, uuid }
}
