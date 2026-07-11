import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormatSelection } from './hooks/useFormatSelection'
import { useWindowSelection } from './hooks/useWindowSelection'
import { useMetagame, type MetagameTotals } from './hooks/useMetagame'
import { useLastUpdated } from './hooks/useLastUpdated'
import { FORMATS } from './lib/formats'
import { WINDOWS } from './lib/windows'
import { relativeTimeFromNow } from './lib/relativeTime'
import { eventLabel as buildEventLabel } from './lib/eventLabel'
import { FormatSwitcher } from './components/FormatSwitcher'
import { WindowSelector } from './components/WindowSelector'
import { EventSelector } from './components/EventSelector'
import { ArchetypeSelector } from './components/ArchetypeSelector'
import { ClearFiltersButton } from './components/ClearFiltersButton'
import { StatCard } from './components/StatCard'
import { ArchetypeCard } from './components/ArchetypeCard'
import { DeckCard } from './components/DeckCard'
import { DecklistModal } from './components/DecklistModal'
import { GRID_DISPLAY_CAP } from './lib/metagame'
import { TierSelector } from './components/TierSelector'
import type { Tier } from './lib/tiers'
import type { DeckRow } from './lib/deckSelection'
import { Spinner } from './components/Spinner'
import { EmptyState } from './components/EmptyState'
import { useTrendingCards } from './hooks/useTrendingCards'
import { TopCardsTable } from './components/TopCardsTable'

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

  // Filters (in-memory only — not persisted in the URL). null = "All".
  const [eventId, setEventId] = useState<number | null>(null)
  const [archetypeName, setArchetypeName] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier | null>(null)

  const {
    breakdown,
    decksByArchetype,
    fullDecksByArchetype = {},
    events = [],
    totals = { events: 0, archetypes: 0, decks: 0 },
    loading,
    error,
  } = useMetagame(format, metaWindow, { eventId })
  const lastUpdated = useLastUpdated(format)

  // Which archetype card is expanded to show its decklists. Collapses whenever the
  // format or window changes (the decks it showed no longer apply).
  const [expandedName, setExpandedName] = useState<string | null>(null)
  // The deck whose full decklist modal is open, if any.
  const [selectedDeck, setSelectedDeck] = useState<DeckRow | null>(null)
  useEffect(() => {
    setExpandedName(null)
    setSelectedDeck(null)
  }, [format, metaWindow])

  // Filters are format-specific; reset to defaults when the format changes.
  useEffect(() => {
    setEventId(null)
    setArchetypeName(null)
    setTier(null)
  }, [format])

  // Auto-reset a filter whose selection is no longer valid after a format/window/
  // other-filter change (silent — no stale selection). The Tier filter's options
  // are static, so it is never auto-reset for absence (it shows an empty state);
  // the only tier reset is the archetype-precedence rule below.
  useEffect(() => {
    if (eventId !== null && !events.some((e) => e.id === eventId)) setEventId(null)
  }, [events, eventId])
  useEffect(() => {
    if (archetypeName !== null && !breakdown.some((a) => a.name === archetypeName)) {
      setArchetypeName(null)
    }
  }, [breakdown, archetypeName])

  // Archetype filter wins over the Tier filter: isolating an archetype outside the
  // selected tier would be contradictory, so silently drop the tier in that case.
  useEffect(() => {
    if (archetypeName !== null && tier !== null) {
      const selected = breakdown.find((a) => a.name === archetypeName)
      if (selected && selected.tier !== tier) setTier(null)
    }
  }, [archetypeName, tier, breakdown])

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
  const maxPct = breakdown.length > 0 ? breakdown[0].sharePct : 100
  const freshness = lastUpdated ? relativeTimeFromNow(lastUpdated, new Date(), i18n.language) : ''

  // Grid mode precedence: an isolated archetype (one card) beats the Tier filter
  // (all of a tier's cards, uncapped) beats the default popularity view (top N by
  // share). The full corpus stays reachable via the StatCard total and the filters.
  const archetypeFiltered = archetypeName !== null
  const tierFiltered = !archetypeFiltered && tier !== null
  // The selected event's label (name + abbreviated date + size when known),
  // reused for the caption; null when no event is selected. Built by the shared
  // helper so the caption and the Event-filter dropdown never diverge.
  const selectedEvent = eventId !== null ? (events.find((e) => e.id === eventId) ?? null) : null
  const eventLabel = selectedEvent ? buildEventLabel(selectedEvent, i18n.language, t) : null

  // Trending tables mirror the active slice: an isolated archetype narrows to that
  // one, a tier to all of its (uncapped) archetypes, otherwise the whole field
  // (null). The event filter is passed through to narrow the slice to that event.
  const trendingArchetypeNames = archetypeFiltered
    ? [archetypeName!]
    : tierFiltered
      ? breakdown.filter((a) => a.tier === tier).map((a) => a.name)
      : null
  const {
    creatures,
    spells,
    sideboard,
    loading: trendingLoading,
  } = useTrendingCards(format, metaWindow, {
    archetypeNames: trendingArchetypeNames,
    eventId,
  })

  const visibleBreakdown = archetypeFiltered
    ? breakdown.filter((a) => a.name === archetypeName)
    : tierFiltered
      ? breakdown.filter((a) => a.tier === tier)
      : // A selected event's field is shown in full (uncapped); the default
        // popularity view still caps at the top N by share.
        eventLabel !== null
        ? breakdown
        : breakdown.slice(0, GRID_DISPLAY_CAP)
  // The grid caption sits above the freshness line. In the popularity view it
  // reads "Top N most popular archetypes"; under a tier filter it names the tier
  // instead. It is hidden only while a single archetype is isolated (one card is
  // not a listing). The fringe tier reuses the shared "Rogue"/"Otros" label.
  const tierLabel =
    tier === null ? '' : tier === 'Otros' ? t('tiers.rogue') : t('filters.tierLabel', { n: Number(tier.slice(1)) })
  // Caption resolution: under a tier filter it names the tier (folding in the
  // event name when an event is also selected); otherwise a selected event names
  // itself, falling back to the "Top N most popular archetypes" popularity caption.
  const showGridCaption = !archetypeFiltered
  const gridCaption = tierFiltered
    ? eventLabel !== null
      ? t('dashboard.tierEventCaption', { tier: tierLabel, event: eventLabel })
      : t('dashboard.tierCaption', { tier: tierLabel, count: visibleBreakdown.length })
    : eventLabel !== null
      ? eventLabel
      : t('dashboard.topCaption', { count: visibleBreakdown.length })
  // The isolated archetype auto-expands its full (uncapped) deck list; with no
  // matching decks under the combined filters, fall through to the empty state.
  const isolatedDecks = archetypeFiltered ? (fullDecksByArchetype[archetypeName] ?? []) : []
  const noArchetypeResults = archetypeFiltered && isolatedDecks.length === 0
  // A selected tier that matches no archetypes under the combined filters is an
  // empty state (the tier options are static, so it is not auto-reset).
  const noTierResults = tierFiltered && visibleBreakdown.length === 0
  const gridIsEmpty = visibleBreakdown.length === 0 || noArchetypeResults
  const emptyMessage =
    noArchetypeResults || noTierResults ? t('filters.noResults') : t('dashboard.empty')
  const filtersActive = eventId !== null || archetypeName !== null || tier !== null

  // Header StatCard strip: the hook's totals reflect the format/window/event
  // corpus but not the client-side archetype/tier display filters, so override the
  // strip from the displayed archetypes' decks when one of those filters is active.
  // DeckRow carries no event id, so distinct events are keyed by name+date (a safe
  // proxy within one format/window).
  const totalsFromDecks = (decks: DeckRow[], archetypes: number): MetagameTotals => ({
    events: new Set(decks.map((d) => `${d.eventName} ${d.eventDate}`)).size,
    archetypes,
    decks: decks.length,
  })
  const tierDecks = tierFiltered
    ? visibleBreakdown.flatMap((a) => fullDecksByArchetype[a.name] ?? [])
    : []
  const stripTotals = archetypeFiltered
    ? totalsFromDecks(isolatedDecks, 1)
    : tierFiltered
      ? totalsFromDecks(tierDecks, visibleBreakdown.length)
      : totals
  const stat = (n: number) => n.toLocaleString(i18n.language)

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
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--fw-heavy)',
                fontSize: 'var(--fs-lg)',
              }}
            >
              {t('app.title')}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--fs-3xs)',
                letterSpacing: 'var(--track-wide)',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                marginTop: 2,
              }}
            >
              {t('app.subtitle')}
            </span>
          </span>
        </div>
        <div className="topbar-formats">
          <FormatSwitcher value={format} onChange={setFormat} />
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
            <EventSelector value={eventId} events={events} onChange={setEventId} />
            <ArchetypeSelector
              value={archetypeName}
              archetypes={breakdown.map((a) => a.name)}
              onChange={setArchetypeName}
            />
            <TierSelector value={tier} onChange={setTier} />
            <ClearFiltersButton
              disabled={!filtersActive}
              onClear={() => {
                setEventId(null)
                setArchetypeName(null)
                setTier(null)
              }}
            />
            <div className="sidebar-language">
              <LanguageToggle />
            </div>
          </div>
        </aside>

        <main className="app-main">
          <div className="app-content">
            {/* Format header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
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
              {/* StatCard strip: right-aligned on the title row (title stays left). */}
              <div data-testid="stat-strip" className="stat-strip">
                <StatCard value={stat(stripTotals.events)} label={t('stats.events')} />
                <StatCard value={stat(stripTotals.archetypes)} label={t('stats.archetypes')} />
                <StatCard value={stat(stripTotals.decks)} label={t('stats.decks')} />
              </div>
            </div>
            {showGridCaption && (
              <div
                data-testid="grid-caption"
                style={{
                  marginTop: 'var(--sp-2)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 'var(--fw-bold)',
                  letterSpacing: 'var(--track-wide)',
                  textTransform: 'uppercase',
                  color: 'var(--neon-text-soft)',
                }}
              >
                {gridCaption}
              </div>
            )}
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
              ) : error || gridIsEmpty ? (
                <EmptyState message={emptyMessage} />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))',
                    gap: 'var(--sp-5)',
                  }}
                >
                  {visibleBreakdown.map((archetype) => {
                    const isolated = archetypeFiltered && archetype.name === archetypeName
                    // Use the uncapped list when the card is isolated (archetype
                    // filter) or the corpus is already narrowed to one event — in
                    // both cases the scope is small enough to show every deck. The
                    // capped display set is only for the broad, multi-event view.
                    const decks =
                      isolated || eventId !== null
                        ? (fullDecksByArchetype[archetype.name] ?? [])
                        : (decksByArchetype[archetype.name] ?? [])
                    const expandable = decks.length > 0
                    const expanded = isolated ? true : expandable && expandedName === archetype.name
                    return (
                      <ArchetypeCard
                        key={archetype.rank}
                        rank={archetype.rank}
                        name={archetype.name}
                        colors={archetype.colorIdentity}
                        sharePct={archetype.sharePct}
                        wins={archetype.wins}
                        tier={archetype.tier}
                        trend={archetype.trend}
                        shareDelta={archetype.shareDelta}
                        artImageUrl={archetype.artImageUrl}
                        artCropUrl={archetype.artCropUrl}
                        maxPct={maxPct}
                        expanded={expanded}
                        style={expanded ? { gridColumn: '1 / -1' } : undefined}
                        onClick={
                          expandable && !isolated
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

            {/* Trending cards: three tables 1/3 each on desktop (Creatures, Spells,
                Sideboard), stacked below ~900px. Independent of the grid's data;
                only its own load. */}
            {!trendingLoading && (
              <div className="trending-layout">
                <TopCardsTable
                  title={t('trending.creaturesTitle')}
                  cards={creatures}
                  showAvg
                  emptyMessage={t('trending.empty')}
                />
                <TopCardsTable
                  title={t('trending.spellsTitle')}
                  cards={spells}
                  showAvg
                  emptyMessage={t('trending.empty')}
                />
                <TopCardsTable
                  title={t('trending.sideboardTitle')}
                  cards={sideboard}
                  emptyMessage={t('trending.sideboardEmpty')}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedDeck && <DecklistModal deck={selectedDeck} format={format} onClose={() => setSelectedDeck(null)} />}
    </div>
  )
}

export default App
