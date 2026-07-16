import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LegalPage } from './LegalPage'
import type { Section } from '../content/legal/types'

describe('LegalPage', () => {
  it('renders the title as a heading', () => {
    render(<LegalPage title="How it works" sections={[]} />)
    expect(screen.getByRole('heading', { level: 1, name: 'How it works' })).toBeInTheDocument()
  })

  it('renders each section type', () => {
    const sections: Section[] = [
      { type: 'heading', text: 'A heading' },
      { type: 'paragraph', text: 'A paragraph' },
      { type: 'list', items: ['First', 'Second'] },
      { type: 'link', text: 'A link', href: 'https://example.com/' },
    ]
    render(<LegalPage title="Title" sections={sections} />)
    expect(screen.getByRole('heading', { level: 2, name: 'A heading' })).toBeInTheDocument()
    expect(screen.getByText('A paragraph')).toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'A link' })
    expect(link).toHaveAttribute('href', 'https://example.com/')
  })
})
