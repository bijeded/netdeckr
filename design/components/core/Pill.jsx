import React from 'react';

/**
 * Pill — rounded toggle chip used for the format switcher in the topbar.
 * `active` gives it the violet gradient + glow.
 */
export function Pill({ active = false, children, style, ...rest }) {
  return (
    <button {...rest} style={{
      flex: '0 0 auto', padding: '8px 15px', borderRadius: 'var(--r-pill)',
      fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all var(--dur) var(--ease)',
      border: `1px solid ${active ? 'rgba(177,75,255,.6)' : 'var(--border-line)'}`,
      background: active ? 'linear-gradient(140deg,rgba(177,75,255,.22),rgba(122,43,255,.16))' : 'var(--surface-faint)',
      color: active ? 'var(--neon-text-soft)' : 'var(--text-secondary)',
      boxShadow: active ? 'var(--glow-neon)' : 'none',
      ...style,
    }}>{children}</button>
  );
}
