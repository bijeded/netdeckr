import type { Section } from './types'

export const howItWorksEn: Section[] = [
  {
    type: 'paragraph',
    text: [
      "Netdeckr shows what Magic: The Gathering decks people are actually playing in real tournaments, and how well each one performs. Here's how it works.",
    ],
  },
  { type: 'heading', text: 'Where the information comes from' },
  {
    type: 'paragraph',
    text: [
      'Twice a day, we visit MTGTop8, a site that publishes results from Magic tournaments around the world, and read those public results — things like which deck a player used and how it finished.',
    ],
  },
  {
    type: 'paragraph',
    text: [
      'We also look up each card mentioned in those decks on Scryfall, a public database of Magic card information and images, so we can show you card names, art, and mana colors.',
    ],
  },
  { type: 'heading', text: 'What Netdeckr does with it' },
  {
    type: 'paragraph',
    text: [
      "Netdeckr turns those results into a live picture of the metagame — which archetypes are being played, and how well they're actually performing. Here's what each part of the dashboard means:",
    ],
  },
  {
    type: 'list',
    items: [
      'Events, Archetypes, Decks — how many tournaments, distinct deck types, and total decklists are included for the selected format and time frame.',
      'Metagame share — the percentage of decks in view that belong to an archetype. This measures popularity, not strength.',
      'Share delta — how that share changed compared to the previous period of the same length (for example, this week versus last week).',
      "Tier (T1, T2, T3, or Rogue) — how well an archetype actually performs, based on how deep its decks tend to finish in tournaments, weighted so results from bigger events count for more. This is about performance, not popularity, so a heavily-played but underperforming archetype can rank below a smaller one that keeps winning.",
      "The arrow next to the tier — whether that archetype's recent performance is trending up, down, or holding steady compared to the previous stretch.",
      'Top Creatures, Top Spells, and Top Sideboard Cards — the individual cards played the most across the decks in view, ranked by total copies, with an average number of copies per deck for the two mainboard tables.',
    ],
  },
  { type: 'heading', text: 'What we know about you' },
  {
    type: 'paragraph',
    text: [
      "We don't collect anything about you to run Netdeckr. There are no accounts, logins, or profiles — you don't type anything in, and we never ask for your name, email, or any other personal information just to use the site. See our ",
      { text: 'Privacy Policy', internal: 'privacy' },
      ' for the full details, including analytics.',
    ],
  },
  { type: 'heading', text: 'Who made this' },
  {
    type: 'paragraph',
    text: [
      'Built by ',
      { text: 'DMM Studios', href: 'https://studiosdmm.com.mx/' },
      ' for ',
      { text: 'Stackeados', href: 'https://www.youtube.com/@stackeados' },
      ', a Mexican podcast about Magic: The Gathering in Spanish.',
    ],
  },
  { type: 'heading', text: 'Credits' },
  {
    type: 'paragraph',
    text: [
      'Card images and data via Scryfall. Netdeckr is an unofficial fan project and is not produced or endorsed by Wizards of the Coast.',
    ],
  },
]
