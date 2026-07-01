import React from 'react';

const TIERS = {
  T1:    { color: 'var(--tier-1)', bg: 'var(--neon-tint-16)', border: 'rgba(177,75,255,.55)' },
  T2:    { color: 'var(--tier-2)', bg: 'rgba(127,216,255,.12)', border: 'rgba(127,216,255,.4)' },
  T3:    { color: 'var(--tier-3)', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.18)' },
  Otros: { color: 'var(--tier-rogue)', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.12)' },
};

/** Classify a metagame share (%) into a tier label. */
export function tierFor(pct) {
  if (pct >= 10) return 'T1';
  if (pct >= 5) return 'T2';
  if (pct >= 1) return 'T3';
  return 'Otros';
}

/**
 * TierBadge — mono chip marking an archetype's tier (T1/T2/T3/Otros).
 * Pass `tier` directly, or `pct` to auto-classify.
 */
export function TierBadge({ tier, pct, style, ...rest }) {
  const t = tier || (pct != null ? tierFor(pct) : 'T3');
  const c = TIERS[t] || TIERS.T3;
  return (
    <span {...rest} style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', fontWeight: 'var(--fw-bold)',
      padding: '3px 9px', borderRadius: 'var(--r-sm)',
      color: c.color, background: c.bg, border: `1px solid ${c.border}`,
      backdropFilter: 'blur(4px)', ...style,
    }}>{t}</span>
  );
}
