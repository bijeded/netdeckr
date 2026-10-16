import { useTranslation } from 'react-i18next'
import type { ExportTarget } from '../lib/deckExport'

interface DeckExportButtonProps {
  target: ExportTarget
  disabled: boolean
  onExport: () => void
}

/** Copies a deck to the clipboard for its format's client; the label names that client. */
export function DeckExportButton({ target, disabled, onExport }: DeckExportButtonProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 13px',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--neon-border)',
        background: 'var(--neon-tint-16)',
        color: 'var(--neon-text)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--fs-sm)',
        fontWeight: 'var(--fw-semibold)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">⬇</span>
      {t(target === 'arena' ? 'modal.export.action' : 'modal.export.mtgo')}
    </button>
  )
}
