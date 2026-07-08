## 1. Bare-integer placement label

- [x] 1.1 In `src/lib/placement.ts`, change the final branch of `placementBadge` so a bare integer standing above 8 (`nums.length === 1 && high > 8`) returns `{ label: String(high), kind: 'other' }`; ranges and integers ≤ 8 keep `Top {high}`.
- [x] 1.2 Update the header comment on `src/lib/placement.ts` to describe the bare-integer-above-8 case.

## 2. Tests and verification

- [x] 2.1 In `src/lib/placement.test.ts`, add bare-integer cases (`"9" → 9`, `"14" → 14`, boundary `"8" → Top 8`) and confirm the range cases stay (`"5-8" → Top 8`, `"9-16" → Top 16`, `"17-32" → Top 32`).
- [x] 2.2 Run `npm run lint`, `npm run type-check`, and `npm run test`.
