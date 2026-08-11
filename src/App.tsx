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
import { sizeClassOf, type EventSizeClass } from './lib/eventSize'
import { FormatSwitcher } from './components/FormatSwitcher'
import { WindowSelector } from './components/WindowSelector'
import { EventSelector } from './components/EventSelector'
import { ArchetypeSelector } from './components/ArchetypeSelector'
import { ClearFiltersButton } from './components/ClearFiltersButton'
import { StatCard } from './components/StatCard'
import { BanNotice } from './components/BanNotice'
import { ArchetypeCard } from './components/ArchetypeCard'
import { DeckCard } from './components/DeckCard'
import { DecklistModal } from './components/DecklistModal'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { GRID_DISPLAY_CAP } from './lib/metagame'
import { TierSelector } from './components/TierSelector'
import { FilterModal, type FilterModalRow } from './components/FilterModal'
import { ManaPips } from './components/ManaPips'
import { TierBadge } from './components/TierBadge'
import { TIER_ORDER, type Tier } from './lib/tiers'
import type { DeckRow } from './lib/deckSelection'
import { Spinner } from './components/Spinner'
import { EmptyState } from './components/EmptyState'
import { useTrendingCards } from './hooks/useTrendingCards'
import { TopCardsTable } from './components/TopCardsTable'
import { useLegalPage } from './hooks/useLegalPage'
import { Footer } from './components/Footer'
import { LegalPage } from './components/LegalPage'
import { howItWorksEn } from './content/legal/howItWorks.en'
import { howItWorksEs } from './content/legal/howItWorks.es'
import { privacyEn } from './content/legal/privacy.en'
import { privacyEs } from './content/legal/privacy.es'

const SIDEBAR_MQ = '(max-width: 860px)'

