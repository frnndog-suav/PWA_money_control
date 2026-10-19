// Apoio aos testes de propriedade simples (sem bibliotecas extras): um gerador
// pseudoaleatório com semente, para que cada execução use as mesmas entradas, e um
// calendário de referência calculado só com aritmética (independente do date-fns e do fuso).

/** Gerador com semente (LCG de 32 bits); `int` devolve um inteiro em [min, max]. */
export function createTestRandom(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
  }
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Dias do mês (1–12) no calendário gregoriano. */
export function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

export function toDateString(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

/** Todas as datas `YYYY-MM-DD` de um ano, em ordem. */
export function allDatesOfYear(year: number): string[] {
  const dates: string[] = []
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      dates.push(toDateString(year, month, day))
    }
  }
  return dates
}

/** Dia da semana (0 = domingo … 6 = sábado) pela congruência de Zeller, sem objetos Date. */
export function weekdayOf(date: string): number {
  let year = Number(date.slice(0, 4))
  let month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  if (month < 3) {
    month += 12
    year -= 1
  }
  const century = Math.floor(year / 100)
  const yearOfCentury = year % 100
  const zeller =
    (day +
      Math.floor((13 * (month + 1)) / 5) +
      yearOfCentury +
      Math.floor(yearOfCentury / 4) +
      Math.floor(century / 4) +
      5 * century) %
    7
  // Zeller: 0 = sábado, 1 = domingo, …
  return (zeller + 6) % 7
}

/** Número de dias desde uma origem fixa (só para medir distâncias entre datas). */
export function dayNumber(date: string): number {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  let total = day
  for (let y = 1; y < year; y++) total += isLeapYear(y) ? 366 : 365
  for (let m = 1; m < month; m++) total += daysInMonth(year, m)
  return total
}
