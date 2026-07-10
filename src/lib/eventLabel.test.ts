import { describe, it, expect, afterEach } from 'vitest'
import { eventLabel } from './eventLabel'
import i18n from '../i18n'

const t = i18n.t.bind(i18n)

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('eventLabel', () => {
  it('shows name — date with the size appended when known', () => {
    const label = eventLabel(
      { name: 'Standard Challenge', eventDate: '2026-06-24', playerCount: 128 },
      'en',
      t,
    )
    expect(label).toBe('Standard Challenge — Jun 24 (128 players)')
  })

  it('uses the singular size form for one player', () => {
    const label = eventLabel({ name: 'RCQ', eventDate: '2026-06-24', playerCount: 1 }, 'en', t)
    expect(label).toBe('RCQ — Jun 24 (1 player)')
  })

  it('omits the size when player count is null', () => {
    const label = eventLabel({ name: 'PTQ', eventDate: '2026-06-24', playerCount: null }, 'en', t)
    expect(label).toBe('PTQ — Jun 24')
  })

  it('omits the size when player count is zero', () => {
    const label = eventLabel({ name: 'PTQ', eventDate: '2026-06-24', playerCount: 0 }, 'en', t)
    expect(label).toBe('PTQ — Jun 24')
  })

  it('shows just the name (no dash) when there is no date', () => {
    const label = eventLabel({ name: 'League', eventDate: '', playerCount: 32 }, 'en', t)
    expect(label).toBe('League (32 players)')
  })

  it('localizes the size text in Spanish (name and date order per locale)', async () => {
    await i18n.changeLanguage('es')
    const label = eventLabel(
      { name: 'Standard Challenge', eventDate: '2026-06-24', playerCount: 128 },
      'es',
      i18n.t.bind(i18n),
    )
    expect(label).toContain('Standard Challenge') // proper noun stays English
    expect(label).toContain('(128 jugadores)')
  })

  it('uses the Spanish singular form', async () => {
    await i18n.changeLanguage('es')
    const label = eventLabel({ name: 'RCQ', eventDate: '2026-06-24', playerCount: 1 }, 'es', i18n.t.bind(i18n))
    expect(label).toContain('(1 jugador)')
  })
})
