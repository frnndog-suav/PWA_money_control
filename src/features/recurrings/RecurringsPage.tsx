import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page } from '@/components/ui/Page'
import { useToday } from '@/components/ui/useToday'
import { periodOf } from '@/domain/dates'
import { NewRecurringDialog } from '@/features/recurrings/NewRecurringDialog'
import { RecurringList } from '@/features/recurrings/RecurringList'
import {
  NEW_RECURRING_LABEL,
  NO_RECURRINGS_MESSAGE,
  RECURRINGS_TITLE,
} from '@/features/recurrings/recurringsTexts'
import { useConfirmedKeysIn, useRecurrings } from '@/repositories/recurringsRepository'
import { useTags } from '@/repositories/tagsRepository'

/** RF-07 / CA-07.6 — Ajustes → Recorrentes: lista e criação; o resto fica nos detalhes. */
export function RecurringsPage() {
  const currentPeriod = periodOf(useToday())
  const recurrings = useRecurrings()
  const confirmedKeys = useConfirmedKeysIn(currentPeriod)
  const tags = useTags()
  const tagsById = new Map(tags?.map((tag) => [tag.id, tag]))
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>{RECURRINGS_TITLE}</Page.Header>
      <Page.Body>
        <Button variant="primary" onClick={() => setIsCreating(true)}>
          {NEW_RECURRING_LABEL}
        </Button>
        {/* Sem nada enquanto carrega, para o estado vazio não piscar. */}
        {recurrings?.length === 0 && <EmptyState>{NO_RECURRINGS_MESSAGE}</EmptyState>}
        {recurrings && recurrings.length > 0 && confirmedKeys && (
          <RecurringList
            recurrings={recurrings}
            tagsById={tagsById}
            currentPeriod={currentPeriod}
            confirmedKeys={confirmedKeys}
          />
        )}
      </Page.Body>
      <NewRecurringDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        // Depois de criar, abre os detalhes: é lá que se altera valor, encerra e pula meses.
        onCreated={(recurring) => {
          setIsCreating(false)
          navigate(`/ajustes/recorrentes/${recurring.id}`)
        }}
      />
    </Page>
  )
}
