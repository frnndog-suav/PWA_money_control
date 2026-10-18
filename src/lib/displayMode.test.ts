import { describe, expect, it } from 'vitest'
import { isStandaloneDisplay, STANDALONE_DISPLAY_MODE_QUERY } from '@/lib/displayMode'

// RF-11 / CA-11.6
describe('isStandaloneDisplay', () => {
  it.each([
    [true, undefined, true],
    [true, false, true],
    [false, true, true],
    [true, true, true],
    [false, false, false],
    [false, undefined, false],
  ])(
    'display-mode standalone=%s, navigator.standalone=%s → instalado=%s',
    (matchesStandaloneMedia, navigatorStandalone, expected) => {
      expect(isStandaloneDisplay({ matchesStandaloneMedia, navigatorStandalone })).toBe(expected)
    },
  )

  it('usa a media query display-mode: standalone', () => {
    expect(STANDALONE_DISPLAY_MODE_QUERY).toBe('(display-mode: standalone)')
  })
})
