import type { Layer } from '@/dev/architecture/types'

interface LayerStyle {
  /** Caixa SVG (preenchimento + contorno). */
  box: string
  /** Texto dentro da caixa SVG. */
  text: string
  /** Etiqueta HTML. */
  chip: string
}

// Classes completas (o Tailwind só gera classes escritas por extenso no código).
export const LAYER_STYLES: Readonly<Record<Layer, LayerStyle>> = {
  config: {
    box: 'fill-slate-100 stroke-slate-500 dark:fill-slate-800',
    text: 'fill-slate-900 dark:fill-slate-100',
    chip: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
  },
  entry: {
    box: 'fill-zinc-100 stroke-zinc-500 dark:fill-zinc-800',
    text: 'fill-zinc-900 dark:fill-zinc-100',
    chip: 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100',
  },
  app: {
    box: 'fill-violet-50 stroke-violet-500 dark:fill-violet-950',
    text: 'fill-violet-950 dark:fill-violet-100',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-900/60 dark:text-violet-100',
  },
  features: {
    box: 'fill-blue-50 stroke-blue-500 dark:fill-blue-950',
    text: 'fill-blue-950 dark:fill-blue-100',
    chip: 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100',
  },
  components: {
    box: 'fill-cyan-50 stroke-cyan-600 dark:fill-cyan-950',
    text: 'fill-cyan-950 dark:fill-cyan-100',
    chip: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/60 dark:text-cyan-100',
  },
  repositories: {
    box: 'fill-amber-50 stroke-amber-600 dark:fill-amber-950',
    text: 'fill-amber-950 dark:fill-amber-100',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
  },
  db: {
    box: 'fill-orange-50 stroke-orange-600 dark:fill-orange-950',
    text: 'fill-orange-950 dark:fill-orange-100',
    chip: 'bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100',
  },
  stores: {
    box: 'fill-pink-50 stroke-pink-500 dark:fill-pink-950',
    text: 'fill-pink-950 dark:fill-pink-100',
    chip: 'bg-pink-100 text-pink-900 dark:bg-pink-900/60 dark:text-pink-100',
  },
  domain: {
    box: 'fill-emerald-50 stroke-emerald-600 dark:fill-emerald-950',
    text: 'fill-emerald-950 dark:fill-emerald-100',
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100',
  },
  lib: {
    box: 'fill-teal-50 stroke-teal-600 dark:fill-teal-950',
    text: 'fill-teal-950 dark:fill-teal-100',
    chip: 'bg-teal-100 text-teal-900 dark:bg-teal-900/60 dark:text-teal-100',
  },
  test: {
    box: 'fill-lime-50 stroke-lime-600 dark:fill-lime-950',
    text: 'fill-lime-950 dark:fill-lime-100',
    chip: 'bg-lime-100 text-lime-900 dark:bg-lime-900/60 dark:text-lime-100',
  },
  dev: {
    box: 'fill-fuchsia-50 stroke-fuchsia-500 dark:fill-fuchsia-950',
    text: 'fill-fuchsia-950 dark:fill-fuchsia-100',
    chip: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/60 dark:text-fuchsia-100',
  },
  assets: {
    box: 'fill-stone-100 stroke-stone-500 dark:fill-stone-800',
    text: 'fill-stone-900 dark:fill-stone-100',
    chip: 'bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-stone-100',
  },
  other: {
    box: 'fill-gray-100 stroke-gray-500 dark:fill-gray-800',
    text: 'fill-gray-900 dark:fill-gray-100',
    chip: 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
  },
}
