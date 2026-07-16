import { Fragment } from 'react'
import type { Section, Segment } from '../content/legal/types'
import type { LegalPageCode } from '../hooks/useLegalPage'

interface LegalPageProps {
  title: string
  sections: Section[]
  onNavigate: (page: LegalPageCode) => void
}

function renderSegment(segment: Segment, key: number, onNavigate: (page: LegalPageCode) => void) {
  if (typeof segment === 'string') return <Fragment key={key}>{segment}</Fragment>
  if ('href' in segment) {
    return (
      <a key={key} href={segment.href} target="_blank" rel="noreferrer" className="legal-page-link">
        {segment.text}
      </a>
    )
  }
  return (
    <button
      key={key}
      type="button"
      className="legal-page-link-button"
      onClick={() => onNavigate(segment.internal)}
    >
      {segment.text}
    </button>
  )
}

/** Shared renderer for the How It Works and Privacy Policy pages: a title plus
 * a Section[] of heading/paragraph/list/note entries, styled with the app's
 * design tokens. Paragraph segments may be plain text, external links, or
 * internal links that navigate to another legal page via `onNavigate`. */
export function LegalPage({ title, sections, onNavigate }: LegalPageProps) {
  return (
    <div className="legal-page">
      <h1 className="legal-page-title">{title}</h1>
      {sections.map((section, index) => {
        switch (section.type) {
          case 'heading':
            return (
              <h2 key={index} className="legal-page-heading">
                {section.text}
              </h2>
            )
          case 'paragraph':
            return (
              <p key={index} className="legal-page-paragraph">
                {section.text.map((segment, segmentIndex) => renderSegment(segment, segmentIndex, onNavigate))}
              </p>
            )
          case 'list':
            return (
              <ul key={index} className="legal-page-list">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )
          case 'note':
            return (
              <p key={index} className="legal-page-note">
                {section.text}
              </p>
            )
        }
      })}
    </div>
  )
}
