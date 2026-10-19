import { useState } from 'react'
import { db } from '@/db/database'
import { today } from '@/domain/dates'
import { buildSampleData } from '@/dev/sampleData/buildSampleData'
import { clearAllData, replaceWithSampleData } from '@/dev/sampleData/sampleDataStore'

// §6.11 — ações das ferramentas de dados de exemplo (somente desenvolvimento).

const countFormatter = new Intl.NumberFormat('pt-BR')

export const GENERATE_CONFIRMATION =
  'Substituir todas as tags, lançamentos, recorrentes e parcelamentos por dados de exemplo?'
export const CLEAR_CONFIRMATION =
  'Apagar todas as tags, lançamentos, recorrentes e parcelamentos? Os ajustes (tema) são mantidos.'

export interface SampleDataTools {
  isBusy: boolean
  message: string | null
  generate: () => Promise<void>
  clear: () => Promise<void>
}

export function useSampleDataTools(): SampleDataTools {
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function run(confirmation: string, action: () => Promise<string>) {
    if (!window.confirm(confirmation)) return
    setIsBusy(true)
    try {
      setMessage(await action())
    } catch (error) {
      setMessage(`Erro: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsBusy(false)
    }
  }

  return {
    isBusy,
    message,
    generate: () =>
      run(GENERATE_CONFIRMATION, async () => {
        const data = buildSampleData(today())
        await replaceWithSampleData(db, data)
        return (
          `Dados de exemplo gerados: ${data.tags.length} tags, ` +
          `${countFormatter.format(data.transactions.length)} lançamentos, ` +
          `${data.recurrings.length} recorrentes e ${data.installmentGroups.length} parcelamentos.`
        )
      }),
    clear: () =>
      run(CLEAR_CONFIRMATION, async () => {
        await clearAllData(db)
        return 'Todos os dados foram apagados.'
      }),
  }
}
