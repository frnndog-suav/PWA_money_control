import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@/index.css'
import { App } from '@/app/App'
import { registerPwa } from '@/app/pwa/registerPwa'

// §6.9 — service worker do PWA (no `npm run dev` o plugin entrega um registro vazio).
registerPwa(registerSW)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
