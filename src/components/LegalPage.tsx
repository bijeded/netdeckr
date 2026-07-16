import type { Section } from '../content/legal/types'

interface LegalPageProps {
  title: string
  sections: Section[]
}

/** Shared renderer for the How It Works and Privacy Policy pages: a title plus
 * a Section[] of heading/paragraph/list/link entries, styled with the app's
 * design tokens. */
export function LegalPage({ title, sections }: LegalPageProps) {
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
                {section.text}
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
          case 'link':
            return (
              <p key={index} className="legal-page-paragraph">
                <a href={section.href} target="_blank" rel="noreferrer" className="legal-page-link">
                  {section.text}
                </a>
              </p>
            )
        }
      })}
    </div>
  )
}
