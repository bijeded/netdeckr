import React from 'react';

/**
 * ManaPip — a WUBRG mana color dot. Combine several to show a deck's color identity.
 */
export function ManaPip({ color = 'U', size = 13, style, ...rest }) {
  const map = {
    W: ['var(--mana-w)', 'rgba(0,0,0,.25)'],
    U: ['var(--mana-u)', 'rgba(255,255,255,.25)'],
    B: ['var(--mana-b)', 'rgba(255,255,255,.18)'],
    R: ['var(--mana-r)', 'rgba(255,255,255,.2)'],
    G: ['var(--mana-g)', 'rgba(255,255,255,.2)'],
  };
  const [fill, ring] = map[color] || map.U;
  return (
    <span
      {...rest}
      style={{
        display: 'inline-block', width: size, height: size, borderRadius: '50%',
        background: fill, border: `1px solid ${ring}`, boxShadow: `0 0 6px ${fill}55`,
        flex: '0 0 auto', ...style,
      }}
    />
  );
}

/**
 * ManaPips — render a run of pips from a color string like "UR" or "WUBRG".
 */
export function ManaPips({ colors = 'U', size = 13, gap = 4, style }) {
  return (
    <span style={{ display: 'inline-flex', gap, ...style }}>
      {colors.split('').map((c, i) => <ManaPip key={i} color={c} size={size} />)}
    </span>
  );
}
