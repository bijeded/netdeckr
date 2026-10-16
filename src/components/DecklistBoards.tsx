import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CardArtPreview } from './CardArtPreview'
import { CardTile } from './CardTile'
import type { DeckCardLine } from '../hooks/useDeckCards'
import { groupMainByType, type CardTypeCategory } from '../lib/cardType'

interface DecklistBoardsProps {
  main: DeckCardLine[]
  side: DeckCardLine[]
  /** Image view (card tiles) instead of list view (text lines). */
  images: boolean
}

function CardLine({ line }: { line: DeckCardLine }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '3px 0', breakInside: 'avoid' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--neon-text-soft)', width: 18, flex: '0 0 auto' }}>
        {line.quantity}
      </span>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
        <CardArtPreview name={line.name} imageUrl={line.imageUrl} />
      </span>
    </div>
  )
}

/** Card-type groups rendered within the mainboard, in fixed order. */
const CARD_GROUP_ORDER: CardTypeCategory[] = ['lands', 'creatures', 'spells', 'other']

/**
 * Image view flattens the same groups into one grid in a different order, with
 * lands last. There are no per-group wrappers, so a type transition never starts
 * a new row — the lands simply continue whichever row the spells ended on.
 */
const CARD_TILE_ORDER: CardTypeCategory[] = ['creatures', 'spells', 'other', 'lands']

const sumQuantity = (lines: DeckCardLine[]) => lines.reduce((total, line) => total + line.quantity, 0)

/** A subdued sub-heading for a mainboard card-type group (e.g. Lands · 24). */
function GroupHeading({ label, count }: { label: string; count: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        margin: '14px 0 6px',
        breakInside: 'avoid',
        breakAfter: 'avoid',
      }}
    >
      <span
        data-testid="card-group-heading"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-2xs)',
          fontWeight: 'var(--fw-semibold)',
          letterSpacing: 'var(--track-wide)',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' }}>
        {count}
      </span>
    </div>
  )
}

function SectionHeading({ label, count }: { label: string; count: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-2xs)',
          fontWeight: 'var(--fw-bold)',
          letterSpacing: 'var(--track-wide)',
          textTransform: 'uppercase',
          color: 'var(--neon-text-soft)',
        }}
      >
        {label}
      </span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' }}>
        {count}
      </span>
    </div>
  )
}

/**
 * A deck's mainboard and sideboard, in list view (mainboard grouped by card
 * type) or image view (flat tile grids, lands last). Shared by the decklist
 * modal and the archetype analysis stock list, so both render identically.
 */
export function DecklistBoards({ main, side, images }: DecklistBoardsProps) {
  const { t } = useTranslation()
  const mainGroups = useMemo(() => groupMainByType(main), [main])
  // Flat, lands-last ordering for image view. One array, one grid, no group
  // wrappers — which is what lets lands continue the preceding row.
  const mainTiles = useMemo(
    () => CARD_TILE_ORDER.flatMap((category) => mainGroups[category]),
    [mainGroups],
  )

  return (
    <div className={images ? 'decklist-grid decklist-grid-images' : 'decklist-grid'}>
      <div style={{ padding: '20px 22px', borderRight: '1px solid var(--border-soft)' }}>
        <SectionHeading label={t('modal.main')} count={t('modal.cards', { count: sumQuantity(main) })} />
        {images ? (
          <div className="decklist-tiles decklist-tiles-main">
            {mainTiles.map((line, i) => (
              <CardTile key={`mt-${i}-${line.name}`} line={line} />
            ))}
          </div>
        ) : (
          <div className="decklist-main-cols">
            {CARD_GROUP_ORDER.map((category) => {
              const lines = mainGroups[category]
              if (lines.length === 0) return null
              return (
                <Fragment key={category}>
                  <GroupHeading
                    label={t(`modal.group.${category}`)}
                    count={t('modal.cards', { count: sumQuantity(lines) })}
                  />
                  {lines.map((line, i) => (
                    <CardLine key={`m-${category}-${i}-${line.name}`} line={line} />
                  ))}
                </Fragment>
              )
            })}
          </div>
        )}
      </div>
      <div style={{ padding: '20px 22px', background: 'var(--surface-faint)' }}>
        <SectionHeading label={t('modal.side')} count={t('modal.cards', { count: sumQuantity(side) })} />
        {images ? (
          <div className="decklist-tiles decklist-tiles-side">
            {side.map((line, i) => (
              <CardTile key={`st-${i}-${line.name}`} line={line} />
            ))}
          </div>
        ) : (
          side.map((line, i) => <CardLine key={`s-${i}-${line.name}`} line={line} />)
        )}
      </div>
    </div>
  )
}
