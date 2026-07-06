import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

interface WinTrophyProps {
  /** Number of first-place decks; the component renders nothing when <= 0. */
  wins: number
  style?: CSSProperties
}

/**
 * Marks an archetype that has won ≥1 event: a bare 🏆 for a single win, or
 * 🏆 followed by a mono `×N` multiplier for more. The 🏆 is a deliberate,
 * scoped exception to the project's "no emoji" rule — used only to mark wins.
 * Carries a localized, count-aware accessible label.
 */
export function WinTrophy({ wins, style }: WinTrophyProps) {
  const { t } = useTranslation()
  if (wins <= 0) return null
  return (
    <span
      role="img"
      aria-label={t('wins.label', { count: wins })}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2, lineHeight: 1, ...style }}
    >
      <span aria-hidden="true">🏆</span>
      {wins > 1 && (
        <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)' }}>
          ×{wins}
        </span>
      )}
    </span>
  )
}
