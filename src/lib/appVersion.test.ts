import { describe, expect, it } from 'vitest'
import packageJsonText from '../../package.json?raw'
import { APP_VERSION } from '@/lib/appVersion'

describe('APP_VERSION', () => {
  // RF-11 / CA-11.5 — a versão exibida é a do package.json.
  it('é o campo version do package.json', () => {
    const { version } = JSON.parse(packageJsonText) as { version: string }
    expect(APP_VERSION).toBe(version)
  })
})
