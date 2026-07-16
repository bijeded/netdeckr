/** A block of long-form legal/educational page content. Authored per locale in
 * src/content/legal/*.en.ts / *.es.ts and rendered by the shared LegalPage
 * component — kept out of en.json/es.json since it's prose, not UI microcopy. */
export type Section =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'link'; text: string; href: string }
