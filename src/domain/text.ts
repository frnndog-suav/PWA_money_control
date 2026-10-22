// Comparação de textos sem diferenciar maiúsculas/minúsculas e acentos: unicidade do nome da
// tag (RF-03) e busca na descrição dos lançamentos (RF-04 / CA-04.2).

// Só marcas combinantes (acentos, cedilha e til separados pelo NFD); sinais avulsos como
// ^, `, ´, ¨ e · não são acentos de letra e continuam no texto.
const COMBINING_MARKS_PATTERN = /\p{M}/gu

/**
 * Minúsculas e sem acentos: "Mércado" → "mercado". O NFD separa a letra do acento, que é
 * removido; por isso o resultado é o mesmo para textos em NFC (teclado do iPhone) ou NFD.
 * Não remove espaços: quem chama decide (ex.: `toTagNameKey` faz o trim depois).
 */
export function foldText(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS_PATTERN, '').toLowerCase()
}
