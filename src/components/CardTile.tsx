import { useState } from 'react'
import { CardArtPreview } from './CardArtPreview'
import type { DeckCardLine } from '../hooks/useDeckCards'

interface CardTileProps {
  line: DeckCardLine
}

/** MTG card proportions (~488×680). The tile's width comes from the grid track;
 *  the ratio keeps every tile the same height without hardcoding one. */
const CARD_ASPECT = '5 / 7'

/**
 * One card in the decklist modal's image view: a thumbnail with its copy count.
 *
 * The count sits on its own opaque backdrop rather than directly over the art, so
 * it stays legible on any card. A card with no thumbnail — unresolved by Scryfall,
 * or an image that fails to load — falls back to a placeholder bearing the name,
 * keeping the deck's card count honest. The tile is wrapped in `CardArtPreview`,
 * so hovering or touching it shows the card at full size; thumbnails are far too
 * small to read rules text.
 */
export function CardTile({ line }: CardTileProps) {
  const [failed, setFailed] = useState(false)
  const src = failed ? null : line.thumbnailUrl

  return (
    <CardArtPreview name={line.name} imageUrl={line.imageUrl} style={{ display: 'block' }}>
      <span
        data-testid="card-tile"
        style={{
          position: 'relative',
          display: 'block',
          aspectRatio: CARD_ASPECT,
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-hair)',
        }}
      >
        {src ? (
          <img
            src={src}
            alt={line.name}
            loading="lazy"
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            data-testid="card-tile-placeholder"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: '4px 5px',
              textAlign: 'center',
              fontSize: 'var(--fs-2xs)',
              lineHeight: 1.25,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
            }}
          >
            {line.name}
          </span>
        )}
        <span
          style={{
            position: 'absolute',
            left: 4,
            bottom: 4,
            minWidth: 18,
            padding: '1px 5px',
            borderRadius: 'var(--r-sm)',
            /* Opaque backdrop — the count is never read against card art. */
            background: 'rgba(5,5,9,.9)',
            border: '1px solid var(--border-line)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-2xs)',
            fontWeight: 'var(--fw-bold)',
            color: 'var(--text-primary)',
            textAlign: 'center',
          }}
        >
          x{line.quantity}
        </span>
      </span>
    </CardArtPreview>
  )
}
