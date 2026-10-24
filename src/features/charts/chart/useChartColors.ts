import { useTheme } from '@/repositories/useTheme'

// CA-06.9 — cores dos gráficos por tema, as mesmas da paleta Tailwind do resto do app
// (Canvas não lê classes CSS). Entradas e saídas com contraste AA sobre o fundo (RNF-06).

export interface ChartColors {
  text: string
  grid: string
  /** Fundo da página: separa as fatias da rosca. */
  background: string
  income: string
  expense: string
  balance: string
  /** Faixa/marcador do subperíodo selecionado. */
  highlight: string
  /** Marcador vertical da linha. */
  marker: string
}

const LIGHT: ChartColors = {
  text: '#334155', // slate-700
  grid: '#E2E8F0', // slate-200
  background: '#FFFFFF',
  income: '#15803D', // green-700
  expense: '#B91C1C', // red-700
  balance: '#1D4ED8', // blue-700
  highlight: 'rgba(29, 78, 216, 0.14)',
  marker: '#0F172A', // slate-900
}

const DARK: ChartColors = {
  text: '#CBD5E1', // slate-300
  grid: '#334155', // slate-700
  background: '#0F172A', // slate-900
  income: '#4ADE80', // green-400
  expense: '#F87171', // red-400
  balance: '#60A5FA', // blue-400
  highlight: 'rgba(96, 165, 250, 0.22)',
  marker: '#F1F5F9', // slate-100
}

export function useChartColors(): ChartColors {
  return useTheme().resolvedTheme === 'dark' ? DARK : LIGHT
}

/** Cor com transparência, para esmaecer o que não está selecionado (CA-06.3). */
export function fadeColor(hex: string): string {
  return `${hex}59` // ~35% de opacidade
}
