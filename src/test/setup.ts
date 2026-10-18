import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { INITIAL_UI_STATE, useUiStore } from '@/stores/uiStore'
import { installMatchMedia, resetMatchMedia } from '@/test/matchMedia'

installMatchMedia()

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetMatchMedia()
  useUiStore.setState(INITIAL_UI_STATE)
  document.documentElement.className = ''
  document.head.innerHTML = ''
})
