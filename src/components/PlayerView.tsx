import { useTranslation } from 'react-i18next'
import type { DeckRow } from '../lib/deckSelection'
import type { PlayerGroup } from '../lib/players'
import { DeckCard } from './DeckCard'
import { EmptyState } from './EmptyState'
import { WinTrophy } from './WinTrophy'

interface PlayerViewProps {
  /** The player's decks in the active subset, or null when they have none. */
  player: PlayerGroup | null
  /** The name from the URL, shown when `player` is null. */
  requestedName: string
  /** The archetype/tier narrowing in effect, named in the header; null for none. */
  context: string | null
  onSelectDeck: (deck: DeckRow) => void
  onBack: () => void
}

/** One player's decks in the active format and window, most recent first. */
export function PlayerView({ player, requestedName, context, onSelectDeck, onBack }: PlayerViewProps) {
  const { t } = useTranslation()
  const name = player?.displayName ?? requestedName
  return (
    <section data-testid="player-view" aria-label={name}>
      <div className="players-view-header">
        <button type="button" data-testid="leave-player" className="window-pill view-all-pill" onClick={onBack}>
          ← {t('filters.back')}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)', flexWrap: 'wrap', marginBottom: 'var(--sp-5)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--fw-bold)',
            fontSize: 'var(--fs-h2)',
            letterSpacing: 'var(--track-tight)',
            margin: 0,
            overflowWrap: 'anywhere',
          }}
        >
          {name}
        </h2>
        {player && (
          <span
            data-testid="player-summary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}
          >
            {t('players.events', { count: player.events })}
            <WinTrophy wins={player.wins} />
          </span>
        )}
        {context && (
          <span
            data-testid="player-context"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', color: 'var(--neon-text-soft)' }}
          >
            {context}
          </span>
        )}
      </div>
      {player === null ? (
        <EmptyState message={t('players.playerEmpty', { player: name })} />
      ) : (
        <div
          data-testid="player-decks"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}
        >
          {player.decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} lead="archetype" onSelect={onSelectDeck} />
          ))}
        </div>
      )}
    </section>
  )
}
