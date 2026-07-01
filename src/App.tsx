import { useTranslation } from 'react-i18next'
import { useFormatSelection } from './hooks/useFormatSelection'
import { useMetagameBreakdown } from './hooks/useMetagameBreakdown'
import { useLastUpdated } from './hooks/useLastUpdated'
import { FORMATS } from './lib/formats'
import { relativeTimeFromNow } from './lib/relativeTime'
import { FormatSwitcher } from './components/FormatSwitcher'
import { ArchetypeCard } from './components/ArchetypeCard'
import { Spinner } from './components/Spinner'
import { EmptyState } from './components/EmptyState'

const CONTENT_STYLE = {
  maxWidth: 'var(--content-max)',
  margin: '0 auto',
  padding: '0 var(--sp-6)',
} as const

function LanguageToggle() {
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

function App() {
  const { t, i18n } = useTranslation()
  const { format, setFormat } = useFormatSelection()
  const { data, loading, error } = useMetagameBreakdown(format)
  const lastUpdated = useLastUpdated(format)

  const formatName = t(FORMATS.find((f) => f.code === format)!.i18nKey)
  const maxPct = data.length > 0 ? data[0].sharePct : 100
  const freshness = lastUpdated ? relativeTimeFromNow(lastUpdated, new Date(), i18n.language) : ''

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Topbar */}
      <header
        style={{
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border-hair)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            ...CONTENT_STYLE,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-5)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: 'var(--neon-gradient)',
                boxShadow: 'var(--glow-neon)',
                transform: 'rotate(45deg)',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--fw-heavy)',
                fontSize: 'var(--fs-lg)',
              }}
            >
              {t('app.title')}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
            <FormatSwitcher value={format} onChange={setFormat} />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Format header */}
      <section style={{ ...CONTENT_STYLE, paddingTop: 'var(--sp-8)', paddingBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--fw-heavy)',
              fontSize: 'var(--fs-hero)',
              letterSpacing: 'var(--track-tight)',
              margin: 0,
            }}
          >
            {formatName}
          </h1>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-sm)',
              padding: '5px 12px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--neon-tint-16)',
              color: 'var(--neon-text-soft)',
              border: '1px solid var(--neon-border)',
            }}
          >
            {t('dashboard.windowLabel')}
          </span>
        </div>
        {freshness && (
          <div
            data-testid="freshness"
            style={{
              marginTop: 'var(--sp-2)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-faint)',
            }}
          >
            {t('dashboard.updated', { time: freshness })}
          </div>
        )}
      </section>

      {/* Main */}
      <main style={{ ...CONTENT_STYLE, paddingBottom: 'var(--sp-8)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8)' }}>
            <Spinner label={t('dashboard.loading')} />
          </div>
        ) : error || data.length === 0 ? (
          <EmptyState message={t('dashboard.empty')} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))',
              gap: 'var(--sp-5)',
            }}
          >
            {data.map((archetype) => (
              <ArchetypeCard
                key={archetype.rank}
                rank={archetype.rank}
                name={archetype.name}
                colors={archetype.colorIdentity}
                sharePct={archetype.sharePct}
                maxPct={maxPct}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
