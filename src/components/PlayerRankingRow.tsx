import { useTranslation } from 'react-i18next'
import type { PlayerGroup } from '../lib/players'
import { ManaPips } from './ManaPips'
import { WinTrophy } from './WinTrophy'

interface PlayerRankingRowProps {
  rank: number
  player: PlayerGroup
  onSelect: (player: PlayerGroup) => void
}

/**
 * One ranked player: rank, name over their most-played archetype, distinct
 * events, wins. Opens the Player view.
 */
export function PlayerRankingRow({ rank, player, onSelect }: PlayerRankingRowProps) {
  const { t } = useTranslation()
  return (
    <li style={{ listStyle: 'none' }}>
      <button
        type="button"
        className="player-row"
        onClick={() => onSelect(player)}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-faint)',
            textAlign: 'right',
          }}
        >
          {rank}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--fw-semibold)',
              fontSize: 'var(--fs-sm)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {player.displayName}
          </span>
          {/* Most-played archetype: a secondary line, so the name stays the row's lead. */}
          <span
            data-testid="player-top-archetype"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-faint)',
            }}
          >
            <ManaPips colors={player.topArchetype.colorIdentity} size={10} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.topArchetype.name}
            </span>
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {t('players.events', { count: player.events })}
        </span>
        <span style={{ fontSize: 'var(--fs-xs)', minWidth: 36, textAlign: 'right' }}>
          <WinTrophy wins={player.wins} />
        </span>
      </button>
    </li>
  )
}
