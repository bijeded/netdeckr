import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Test config lives in vitest.config.ts to avoid a type clash between
// rolldown-vite (Vite 8) and vitest's bundled Vite typings.
export default defineConfig({
  plugins: [react()],
})
