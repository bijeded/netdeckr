import type { LegalPageCode } from '../../hooks/useLegalPage'

/** One run of paragraph text: plain text, an external link (opens in a new
 * tab), or an internal link that navigates to another legal page. */
export type Segment = string | { text: string; href: string } | { text: string; internal: LegalPageCode }

/** A block of long-form legal/educational page content. Authored per locale in
 * src/content/legal/*.en.ts / *.es.ts and rendered by the shared LegalPage
 * component — kept out of en.json/es.json since it's prose, not UI microcopy. */
export type Section =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: Segment[] }
  | { type: 'list'; items: string[] }
  | { type: 'note'; text: string }
