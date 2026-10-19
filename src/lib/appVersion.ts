// CA-11.5 — versão do app exibida em Ajustes → Sobre. O valor vem do campo `version`
// do package.json, injetado no build pelo `define` do vite.config.ts (só a string entra
// no bundle, não o package.json inteiro).
export const APP_VERSION: string = __APP_VERSION__
