import { useTranslation } from 'react-i18next'

/** EN/ES language switcher, rendered in the footer. */
export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  return (
    <div style={{ display: 'inline-flex', gap: 4 }} aria-label={t('language.label')}>
      {(['en', 'es'] as const).map((lng) => {
        const active = i18n.language.startsWith(lng)
        return (
          <button
            key={lng}
            type="button"
            aria-pressed={active}
            onClick={() => i18n.changeLanguage(lng)}
            style={{
              padding: '4px 9px',
              borderRadius: 'var(--r-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-2xs)',
              cursor: 'pointer',
              border: `1px solid ${active ? 'var(--neon-border)' : 'var(--border-line)'}`,
              background: active ? 'var(--neon-tint-16)' : 'transparent',
              color: active ? 'var(--neon-text-soft)' : 'var(--text-faint)',
            }}
          >
            {t(`language.${lng}`)}
          </button>
        )
      })}
    </div>
  )
}
