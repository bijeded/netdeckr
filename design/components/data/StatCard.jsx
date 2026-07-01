import React from 'react';

/**
 * StatCard — small right-aligned summary metric (value + uppercase label).
 * Used in the page header strip.
 */
export function StatCard({ value, label, color = 'var(--text-primary)', style, ...rest }) {
  return (
    <div {...rest} style={{
      padding: '10px 16px', border: '1px solid var(--border-soft)',
      background: 'var(--surface-faint)', borderRadius: 'var(--r-lg)',
      minWidth: 96, textAlign: 'right', ...style,
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-stat-sm)', fontWeight: 'var(--fw-bold)', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
    </div>
  );
}
