import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** One selectable option in a filter modal. */
export interface FilterModalRow<T> {
  /** Stable React key. */
  key: string
  /** The filter value this row applies; null for the leading "All …" row. */
  value: T | null
  /** Row content (name, pips…) rendered on the left. */
  content: ReactNode
  /**
   * Optional middle column, sized the same on every row so its contents line up
   * down the list rather than trailing each row's own content.
   */
  aside?: ReactNode
  /** Right-aligned mono figure that accounts for this row's share of the total. */
  meta?: string
  /**
   * Optional second figure, in its own column left of `meta`, for a row that
   * accounts for its share of the total in two units (the tier rows carry both
   * an archetype count and a deck count). Reserved for the whole list like
   * `aside`, so the two figure columns line up down the list.
   */
  metaSecondary?: string
}

interface FilterModalProps<T> {
  /** Localized dialog title, also its accessible name. */
  title: string
  rows: FilterModalRow<T>[]
  /** The active filter value; null matches the "All …" row. */
  value: T | null
  onSelect: (value: T | null) => void
  onClose: () => void
}

/**
 * Modal list for one filter, opened from its header StatCard. Rows are the
 * breakdown of the number on that card, so picking one narrows to it; the
 * leading row is that filter's "All …" default and clears it.
 *
 * Dismissal, focus handling, and chrome follow DecklistModal so the dashboard
 * keeps a single dialog idiom. Deliberately generic — it renders rows it is
 * given and knows nothing about events, archetypes, or tiers.
 */
export function FilterModal<T extends string | number>({
  title,
  rows,
  value,
  onSelect,
  onClose,
}: FilterModalProps<T>) {
  const { t } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const hasAside = rows.some((row) => row.aside != null)
  const hasMetaSecondary = rows.some((row) => row.metaSecondary != null)

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Move focus into the modal on open; restore it to the trigger on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  // The list scrolls inside the modal, so the page behind it must not: without
  // this, a wheel gesture over the overlay scrolls the dashboard instead.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      data-testid="filter-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(5,5,9,.74)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="filter-modal"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--surface-modal)',
          border: '1px solid var(--border-line)',
          borderRadius: 'var(--r-3xl)',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-3)',
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-soft)',
            background: 'linear-gradient(120deg, var(--neon-tint-16), transparent 70%)',
          }}
        >
          <span
            id={titleId}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--fw-bold)',
              fontSize: 'var(--fs-lg)',
              letterSpacing: 'var(--track-tight)',
            }}
          >
            {title}
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('modal.close')}
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              width: 34,
              height: 34,
              flex: '0 0 auto',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border-line)',
              background: 'var(--surface-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--fs-md)',
            }}
          >
            ✕
          </button>
        </div>

        {/* The middle and second-figure columns are reserved for the whole list
            as soon as any row uses them, so rows that leave one empty still
            align. A list where no row supplies them renders neither. */}
        <div className="filter-modal-list">
          {rows.map((row) => {
            const selected = row.value === value
            return (
              <button
                key={row.key}
                type="button"
                aria-current={selected || undefined}
                onClick={() => onSelect(row.value)}
                className="filter-modal-row"
                data-selected={selected || undefined}
              >
                <span className="filter-modal-row-content">{row.content}</span>
                {hasAside && <span className="filter-modal-row-aside">{row.aside}</span>}
                {hasMetaSecondary && (
                  <span className="filter-modal-row-meta filter-modal-row-meta-secondary">{row.metaSecondary}</span>
                )}
                {row.meta && <span className="filter-modal-row-meta">{row.meta}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
