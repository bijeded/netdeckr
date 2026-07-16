import { describe, it, expect } from 'vitest'
import { howItWorksEn } from './howItWorks.en'
import { howItWorksEs } from './howItWorks.es'
import { privacyEn } from './privacy.en'
import { privacyEs } from './privacy.es'
import type { Section } from './types'

/** The sequence of section types, ignoring text — structural parity, not translation parity. */
function typeSequence(sections: Section[]): string[] {
  return sections.map((s) => s.type)
}

describe('legal content parity', () => {
  it('How It Works: en and es have the same section-type sequence', () => {
    expect(typeSequence(howItWorksEs)).toEqual(typeSequence(howItWorksEn))
  })

  it('Privacy Policy: en and es have the same section-type sequence', () => {
    expect(typeSequence(privacyEs)).toEqual(typeSequence(privacyEn))
  })
})
