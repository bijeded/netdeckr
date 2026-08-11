// Per-format banlist access and the recency test behind the ban notice.
//
// The banlist is written by the pipeline from Scryfall's per-format `legalities`
// map (see scraper/scryfall.py); the browser only reads it. Legality is resolved
// server-side — `illegal_deck_ids` returns the deck ids to drop — because the
// grid never loads card names, and pulling the corpus's raw deck_cards rows to
// decide legality client-side is exactly what the `top_cards` RPC exists to avoid.
//
// This module is deliberately PURE — it must not import the Supabase client.
// `BanNotice` imports it, and a component that transitively pulls in
// `lib/supabase` blows up wherever the VITE_ env vars are unset (CI). The fetch
// itself lives in useMetagame.ts, beside the corpus fetch it runs with.

/** How long after a ban is first observed the notice keeps appearing. */
export const NOTICE_WINDOW_DAYS = 3

/** A banned card as stored: the canonical Scryfall name plus its first-seen date. */
export interface BannedCard {
  cardName: string
  /**
   * ISO date (YYYY-MM-DD) the pipeline first observed this ban, or null for a
   * **pre-existing** ban recorded when the format's list was first populated.
   * Null never announces — otherwise shipping this would fire a notice for every
   * ban in the format's history. See supabase_writer.refresh_banlist.
   */
  firstSeenAt: string | null
}

/** What one format's ban state contributes to a corpus load. */
export interface Banlist {
  /** Deck ids in the fetched corpus that hold a card banned in this format. */
  illegalDeckIds: Set<number>
  /** The format's banned cards, for the notice's recency test and its card names. */
  bannedCards: BannedCard[]
}

/** The no-bans result, also used as the degraded value when the fetch fails. */
export const EMPTY_BANLIST: Banlist = { illegalDeckIds: new Set(), bannedCards: [] }

/**
 * The cards whose ban was first observed within `NOTICE_WINDOW_DAYS` of `now` —
 * the ones the notice announces. A null `firstSeenAt` is historical and never
 * qualifies. Returned in stored order so the notice's card list is stable.
 *
 * The window is inclusive of the boundary day: a ban first seen exactly
 * `NOTICE_WINDOW_DAYS` ago still announces, so a notice is never cut short by
 * the hour of day the comparison happens to run at.
 */
export function recentlyBanned(
  cards: BannedCard[],
  now: Date = new Date(),
  days: number = NOTICE_WINDOW_DAYS,
): BannedCard[] {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return cards.filter((card) => card.firstSeenAt !== null && card.firstSeenAt >= cutoff)
}
