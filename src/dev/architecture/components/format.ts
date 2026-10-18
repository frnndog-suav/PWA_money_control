// Formatação de datas da página (pt-BR). Datas YYYY-MM-DD são tratadas como texto (§2.2).

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

/** Instante ISO completo (com hora e fuso) → "17/10/2026, 21:30". */
export function formatInstant(iso: string): string {
  return dateTimeFormatter.format(Date.parse(iso))
}

/** 'YYYY-MM-DD' (ou o início de um ISO) → 'DD/MM/YYYY', sem passar por Date. */
export function formatDay(isoDay: string): string {
  const [year, month, day] = isoDay.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value)
}
