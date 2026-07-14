## 1. Window config (src/lib/windows.ts)

- [x] 1.1 Change the short entry in `WINDOWS` from `{ code: '5days', i18nKey: 'windows.last5Days', isDefault: true }` to `{ code: '7days', i18nKey: 'windows.last7Days', isDefault: true }`
- [x] 1.2 Update `WINDOW_DAYS` from `'5days': 5` to `'7days': 7`
- [x] 1.3 Update `DEFAULT_WINDOW` from `'5days'` to `'7days'`
- [x] 1.4 Confirm `normalizeWindow`/`isWindowCode` now treat `5days` as invalid (falls back to default) — no code branch needed since `5days` leaves `CODES`; update the doc comment mentioning `2months` to also note `5days` is retired

## 2. i18n labels

- [x] 2.1 Rename `windows.last5Days` → `windows.last7Days` with value `"Last 7 days"` in `src/locales/en.json`
- [x] 2.2 Rename `windows.last5Days` → `windows.last7Days` with value `"Últimos 7 días"` in `src/locales/es.json`

## 3. Tests

- [x] 3.1 Update `src/lib/windows` unit tests (or add if absent) covering: default is `7days`, `WINDOW_DAYS['7days'] === 7`, and `normalizeWindow('5days')` returns `7days` (legacy fallback, alongside the existing `2months` case)
- [x] 3.2 Update `src/components/WindowSelector.test.tsx` — labels `['Last 7 days', 'Last 2 weeks']`, `value="7days"`, and button-name assertions
- [x] 3.3 Update `src/hooks/useMetagame.test.tsx` — replace `useMetagame('ST', '5days')` with `'7days'`, and adjust any "inside 2 weeks, outside 5 days" fixtures/comments to the 7-day boundary
- [x] 3.4 Update `src/App.test.tsx` — default window pill assertions to `"Last 7 days"` / `"Últimos 7 días"` and any `5days` literals
- [x] 3.5 Grep the repo for remaining `5days` / `last5Days` / "5 days" literals and update or remove them

## 4. Verify

- [x] 4.1 Run `npm run lint`, `npm run type-check`, and `npm run test` — all green
- [x] 4.2 Manually confirm: fresh load defaults to Last 7 days with `?w=7days`; visiting `?w=5days` falls back to the default without error; selecting Last 2 Weeks still works
