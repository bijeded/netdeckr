import { useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ArchetypeTab } from '../hooks/useArchetypeSelection'

interface ArchetypeTabToggleProps {
  tab: ArchetypeTab
  onChange: (tab: ArchetypeTab) => void
  /** id of the panel the tabs control, for aria-controls. */
  panelId: string
}

const TABS: ArchetypeTab[] = ['lists', 'analysis']

/**
 * The isolated archetype view's Lists / Analysis switch: a two-option segmented
 * control exposed as a tab list. Arrow keys move between the tabs (and select),
 * following the WAI-ARIA tabs pattern with automatic activation.
 */
export function ArchetypeTabToggle({ tab, onChange, panelId }: ArchetypeTabToggleProps) {
  const { t } = useTranslation()
  const refs = useRef<Record<ArchetypeTab, HTMLButtonElement | null>>({ lists: null, analysis: null })

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const index = TABS.indexOf(tab)
    const next =
      e.key === 'Home'
        ? TABS[0]
        : e.key === 'End'
          ? TABS[TABS.length - 1]
          : TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    onChange(next)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={t('decks.tabs.label')} className="tab-toggle">
      {TABS.map((option) => {
        const selected = option === tab
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[option] = el
            }}
            type="button"
            role="tab"
            id={`archetype-tab-${option}`}
            data-testid={`archetype-tab-${option}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className="tab-toggle-option"
            onClick={() => onChange(option)}
            onKeyDown={onKeyDown}
          >
            {t(`decks.tabs.${option}`)}
          </button>
        )
      })}
    </div>
  )
}
