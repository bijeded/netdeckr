import React from 'react';
import { ManaPips } from '../mana/ManaPip.jsx';
import { TierBadge, tierFor } from '../data/TierBadge.jsx';
import { ChangeIndicator } from '../data/ChangeIndicator.jsx';

/**
 * ArchetypeCard — the signature metagame card: color-identity art header with
 * tier chip, rank + name, big share %, delta chip, and share bar.
 * `hue` drives the placeholder art gradient; `maxPct` scales the bar (default 100).
 */
export function ArchetypeCard({ rank, name, colors = 'U', pct = 0, delta = 0, hue = 265, maxPct = 100, selected = false, onClick, style }) {
  const t = tierFor(pct);
  const tierColor = { T1: 'var(--tier-1)', T2: 'var(--tier-2)', T3: 'var(--tier-3)', Otros: 'var(--tier-rogue)' }[t];
  const deltaColor = delta > 0.05 ? 'var(--up)' : delta < -0.05 ? 'var(--down)' : 'var(--flat)';
  return (
    <div onClick={onClick} style={{
      border: `1px solid ${selected ? 'var(--neon-border)' : 'var(--border-soft)'}`,
      background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default', transition: 'border-color var(--dur-slow), box-shadow var(--dur-slow)',
      boxShadow: selected ? '0 0 0 1px rgba(177,75,255,.25), var(--shadow-card)' : 'none', ...style,
    }}>
      <div style={{ position: 'relative', height: 118, overflow: 'hidden',
        background: `linear-gradient(150deg, oklch(0.32 0.09 ${hue}), oklch(0.16 0.05 ${hue}))` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 11px)' }} />
        <div style={{ position: 'absolute', left: 11, top: 10 }}><ManaPips colors={colors} size={16} /></div>
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'rgba(255,255,255,.34)', textTransform: 'uppercase' }}>arte · {colors}</span>
        <div style={{ position: 'absolute', right: 10, top: 10 }}><TierBadge tier={t} /></div>
      </div>
      <div style={{ padding: '13px 14px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' }}>#{rank}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-md)', letterSpacing: 'var(--track-snug)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-stat)', fontWeight: 'var(--fw-bold)', letterSpacing: '-.02em', lineHeight: 1 }}>{pct.toFixed(1)}%</div>
          <ChangeIndicator delta={delta} />
        </div>
        <div style={{ marginTop: 11, height: 4, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, pct / maxPct * 100)}%`, background: `linear-gradient(90deg, ${tierColor}, ${deltaColor})`, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}
