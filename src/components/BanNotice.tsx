import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { recentlyBanned, NOTICE_WINDOW_DAYS, type BannedCard } from '../lib/banlist'
import { FORMATS, type FormatCode } from '../lib/formats'

/**
 * Session-scoped dismissal key. Deliberately NOT localStorage: a permanent
 * dismissal risks the user hiding this on day zero and never learning why their
 * archetype vanished, while a notice that ignores dismissal for three days
 * nags. Session scope yields immediately within a visit and returns on the next.
 *
 * The key carries the ban's date as well as the format, so a *second* ban
 * landing later in the same session announces itself instead of inheriting the
 * dismissal of the first.
 */
function dismissalKey(formatCode: FormatCode, firstSeenAt: string): string {
  return `netdeckr:ban-notice:${formatCode}:${firstSeenAt}`
}

function readDismissed(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1'
  } catch {
    // Private-mode / blocked storage: show the notice rather than hide it.
    return false
  }
}

interface BanNoticeProps {
  formatCode: FormatCode
  /** The format's banned cards; only recently-detected ones announce. */
  bannedCards: BannedCard[]
  /** Decks the legality filter removed from the currently displayed corpus. */
  hiddenDecks: number
}

/**
 * Explains a recent ban: which cards, how many decks are hidden from this view,
 * and that the figures below were calculated without them — so an archetype
 * disappearing from the grid reads as a ban rather than a bug.
 *
 * Renders nothing when the format has no ban detected within
 * `NOTICE_WINDOW_DAYS`, or when the notice has been dismissed this session.
 * Expiry is evaluated FIRST, so a dismissal can never resurrect an expired
 * notice.
 */
export function BanNotice({ formatCode, bannedCards, hiddenDecks }: BanNoticeProps) {
  const { t } = useTranslation()
  const recent = recentlyBanned(bannedCards)
  // The most recent detection dates the notice and keys its dismissal.
  const latest = recent.reduce<string>(
    (max, card) => (card.firstSeenAt! > max ? card.firstSeenAt! : max),
    '',
  )
  const [dismissed, setDismissed] = useState(() =>
    latest === '' ? false : readDismissed(dismissalKey(formatCode, latest)),
  )

  // Expiry first: outside the window there is nothing to show, dismissed or not.
  if (recent.length === 0) return null
  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(dismissalKey(formatCode, latest), '1')
    } catch {
      // Storage unavailable — the notice still hides for this render.
    }
  }

  const formatEntry = FORMATS.find((f) => f.code === formatCode)
  const formatName = formatEntry ? t(formatEntry.i18nKey) : formatCode
  // MTG proper nouns stay in English in both locales, so the card names are
  // joined verbatim rather than translated.
  const cards = recent.map((card) => card.cardName).join(', ')

  return (
    <section
      role="status"
      data-testid="ban-notice"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--sp-4)',
        // The amber "flat" semantic, not the red "down" one: a ban is notable
        // news, not an error in the dashboard.
        background: 'var(--flat-tint)',
        border: '1px solid var(--flat-border)',
        borderRadius: 'var(--r-2xl)',
        padding: 'var(--sp-4) var(--sp-5)',
        marginBottom: 'var(--sp-5)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-base)',
            color: 'var(--flat-on-dark)',
          }}
        >
          {t('banNotice.title', { format: formatName })}
        </h2>
        <p
          style={{
            margin: 'var(--sp-2) 0 0',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--fs-sm)',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          {t('banNotice.cards', { cards })}{' '}
          {hiddenDecks > 0
            ? t('banNotice.hidden', { count: hiddenDecks })
            : t('banNotice.hiddenNone')}{' '}
          {t('banNotice.effect')}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('banNotice.dismiss')}
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 'var(--fs-base)',
          lineHeight: 1,
          padding: 'var(--sp-1)',
        }}
      >
        ✕
      </button>
    </section>
  )
}

export { NOTICE_WINDOW_DAYS }
