import { describe, expect, it } from 'vitest'
import { formatBytes, formatStorageUsage } from '@/lib/formatBytes'

describe('formatBytes', () => {
  // CA-11.5 — espaço usado legível em pt-BR.
  it.each([
    [0, '0 B'],
    [999, '999 B'],
    [1000, '1 KB'],
    [1536, '1,5 KB'],
    [1_234_567, '1,2 MB'],
    [500_000_000, '500 MB'],
    [2_500_000_000, '2,5 GB'],
    [3_000_000_000_000, '3 TB'],
    [5_000_000_000_000_000, '5.000 TB'],
  ])('%d bytes → %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })

  it('não mostra "1.000 KB" quando o arredondamento chega à próxima unidade', () => {
    expect(formatBytes(999_960)).toBe('1 MB')
    expect(formatBytes(999_940)).toBe('999,9 KB')
  })

  it('recusa tamanhos inválidos', () => {
    expect(() => formatBytes(-1)).toThrow(RangeError)
    expect(() => formatBytes(Number.NaN)).toThrow(RangeError)
    expect(() => formatBytes(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('formatStorageUsage', () => {
  // CA-11.5 — exemplo "1,2 MB de 500 MB".
  it('junta uso e cota', () => {
    expect(formatStorageUsage(1_234_567, 500_000_000)).toBe('1,2 MB de 500 MB')
  })
})
