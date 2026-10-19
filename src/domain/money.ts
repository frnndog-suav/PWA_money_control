import type { Cents } from '@/domain/types'

// §6.5 — dinheiro sempre em centavos inteiros (princípio 1); texto só na apresentação.

/** RF-01 — maior valor aceito: R$ 99.999.999,99. */
export const MAX_AMOUNT_CENTS: Cents = 9_999_999_999
/**
 * RF-01 / CA-01.3 / D-31 — limite de dígitos da máscara do campo de valor: os mesmos 10
 * dígitos de MAX_AMOUNT_CENTS, para que a máscara nunca produza um valor acima do teto.
 */
export const MAX_AMOUNT_DIGITS = 10

const NON_DIGITS = /\D/g
// Sinal de menos tipográfico (U+2212), como no exemplo da CA-02.1.
const MINUS_SIGN = '\u2212'

// Criado uma vez: construir Intl.NumberFormat a cada chamada é caro em listas longas (RNF-02).
// O pt-BR separa "R$" do número com espaço não separável (U+00A0), que impede a quebra de linha.
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Valor em centavos inválido: ${cents}`)
  }
}

// Converte para decimal em texto ("-1234.56") em vez de dividir por 100: o formatador
// recebe o valor exato, sem arredondamento de ponto flutuante em números grandes.
function centsToDecimalString(cents: Cents): `${number}` {
  const digits = String(Math.abs(cents)).padStart(3, '0')
  const sign = cents < 0 ? '-' : ''
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}` as `${number}`
}

/** `123456` → `"R$ 1.234,56"`. */
export function formatBRL(cents: Cents): string {
  assertCents(cents)
  return brlFormatter.format(centsToDecimalString(cents))
}

/** CA-02.1 — `+R$ 10,00` / `−R$ 10,00` / `R$ 0,00`. */
export function formatSignedBRL(cents: Cents): string {
  assertCents(cents)
  if (cents === 0) return formatBRL(0)
  return cents > 0 ? `+${formatBRL(cents)}` : `${MINUS_SIGN}${formatBRL(-cents)}`
}

/**
 * CA-01.3 — máscara do campo de valor: os dígitos entram pela direita (`"1999"` → `1999`).
 * Ignora o que não for dígito e descarta o que passar de MAX_AMOUNT_DIGITS (10 dígitos —
 * RF-01 / D-31), para que um dígito a mais digitado não altere o valor nem passe do teto.
 */
export function digitsToCents(input: string): Cents {
  const digits = input.replace(NON_DIGITS, '').slice(0, MAX_AMOUNT_DIGITS)
  return digits === '' ? 0 : Number(digits)
}

/** Soma inteira de centavos; falha em vez de perder precisão (princípio 1). */
export function addCents(a: Cents, b: Cents): Cents {
  assertCents(a)
  assertCents(b)
  const sum = a + b
  assertCents(sum)
  return sum
}
