import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LegalPage } from './LegalPage'
import type { Section } from '../content/legal/types'

describe('LegalPage', () => {
  it('renders the title as a heading', () => {
    render(<LegalPage title="How it works" sections={[]} onNavigate={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'How it works' })).toBeInTheDocument()
  })

  it('renders heading, paragraph, list, and note sections', () => {
    const sections: Section[] = [
      { type: 'heading', text: 'A heading' },
      { type: 'paragraph', text: ['A paragraph'] },
      { type: 'list', items: ['First', 'Second'] },
      { type: 'note', text: 'A note' },
    ]
    render(<LegalPage title="Title" sections={sections} onNavigate={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'A heading' })).toBeInTheDocument()
    expect(screen.getByText('A paragraph')).toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('A note')).toBeInTheDocument()
  })

  it('renders an external link segment as a new-tab anchor', () => {
    const sections: Section[] = [
      { type: 'paragraph', text: ['Built by ', { text: 'DMM Studios', href: 'https://studiosdmm.com.mx/' }] },
    ]
    render(<LegalPage title="Title" sections={sections} onNavigate={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'DMM Studios' })
    expect(link).toHaveAttribute('href', 'https://studiosdmm.com.mx/')
    expect(link).toHaveAttribute('target', '_blank')
    // Only "DMM Studios" is the link, not the surrounding sentence.
    expect(screen.getByText(/Built by/)).toBeInTheDocument()
  })

  it('renders an internal link segment as a button that calls onNavigate', () => {
    const onNavigate = vi.fn()
    const sections: Section[] = [
      { type: 'paragraph', text: ['See our ', { text: 'Privacy Policy', internal: 'privacy' }, ' for details.'] },
    ]
    render(<LegalPage title="Title" sections={sections} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Privacy Policy' }))
    expect(onNavigate).toHaveBeenCalledWith('privacy')
  })
})
