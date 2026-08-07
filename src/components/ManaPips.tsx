import type { CSSProperties } from 'react'

// WUBRG fills + a colorless gray, keyed to the design's mana tokens.
const COLORS: Record<string, [fill: string, ring: string]> = {
  W: ['var(--mana-w)', 'rgba(0,0,0,.25)'],
  U: ['var(--mana-u)', 'rgba(255,255,255,.25)'],
  B: ['var(--mana-b)', 'rgba(255,255,255,.18)'],
  R: ['var(--mana-r)', 'rgba(255,255,255,.2)'],
  G: ['var(--mana-g)', 'rgba(255,255,255,.2)'],
  C: ['var(--tier-rogue)', 'rgba(255,255,255,.18)'], // colorless
}

function ManaPip({ color, size }: { color: string; size: number }) {
  const [fill, ring] = COLORS[color] ?? COLORS.C
  return (
    <span
      data-testid="mana-pip"
      data-color={color}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: fill,
        border: `1px solid ${ring}`,
        // The pips sit on the card art with no chip behind them, so each carries
        // its own minimal dark backdrop: a tight ring that separates it from the
        // art and from its neighbours (the pale W pip on bright art needs this),
        // plus a drop shadow for lift. The hue glow stays outermost.
        boxShadow: `0 0 0 1.5px rgba(6,7,12,.65), 0 1px 3px rgba(0,0,0,.5), 0 0 6px ${fill}55`,
        flex: '0 0 auto',
      }}
    />
  )
}

interface ManaPipsProps {
  /** WUBRG color-identity string, e.g. "UR"; "" renders a single gray pip. */
  colors: string
  size?: number
  gap?: number
  style?: CSSProperties
}

export function ManaPips({ colors, size = 13, gap = 4, style }: ManaPipsProps) {
  const letters = colors ? colors.slice(0, 5).split('') : ['C']
  return (
    <span style={{ display: 'inline-flex', gap, ...style }}>
      {letters.map((c, i) => (
        <ManaPip key={i} color={c} size={size} />
      ))}
    </span>
  )
}
