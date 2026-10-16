import { useTranslation } from 'react-i18next'
import { GalleryIcon, ListIcon } from './viewIcons'

interface DecklistViewToggleProps {
  images: boolean
  onToggle: () => void
}

/** Switches a decklist between list view and image view; shows the view it switches TO. */
export function DecklistViewToggle({ images, onToggle }: DecklistViewToggleProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={images}
      aria-label={t(images ? 'modal.view.toList' : 'modal.view.toImages')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 13px',
        flex: '0 0 auto',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border-line)',
        background: 'var(--surface-subtle)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--fs-sm)',
        fontWeight: 'var(--fw-semibold)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex' }}>
        {images ? <ListIcon /> : <GalleryIcon />}
      </span>
      {/* Label is hidden below 640px — the mobile header row has no space
          for a third labelled control (see .modal-view-label). */}
      <span className="modal-view-label">
        {t(images ? 'modal.view.toList' : 'modal.view.toImages')}
      </span>
    </button>
  )
}