function App() {
  const { t, i18n } = useTranslation()
  const { format, setFormat } = useFormatSelection()
  const { window: metaWindow, setWindow } = useWindowSelection()
  const { page, setPage } = useLegalPage()
  // The active legal page's content, in the current locale. Only meaningful
  // when `page` is non-null (guarded at the render site below).
  const legalSections =
    page === null ? null : i18n.language.startsWith('es')
      ? page === 'how-it-works'
        ? howItWorksEs
        : privacyEs
      : page === 'how-it-works'
        ? howItWorksEn
        : privacyEn
  const legalTitle = page === null ? '' : t(page === 'how-it-works' ? 'footer.howItWorks' : 'footer.privacy')

  // Filters (in-memory only — not persisted in the URL). null = "All".
  const [eventId, setEventId] = useState<number | null>(null)
  const [sizeClass, setSizeClass] = useState<EventSizeClass | null>(null)
  const [archetypeName, setArchetypeName] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier | null>(null)

  const {
    breakdown,
    decksByArchetype,
    fullDecksByArchetype = {},
    events = [],
    totals = { events: 0, archetypes: 0, decks: 0 },
    banState = { bannedCards: [], hiddenDecks: 0 },
    loading,
    error,
  } = useMetagame(format, metaWindow, { eventId, sizeClass })
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

  // The archetype and tier filters cannot disagree: isolating an archetype outside
  // the selected tier would be contradictory. Resolution favors the choice the user
  // just made, so neither entry point ever silently discards a selection — picking
  // an archetype drops a contradictory tier, and picking a tier drops a
  // contradictory archetype. Only a handler knows which filter was just chosen, so
  // the resolution lives there rather than in an effect.
  // Size and event narrow the same axis, so they can disagree the same way. The
  // event options are already narrowed by the active size class, which makes an
  // out-of-class event unpickable — the one case left is picking a size class
  // that excludes the event already selected. Resolve it here, favoring the
  // choice just made, exactly as archetype/tier do. The auto-reset effect above
  // would eventually reach the same result once the narrowed options arrive, but
  // it cannot tell "the user changed size" from "the format changed"; doing it
  // here clears the event in the same render, so no pass ever sees an event
  // selected outside the active size class.
  const selectSizeClass = (next: EventSizeClass | null) => {
    setSizeClass(next)
    if (next === null || eventId === null) return
    const selected = events.find((e) => e.id === eventId)
    if (selected && sizeClassOf(selected.playerCount) !== next) setEventId(null)
  }

  const tierOf = (name: string) => breakdown.find((a) => a.name === name)?.tier ?? null
  const selectArchetype = (name: string | null) => {
    setArchetypeName(name)
    if (name !== null && tier !== null && tierOf(name) !== null && tierOf(name) !== tier) setTier(null)
  }
  const selectTier = (next: Tier | null) => {
    setTier(next)
    if (next !== null && archetypeName !== null && tierOf(archetypeName) !== next) setArchetypeName(null)
  }
  // The one case no handler can catch: a breakdown reload reassigning tiers so that
  // two selections that were consistent when made now disagree. Drops the tier, as
  // it always has.
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
  // Caption form of the size class — deliberately shorter than the sidebar
  // control's self-describing entries ("Mid", not "Medium (32–95 players)"),
  // because the caption is a label for the view, not an explanation of the band.
  const SIZE_CAPTION_KEY: Record<EventSizeClass, string> = {
    small: 'filters.sizeCaptionSmall',
    medium: 'filters.sizeCaptionMedium',
    large: 'filters.sizeCaptionLarge',
    massive: 'filters.sizeCaptionMassive',
    unsized: 'filters.sizeCaptionUnsized',
  }
  const sizeLabel = sizeClass === null ? null : t(SIZE_CAPTION_KEY[sizeClass])
  // Size and event both describe *which events* are in view, so they form one
  // context string that the archetype and tier captions fold in as a unit via
  // `{{context}}` — otherwise each new filter of this kind would need its own
  // pairwise combination key, and the key count would grow with every filter.
  const contextLabel = [sizeLabel, eventLabel].filter(Boolean).join(' — ') || null

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
    // Trending aggregates server-side, so it cannot classify sizes itself: send
    // the ids of the events in the selected class. `events` is already narrowed
    // by the size filter, so this is exactly that set — and an empty array (a
    // class with no events) correctly yields empty tables rather than all of them.
    eventIds: sizeClass === null ? null : events.map((e) => e.id),
  })

  const visibleBreakdown = archetypeFiltered
    ? breakdown.filter((a) => a.name === archetypeName)
    : tierFiltered
      ? breakdown.filter((a) => a.tier === tier)
      : // A narrowed field — a single event, or one size class — is shown in
        // full (uncapped); only the default popularity view caps at the top N.
        contextLabel !== null
        ? breakdown
        : breakdown.slice(0, GRID_DISPLAY_CAP)
  // The grid caption sits above the freshness line and always names the view the
  // user is looking at. The fringe tier reuses the shared "Rogue"/"Otros" label.
  const tierLabel =
    tier === null ? '' : tier === 'Otros' ? t('tiers.rogue') : t('filters.tierLabel', { n: Number(tier.slice(1)) })
  // Caption resolution, in the same precedence as the grid itself: an isolated
  // archetype names itself, then a tier names the tier, then the event/size
  // context names itself, falling back to the "Top N most popular archetypes"
  // popularity caption. The first two fold in that context when it is present.
  const gridCaption = archetypeFiltered
    ? contextLabel !== null
      ? t('dashboard.archetypeContextCaption', { archetype: archetypeName, context: contextLabel })
      : archetypeName!
    : tierFiltered
      ? contextLabel !== null
        ? t('dashboard.tierContextCaption', { tier: tierLabel, context: contextLabel })
        : t('dashboard.tierCaption', { tier: tierLabel, count: visibleBreakdown.length })
      : contextLabel !== null
        ? contextLabel
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
  const filtersActive =
    eventId !== null || sizeClass !== null || archetypeName !== null || tier !== null
  // One handler behind both clear controls — the sidebar's and the main window's.
  const clearFilters = () => {
    setEventId(null)
    setSizeClass(null)
    setArchetypeName(null)
    setTier(null)
  }

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

  // Which StatCard's filter modal is open, if any.
  const [openFilter, setOpenFilter] = useState<'event' | 'archetype' | 'tier' | null>(null)
  const closeFilter = () => setOpenFilter(null)
  const decks = (n: number) => t('filters.deckCount', { count: n })
  const archetypes = (n: number) => t('filters.archetypeCount', { count: n })

  // A modal lists its own dimension in full — narrowed by the *other* active
  // filters, never by its own — so the current selection can always be changed or
  // cleared. That is why a modal's row figures need not sum to the number on its
  // card while its own filter is active. `events` is collected before the event
  // filter, and `breakdown`/`fullDecksByArchetype` are event-narrowed but carry
  // every archetype and tier, so each list is already the right corpus.
  // `totals` is narrowed by the event filter, so the Events modal's "All" row takes
  // the window total from the (unfiltered) event options instead.
  const windowDecks = events.reduce((n, event) => n + event.deckCount, 0)
  const eventRows: FilterModalRow<number>[] = [
    { key: 'all', value: null, content: t('filters.allEvents'), meta: decks(windowDecks) },
    ...events.map((event) => ({
      key: String(event.id),
      value: event.id,
      content: buildEventLabel(event, i18n.language, t),
      meta: decks(event.deckCount),
    })),
  ]
  const archetypeRows: FilterModalRow<string>[] = [
    // No figure on the "All" row: the rows below carry metagame share, and the
    // share of every archetype together is not a number worth printing.
    { key: 'all', value: null, content: t('filters.allArchetypes') },
    ...breakdown.map((archetype) => ({
      key: archetype.name,
      value: archetype.name,
      content: (
        <>
          <ManaPips colors={archetype.colorIdentity} size={11} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {archetype.name}
          </span>
        </>
      ),
      // Its own column, so the badges line up down the list rather than sitting
      // wherever each archetype's name happens to end.
      aside: <TierBadge tier={archetype.tier} />,
      meta: `${archetype.sharePct.toFixed(1)}%`,
    })),
  ]
  // The only rows that account for themselves in two units: a tier's decks are
  // its share of the Decks card that opened this modal, while its archetype
  // count is what picking it actually puts on the grid (one card per archetype,
  // not per deck). Each unit takes its own column so the figures line up.
  const tierRows: FilterModalRow<Tier>[] = [
    {
      key: 'all',
      value: null,
      content: t('filters.allTiers'),
      metaSecondary: archetypes(breakdown.length),
      meta: decks(totals.decks),
    },
    ...TIER_ORDER.map((each) => {
      const inTier = breakdown.filter((a) => a.tier === each)
      return {
        key: each,
        value: each,
        content: (
          <>
            <TierBadge tier={each} />
            {/* The fringe tier's badge already reads "Rogue"/"Otros", so naming it
                again would only repeat the word. */}
            {each !== 'Otros' && <span>{t('filters.tierLabel', { n: Number(each.slice(1)) })}</span>}
          </>
        ),
        metaSecondary: archetypes(inTier.length),
        meta: decks(inTier.reduce((n, a) => n + (fullDecksByArchetype[a.name]?.length ?? 0), 0)),
      }
    }),
  ]

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        {page === null && (
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={t('filters.toggle')}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ≡
          </button>
        )}
        <button
          type="button"
          onClick={() => setPage(null)}
          aria-label={t('app.home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-3)',
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            font: 'inherit',
            color: 'inherit',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
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
        </button>
        <div className="topbar-formats">
          <FormatSwitcher value={format} onChange={setFormat} />
        </div>
      </header>

      {/* Body: sidebar + scrolling content */}
      <div className="app-body">
        {page === null && (
          <aside
            data-testid="sidebar"
            data-open={sidebarOpen}
            className={`sidebar${narrow ? ' sidebar--drawer' : ''}`}
          >
            <div className="sidebar-inner">
              <WindowSelector value={metaWindow} onChange={setWindow} />
              <EventSelector
                value={eventId}
                events={events}
                onChange={setEventId}
                sizeClass={sizeClass}
                onSizeClassChange={selectSizeClass}
              />
              <ArchetypeSelector
                value={archetypeName}
                archetypes={breakdown.map((a) => a.name)}
                onChange={selectArchetype}
              />
              <TierSelector value={tier} onChange={selectTier} />
              <ClearFiltersButton disabled={!filtersActive} onClear={clearFilters} />
            </div>
          </aside>
        )}

        <main className="app-main">
          <div className="app-content">
            {page !== null ? (
              <LegalPage
                title={legalTitle}
                sections={legalSections ?? []}
                onNavigate={setPage}
                onBack={() => setPage(null)}
              />
            ) : (
              <>
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
              {/* Each card opens the filter that breaks its number down: Events →
                  the event filter, Archetypes → the archetype filter, Decks →
                  the tier filter (730 decks grouped, rather than listed). */}
              <div data-testid="stat-strip" className="stat-strip">
                <StatCard
                  value={stat(stripTotals.events)}
                  label={t('stats.events')}
                  onOpen={() => setOpenFilter('event')}
                  open={openFilter === 'event'}
                />
                <StatCard
                  value={stat(stripTotals.archetypes)}
                  label={t('stats.archetypes')}
                  onOpen={() => setOpenFilter('archetype')}
                  open={openFilter === 'archetype'}
                />
                <StatCard
                  value={stat(stripTotals.decks)}
                  label={t('stats.decks')}
                  onOpen={() => setOpenFilter('tier')}
                  open={openFilter === 'tier'}
                />
              </div>
            </div>
            {/* Caption row: caption + freshness on the left, Reset right-aligned
                against the block on both layouts. */}
            <div className="caption-row">
              <div>
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
              </div>
              {/* Always rendered, disabled when idle: appearing and disappearing
                  would resize this row and shove the grid on every filter change. */}
              <button
                type="button"
                data-testid="reset-filters"
                className="reset-filters"
                disabled={!filtersActive}
                onClick={clearFilters}
              >
                {t('filters.reset')}
              </button>
            </div>

            {/* Main */}
            <div style={{ marginTop: 'var(--sp-6)' }}>
              {/* Above the grid, below the stat strip: it explains the numbers,
                  so it has to be read before them. Renders nothing unless this
                  format has a ban detected in the last few days. Shown even while
                  the grid is empty — an empty grid after a ban is exactly the
                  case that most needs explaining. */}
              <BanNotice
                formatCode={format}
                bannedCards={banState.bannedCards}
                hiddenDecks={banState.hiddenDecks}
              />
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8)' }}>
                  <Spinner label={t('dashboard.loading')} />
                </div>
              ) : error || gridIsEmpty ? (
                <EmptyState message={emptyMessage} />
              ) : (
                <div
                  data-testid="archetype-grid"
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
              </>
            )}
          </div>
          <Footer onNavigate={setPage} />
        </main>
      </div>

      {selectedDeck && <DecklistModal deck={selectedDeck} format={format} onClose={() => setSelectedDeck(null)} />}
      {openFilter === 'event' && (
        <FilterModal
          title={t('filters.event')}
          rows={eventRows}
          value={eventId}
          onSelect={(next) => {
            setEventId(next)
            closeFilter()
          }}
          onClose={closeFilter}
        />
      )}
      {openFilter === 'archetype' && (
        <FilterModal
          title={t('filters.archetype')}
          rows={archetypeRows}
          value={archetypeName}
          onSelect={(next) => {
            selectArchetype(next)
            closeFilter()
          }}
          onClose={closeFilter}
        />
      )}
      {openFilter === 'tier' && (
        <FilterModal
          title={t('filters.tiers')}
          rows={tierRows}
          value={tier}
          onSelect={(next) => {
            selectTier(next)
            closeFilter()
          }}
          onClose={closeFilter}
        />
      )}
      <SpeedInsights />
      <Analytics />
    </div>
  )
}

export default App
