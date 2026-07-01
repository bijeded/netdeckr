import '@testing-library/jest-dom'
import '../i18n'

// jsdom has no matchMedia; the dashboard uses it for the responsive sidebar
// drawer. Default to desktop (no match) so the sidebar starts open in tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})
