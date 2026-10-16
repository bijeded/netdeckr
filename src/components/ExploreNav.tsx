import { useTranslation } from 'react-i18next'

interface ExploreNavProps {
  /** True while the Players view (or a Player view) is open. */
  active: boolean
  onOpenPlayers: () => void
}

/**
 * Sidebar section below the filters: navigation, not a filter. It is set apart
 * by a divider and its own heading, and its row deliberately avoids the filter
 * vocabulary — no box, no fill, no select — so it reads as a link to another
 * view rather than one more way to narrow this one. Active = the view is open.
 */
export function ExploreNav({ active, onOpenPlayers }: ExploreNavProps) {
  const { t } = useTranslation()
  return (
    <nav aria-labelledby="explore-nav-heading" className="explore-nav">
      <div
        id="explore-nav-heading"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-2xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--track-wide)',
          color: 'var(--text-faint)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        {t('players.explore')}
      </div>
      <button
        type="button"
        data-testid="explore-players"
        className="explore-nav-row"
        data-active={active}
        aria-current={active ? 'page' : undefined}
        onClick={onOpenPlayers}
      >
        <span>{t('players.nav')}</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  )
}
