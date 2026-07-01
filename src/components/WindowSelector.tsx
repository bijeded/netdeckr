import { useTranslation } from 'react-i18next'
import { WINDOWS, type WindowCode } from '../lib/windows'

interface WindowSelectorProps {
  value: WindowCode
  onChange: (window: WindowCode) => void
}

/**
 * Sidebar filter: the combined time-window / event-scope selector. One
 * full-width option per MTGTop8 meta window, the active one glowing violet.
 */
export function WindowSelector({ value, onChange }: WindowSelectorProps) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-labelledby="window-filter-heading">
      <div
        id="window-filter-heading"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-2xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--track-wide)',
          color: 'var(--text-faint)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        {t('filters.window')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {WINDOWS.map((window) => {
          const active = window.code === value
          return (
            <button
              key={window.code}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(window.code)}
              style={{
                textAlign: 'left',
                padding: '9px 13px',
                borderRadius: 'var(--r-md)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--fs-sm)',
                cursor: 'pointer',
                transition: 'all var(--dur) var(--ease)',
                border: `1px solid ${active ? 'rgba(177,75,255,.6)' : 'var(--border-line)'}`,
                background: active
                  ? 'linear-gradient(140deg,rgba(177,75,255,.22),rgba(122,43,255,.16))'
                  : 'var(--surface-faint)',
                color: active ? 'var(--neon-text-soft)' : 'var(--text-secondary)',
                boxShadow: active ? 'var(--glow-neon)' : 'none',
              }}
            >
              {t(window.i18nKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
