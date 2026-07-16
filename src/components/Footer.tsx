import { useTranslation } from 'react-i18next'
import { LanguageToggle } from './LanguageToggle'
import type { LegalPageCode } from '../hooks/useLegalPage'

interface FooterProps {
  onNavigate: (page: LegalPageCode) => void
}

/**
 * Persistent app-shell footer: links to the How It Works and Privacy Policy
 * pages, the EN/ES language toggle, and the Wizards of the Coast Fan Content
 * Policy attribution. Rendered on the dashboard and on both legal pages.
 */
export function Footer({ onNavigate }: FooterProps) {
  const { t } = useTranslation()
  return (
    <footer className="app-footer">
      <div className="footer-row">
        <nav className="footer-links" aria-label={t('footer.nav')}>
          <button type="button" onClick={() => onNavigate('how-it-works')}>
            {t('footer.howItWorks')}
          </button>
          <button type="button" onClick={() => onNavigate('privacy')}>
            {t('footer.privacy')}
          </button>
        </nav>
        <LanguageToggle />
      </div>
      <p className="footer-legend">{t('footer.legend')}</p>
    </footer>
  )
}
