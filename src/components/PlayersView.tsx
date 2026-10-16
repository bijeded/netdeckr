import { useTranslation } from 'react-i18next'
import type { PlayerGroup } from '../lib/players'
import { EmptyState } from './EmptyState'
import { PlayerRankingRow } from './PlayerRankingRow'

export type PlayerRanking = 'top' | 'grinders'

interface PlayersViewProps {
  ranking: PlayerRanking
  onRankingChange: (ranking: PlayerRanking) => void
  topPlayers: PlayerGroup[]
  topGrinders: PlayerGroup[]
  onSelectPlayer: (player: PlayerGroup) => void
  /** "← Metagame": back to the dashboard. */
  onBack: () => void
}

const RANKINGS: { value: PlayerRanking; key: string }[] = [
  { value: 'top', key: 'players.topPlayers' },
  { value: 'grinders', key: 'players.topGrinders' },
]

/** The Players view: a Top Players | Top Grinders toggle over a top-10 list. */
export function PlayersView({
  ranking,
  onRankingChange,
  topPlayers,
  topGrinders,
  onSelectPlayer,
  onBack,
}: PlayersViewProps) {
  const { t } = useTranslation()
  const rows = ranking === 'top' ? topPlayers : topGrinders
  return (
    <section data-testid="players-view" aria-label={t('players.heading')}>
      <div className="players-view-header">
        <button type="button" data-testid="leave-players" className="window-pill view-all-pill" onClick={onBack}>
          ← {t('players.backToMetagame')}
        </button>
        <div role="group" aria-label={t('players.rankingToggle')} className="players-toggle">
          {RANKINGS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={ranking === option.value}
              data-active={ranking === option.value}
              onClick={() => onRankingChange(option.value)}
            >
              {t(option.key)}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState message={t('players.empty')} />
      ) : (
        <ol data-testid="player-ranking" style={{ margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-2)' }}>
          {rows.map((player, i) => (
            <PlayerRankingRow key={player.key} rank={i + 1} player={player} onSelect={onSelectPlayer} />
          ))}
        </ol>
      )}
    </section>
  )
}
