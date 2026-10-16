import { useTranslation } from 'react-i18next'
import type { PlayerGroup } from '../lib/players'
import { WinTrophy } from './WinTrophy'

interface PlayerRankingRowProps {
  rank: number
  player: PlayerGroup
  onSelect: (player: PlayerGroup) => void
}

/** One ranked player: rank, name, distinct events, wins. Opens the Player view. */
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
