import React from 'react';

/**
 * ChangeIndicator — mono delta chip. Green ▲ for rising, red ▼ for falling,
 * amber – for flat. Pass a numeric `delta` (percentage points).
 */
export function ChangeIndicator({ delta = 0, style, ...rest }) {
  let c;
  if (delta > 0.05) c = { color: 'var(--up)', icon: '▲', text: '+' + delta.toFixed(1), bg: 'var(--up-tint)', border: 'var(--up-border)' };
  else if (delta < -0.05) c = { color: 'var(--down)', icon: '▼', text: delta.toFixed(1), bg: 'var(--down-tint)', border: 'var(--down-border)' };
  else c = { color: 'var(--flat)', icon: '–', text: '0.0', bg: 'var(--flat-tint)', border: 'var(--flat-border)' };
  return (
    <span {...rest} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 'var(--fw-bold)',
      padding: '4px 9px', borderRadius: '7px',
      color: c.color, background: c.bg, border: `1px solid ${c.border}`, ...style,
    }}>
      <span style={{ fontSize: 11 }}>{c.icon}</span>{c.text}
    </span>
  );
}
