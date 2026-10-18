import { use } from 'react'
import {
  InspectorContext,
  type InspectorContextValue,
} from '@/dev/architecture/components/InspectorContext'

export function useInspector(): InspectorContextValue {
  const context = use(InspectorContext)
  if (!context) throw new Error('useInspector precisa estar dentro do InspectorContext.')
  return context
}
