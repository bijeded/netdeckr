import { defineConfig } from 'vitest/config'

// JSX in tests is transformed by esbuild; the React plugin (Fast Refresh) is
// only needed by the dev server, so it stays in vite.config.ts.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
