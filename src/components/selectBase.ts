import type { CSSProperties } from 'react'

/**
 * Shared treatment for the sidebar filter `<select>` controls.
 *
 * The Event group stacks two of these (size above event), so they have to be
 * pixel-identical — a difference in padding or border between them would read
 * as one being a different kind of control rather than a second filter on the
 * same axis.
 *
 * NOTE: ArchetypeSelector and TierSelector still carry their own copies of these
 * values. They are outside this change's scope; folding them in is a safe follow-up.
 */
export const selectBase: CSSProperties = {
  width: '100%',
  padding: '9px 13px',
  borderRadius: 'var(--r-md)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--fs-sm)',
  cursor: 'pointer',
  border: '1px solid var(--border-line)',
  background: 'var(--surface-faint)',
  color: 'var(--text-secondary)',
}
