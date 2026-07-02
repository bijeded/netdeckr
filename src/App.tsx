import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormatSelection } from './hooks/useFormatSelection'
import { useWindowSelection } from './hooks/useWindowSelection'
import { useMetagameBreakdown } from './hooks/useMetagameBreakdown'
import { useLastUpdated } from './hooks/useLastUpdated'
import { useDecks } from './hooks/useDecks'
import { FORMATS } from './lib/formats'
import { WINDOWS } from './lib/windows'
import { relativeTimeFromNow } from './lib/relativeTime'
import { FormatSwitcher } from './components/FormatSwitcher'
import { WindowSelector } from './components/WindowSelector'
import { ArchetypeCard } from './components/ArchetypeCard'
import { DeckCard } from './components/DeckCard'
import { DecklistModal } from './components/DecklistModal'
import type { DeckRow } from './lib/deckSelection'
import { Spinner } from './components/Spinner'
import { EmptyState } from './components/EmptyState'

const SIDEBAR_MQ = '(max-width: 860px)'

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
  const { window: metaWindow, setWindow } = useWindowSelection()
  const { data, loading, error } = useMetagameBreakdown(format, metaWindow)
  const lastUpdated = useLastUpdated(format, metaWindow)
  const { decksByArchetype } = useDecks(format, metaWindow)

  // Which archetype card is expanded to show its decklists. Collapses whenever the
  // format or window changes (the decks it showed no longer apply).
  const [expandedName, setExpandedName] = useState<string | null>(null)
  // The deck whose full decklist modal is open, if any.
  const [selectedDeck, setSelectedDeck] = useState<DeckRow | null>(null)
  useEffect(() => {
    setExpandedName(null)
    setSelectedDeck(null)
  }, [format, metaWindow])

  // Sidebar state: open by default on desktop, a collapsible overlay drawer on
  // narrow viewports (the filter panel collapses on mobile). Initialized lazily
  // from the media query so there's no mount-time state flip.
  const [narrow, setNarrow] = useState(() => window.matchMedia(SIDEBAR_MQ).matches)
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia(SIDEBAR_MQ).matches)
  useEffect(() => {
    const mq = window.matchMedia(SIDEBAR_MQ)
    const apply = () => {
      setNarrow(mq.matches)
      setSidebarOpen(!mq.matches)
    }
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const formatName = t(FORMATS.find((f) => f.code === format)!.i18nKey)
  const windowLabel = t(WINDOWS.find((w) => w.code === metaWindow)!.i18nKey)
  const maxPct = data.length > 0 ? data[0].sharePct : 100
  const freshness = lastUpdated ? relativeTimeFromNow(lastUpdated, new Date(), i18n.language) : ''

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={t('filters.toggle')}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          ≡
        </button>
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
      </header>

      {/* Body: sidebar + scrolling content */}
      <div className="app-body">
        <aside
          data-testid="sidebar"
          data-open={sidebarOpen}
          className={`sidebar${narrow ? ' sidebar--drawer' : ''}`}
        >
          <div className="sidebar-inner">
            <WindowSelector value={metaWindow} onChange={setWindow} />
          </div>
        </aside>

        <main className="app-main">
          <div className="app-content">
            {/* Format header */}
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
                data-testid="window-pill"
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
                {windowLabel}
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

            {/* Main */}
            <div style={{ marginTop: 'var(--sp-6)' }}>
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
                  {data.map((archetype) => {
                    const decks = decksByArchetype[archetype.name] ?? []
                    const expandable = decks.length > 0
                    const expanded = expandable && expandedName === archetype.name
                    return (
                      <ArchetypeCard
                        key={archetype.rank}
                        rank={archetype.rank}
                        name={archetype.name}
                        colors={archetype.colorIdentity}
                        sharePct={archetype.sharePct}
                        maxPct={maxPct}
                        expanded={expanded}
                        style={expanded ? { gridColumn: '1 / -1' } : undefined}
                        onClick={
                          expandable
                            ? () =>
                                setExpandedName((current) =>
                                  current === archetype.name ? null : archetype.name,
                                )
                            : undefined
                        }
                      >
                        <div
                          data-testid="deck-list"
                          style={{
                            borderTop: '1px solid var(--neon-border)',
                            background: 'var(--neon-tint-16)',
                            padding: 14,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 11,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 'var(--fs-2xs)',
                                fontWeight: 'var(--fw-bold)',
                                letterSpacing: 'var(--track-wide)',
                                textTransform: 'uppercase',
                                color: 'var(--neon-text-soft)',
                              }}
                            >
                              {t('decks.heading')}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 'var(--fs-2xs)',
                                color: 'var(--text-faint)',
                              }}
                            >
                              {t('decks.count', { count: decks.length })}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                              gap: 18,
                            }}
                          >
                            {decks.map((deck) => (
                              <DeckCard key={deck.sourceDeckId} deck={deck} onSelect={setSelectedDeck} />
                            ))}
                          </div>
                        </div>
                      </ArchetypeCard>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {selectedDeck && <DecklistModal deck={selectedDeck} onClose={() => setSelectedDeck(null)} />}
    </div>
  )
}

export default App
