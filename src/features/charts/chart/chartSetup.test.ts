import { Chart, type Plugin } from 'chart.js'
import { describe, expect, it, vi } from 'vitest'
import '@/features/charts/chart/chartSetup'
import {
  selectionHighlightPlugin,
  type SelectionHighlightOptions,
} from '@/features/charts/chart/selectionHighlightPlugin'

// RF-06 — registro mínimo do Chart.js e destaque da seleção (CA-06.2 / CA-06.4 / CA-06.5).

describe('chartSetup (Fase 8)', () => {
  it('registra só os elementos e escalas usados', () => {
    for (const id of ['arc', 'bar', 'line', 'point']) {
      expect(Chart.registry.getElement(id)).toBeDefined()
    }
    expect(Chart.registry.getScale('category')).toBeDefined()
    expect(Chart.registry.getScale('linear')).toBeDefined()
    expect(Chart.registry.getPlugin('selectionHighlight')).toBe(selectionHighlightPlugin)
  })

  // CA-06.2 / CA-06.3 — tooltip e legenda nativos nem entram no pacote.
  it('não registra tooltip, legenda nem escalas de tempo', () => {
    const silence = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => Chart.registry.getPlugin('tooltip')).toThrow()
    expect(() => Chart.registry.getPlugin('legend')).toThrow()
    expect(() => Chart.registry.getScale('time')).toThrow()
    silence.mockRestore()
  })

  it('desliga as animações para a seleção acompanhar o dedo', () => {
    expect(Chart.defaults.animation).toBe(false)
  })
})

type Hook = (chart: Chart, args: object, options: SelectionHighlightOptions) => void

function fakeChart() {
  const ctx = { save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(), fillStyle: '' }
  const chart = {
    ctx,
    chartArea: { top: 10, bottom: 110 },
    scales: {
      x: {
        width: 300,
        min: 0,
        max: 9,
        // Só 4 rótulos couberam: a faixa deve seguir as 10 categorias, não as marcas.
        ticks: { length: 4 },
        getPixelForValue: (index: number) => index * 30 + 15,
      },
    },
  } as unknown as Chart
  return { chart, ctx }
}

function run(hook: keyof Plugin, options: SelectionHighlightOptions) {
  const { chart, ctx } = fakeChart()
  ;(selectionHighlightPlugin[hook] as Hook)(chart, {}, options)
  return ctx
}

describe('selectionHighlightPlugin (CA-06.4 / CA-06.5)', () => {
  it('barras: faixa da largura da coluna, atrás das barras', () => {
    const options = { index: 2, style: 'band', color: 'blue' } as const
    expect(run('beforeDatasetsDraw', options).fillRect).toHaveBeenCalledWith(60, 10, 30, 100)
    expect(run('afterDatasetsDraw', options).fillRect).not.toHaveBeenCalled()
  })

  it('linha: marcador vertical de 2 px, por cima da linha', () => {
    const options = { index: 0, style: 'line', color: 'black' } as const
    const ctx = run('afterDatasetsDraw', options)
    expect(ctx.fillRect).toHaveBeenCalledWith(14, 10, 2, 100)
    expect(ctx.fillStyle).toBe('black')
    expect(run('beforeDatasetsDraw', options).fillRect).not.toHaveBeenCalled()
  })

  it('sem seleção (ou sem opções), não desenha nada', () => {
    expect(
      run('beforeDatasetsDraw', { index: null, style: 'band', color: 'x' }).fillRect,
    ).not.toHaveBeenCalled()
    expect(
      run('afterDatasetsDraw', {} as SelectionHighlightOptions).fillRect,
    ).not.toHaveBeenCalled()
  })
})
