import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { installMatchMedia, resetMatchMedia } from '@/test/matchMedia'

installMatchMedia()

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetMatchMedia()
  document.documentElement.className = ''
  document.head.innerHTML = ''
})
