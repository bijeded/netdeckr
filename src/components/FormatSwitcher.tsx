import { useTranslation } from 'react-i18next'
import { FORMATS, type FormatCode } from '../lib/formats'

interface FormatSwitcherProps {
  value: FormatCode
  onChange: (format: FormatCode) => void
}

/** The topbar format switcher: one violet pill per format. */
export function FormatSwitcher({ value, onChange }: FormatSwitcherProps) {
  const { t } = useTranslation()
  return (
    <div className="format-switcher">
      {FORMATS.map((format) => {
        const active = format.code === value
        return (
          <button
            key={format.code}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(format.code)}
            style={{
              flex: '0 0 auto',
              padding: '8px 15px',
              borderRadius: 'var(--r-pill)',
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--fw-semibold)',
              fontSize: 'var(--fs-sm)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--dur) var(--ease)',
              border: `1px solid ${active ? 'rgba(177,75,255,.6)' : 'var(--border-line)'}`,
              background: active
                ? 'linear-gradient(140deg,rgba(177,75,255,.22),rgba(122,43,255,.16))'
                : 'var(--surface-faint)',
              color: active ? 'var(--neon-text-soft)' : 'var(--text-secondary)',
              boxShadow: active ? 'var(--glow-neon)' : 'none',
            }}
          >
            {t(format.i18nKey)}
          </button>
        )
      })}
    </div>
  )
}
