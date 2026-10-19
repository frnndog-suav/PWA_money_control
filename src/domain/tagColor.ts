// §6.5 / CA-03.6 — cor do texto do chip da tag pela luminância relativa (WCAG 2.x).

export type ReadableTextColor = '#000000' | '#FFFFFF'

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const MAX_CHANNEL = 255
// Constantes da fórmula de luminância relativa da WCAG.
const LINEAR_THRESHOLD = 0.04045
const LINEAR_DIVISOR = 12.92
const GAMMA_OFFSET = 0.055
const GAMMA_DIVISOR = 1.055
const GAMMA = 2.4
const RED_WEIGHT = 0.2126
const GREEN_WEIGHT = 0.7152
const BLUE_WEIGHT = 0.0722
const CONTRAST_OFFSET = 0.05

function toLinear(channel: number): number {
  const srgb = channel / MAX_CHANNEL
  return srgb <= LINEAR_THRESHOLD
    ? srgb / LINEAR_DIVISOR
    : ((srgb + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA
}

/** Luminância relativa (0 = preto, 1 = branco) de uma cor `#RRGGBB`. */
export function relativeLuminance(hex: string): number {
  if (!HEX_COLOR_PATTERN.test(hex)) throw new RangeError(`Cor inválida: ${hex}`)
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return RED_WEIGHT * toLinear(red) + GREEN_WEIGHT * toLinear(green) + BLUE_WEIGHT * toLinear(blue)
}

/** Preto ou branco: o que tiver maior contraste sobre a cor de fundo. */
export function readableTextColor(hex: string): ReadableTextColor {
  const luminance = relativeLuminance(hex)
  const contrastWithBlack = (luminance + CONTRAST_OFFSET) / CONTRAST_OFFSET
  const contrastWithWhite = (1 + CONTRAST_OFFSET) / (luminance + CONTRAST_OFFSET)
  return contrastWithBlack >= contrastWithWhite ? '#000000' : '#FFFFFF'
}
