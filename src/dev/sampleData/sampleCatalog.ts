import type { TransactionType } from '@/domain/types'

// §6.11 — catálogo fixo dos dados de exemplo (somente desenvolvimento).

export interface SampleTagSpec {
  name: string
  color: string
  /** Tipo de lançamento aleatório que usa esta tag (a tag em si serve para os dois). */
  type: TransactionType
  descriptions: readonly string[]
  /** Faixa de valor dos lançamentos aleatórios, em centavos. */
  minCents: number
  maxCents: number
}

export const SAMPLE_TAGS: readonly SampleTagSpec[] = [
  {
    name: 'Mercado',
    color: '#16A34A',
    type: 'expense',
    descriptions: ['Supermercado', 'Feira', 'Padaria', 'Açougue'],
    minCents: 800,
    maxCents: 45000,
  },
  {
    name: 'Restaurantes',
    color: '#EA580C',
    type: 'expense',
    descriptions: ['Almoço', 'Jantar', 'Lanche', 'Café'],
    minCents: 900,
    maxCents: 25000,
  },
  {
    name: 'Transporte',
    color: '#0284C7',
    type: 'expense',
    descriptions: ['Combustível', 'Aplicativo de corrida', 'Ônibus', 'Estacionamento'],
    minCents: 450,
    maxCents: 30000,
  },
  {
    name: 'Moradia',
    color: '#78716C',
    type: 'expense',
    descriptions: ['Conta de luz', 'Conta de água', 'Internet', 'Condomínio'],
    minCents: 6000,
    maxCents: 60000,
  },
  {
    name: 'Saúde',
    color: '#DC2626',
    type: 'expense',
    descriptions: ['Farmácia', 'Consulta', 'Exame'],
    minCents: 1500,
    maxCents: 50000,
  },
  {
    name: 'Lazer',
    color: '#7C3AED',
    type: 'expense',
    descriptions: ['Cinema', 'Show', 'Passeio', 'Livro'],
    minCents: 2000,
    maxCents: 40000,
  },
  {
    name: 'Educação',
    color: '#2563EB',
    type: 'expense',
    descriptions: ['Curso online', 'Material', 'Livro técnico'],
    minCents: 3000,
    maxCents: 80000,
  },
  {
    name: 'Assinaturas',
    color: '#DB2777',
    type: 'expense',
    descriptions: ['Música', 'Armazenamento na nuvem', 'Jornal'],
    minCents: 990,
    maxCents: 6000,
  },
  {
    name: 'Vestuário',
    color: '#CA8A04',
    type: 'expense',
    descriptions: ['Camiseta', 'Calçado', 'Calça'],
    minCents: 4000,
    maxCents: 35000,
  },
  {
    name: 'Salário',
    color: '#0D9488',
    type: 'income',
    descriptions: ['Bônus', 'Reembolso da empresa'],
    minCents: 20000,
    maxCents: 300000,
  },
  {
    name: 'Freelas',
    color: '#4F46E5',
    type: 'income',
    descriptions: ['Projeto freela', 'Consultoria', 'Aula particular'],
    minCents: 15000,
    maxCents: 250000,
  },
  {
    name: 'Presentes',
    color: '#F472B6',
    type: 'income',
    descriptions: ['Presente de aniversário', 'Venda de usado', 'Pix recebido'],
    minCents: 2000,
    maxCents: 60000,
  },
]
