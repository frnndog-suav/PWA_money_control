// Visual comum dos campos de texto: alvo de toque ≥ 44 px (RNF-06), fonte de 16 px (o
// Safari do iOS dá zoom em campos menores) e borda vermelha quando inválido. A borda é o que
// mostra onde está o campo: contraste ≥ 3:1 com o fundo nos dois temas (RNF-06 / WCAG 1.4.11;
// slate-500 sobre branco 4,8:1, slate-400 sobre slate-900 6,8:1 e sobre slate-800 5,6:1).
export const TEXT_INPUT_CLASSES =
  'min-h-11 w-full rounded-lg border border-slate-500 bg-white px-3 text-base aria-invalid:border-red-600 dark:border-slate-400 dark:bg-slate-900 dark:aria-invalid:border-red-400'
