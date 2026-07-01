import React from 'react';

/**
 * Button — primary action button. `neon` variant is the glowing gradient CTA
 * (e.g. "Exportar a MTG Arena"); `ghost` is the bordered neutral button (topbar icon, close).
 */
export function Button({ variant = 'neon', size = 'md', icon, children, style, ...rest }) {
  const pad = size === 'sm' ? '8px 13px' : '10px 16px';
  const fs = size === 'sm' ? 'var(--fs-sm)' : 'var(--fs-sm)';
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: pad, borderRadius: 'var(--r-md)', cursor: 'pointer',
    fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-semibold)', fontSize: fs,
    transition: 'all var(--dur) var(--ease)', whiteSpace: 'nowrap',
  };
  const variants = {
    neon: {
      border: '1px solid var(--neon-border)', background: 'var(--neon-gradient)',
      color: '#fff', boxShadow: '0 0 22px rgba(177,75,255,.4)',
    },
    ghost: {
      border: '1px solid var(--border-line)', background: 'var(--surface-faint)',
      color: '#cfd0db',
    },
  };
  return (
    <button {...rest} style={{ ...base, ...variants[variant], ...style }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {children}
    </button>
  );
}

/**
 * IconButton — square 34px bordered button for single glyphs (menu, close).
 */
export function IconButton({ children, style, ...rest }) {
  return (
    <button {...rest} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 34, height: 34, flex: '0 0 auto',
      border: '1px solid var(--border-line)', background: 'var(--surface-faint)',
      borderRadius: 'var(--r-md)', color: '#cfd0db', cursor: 'pointer', fontSize: 15,
      ...style,
    }}>{children}</button>
  );
}
