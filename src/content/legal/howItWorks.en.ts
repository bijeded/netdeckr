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
      'Popular / Power — how the archetype cards are ordered. Popular, the default, puts the most-played archetypes first. Power orders them by tier and then by how well they perform, not by how often they are played, so a rarely played archetype that keeps winning can make the top 12.',
      'Top Creatures, Top Spells, Top Sideboard Cards, and Top New Cards — the individual cards played the most across the decks in view, ranked by Copies.',
      'Top New Cards — only cards printed in the two most recent main sets, reprints and nonbasic lands included, counting mainboard and sideboard copies together. Not shown in Pre-Modern, which receives no new sets.',
      'Avg — the average number of copies in the decks that play the card, rounded. 4x means those decks run a full playset.',
      'Copies — the total number of copies across every deck in view.',
      "Decks — the share of decks in view that play the card at least once (for Top Sideboard Cards, in the sideboard). Unlike Copies, it isn't inflated by decks that run four copies.",
      "Trend — how that share changed compared to the previous period of the same length, in percentage points. It's left blank when the previous period doesn't have enough decks to compare against, or when a single event is selected.",
    ],
  },
  { type: 'heading', text: 'The Analysis tab' },
  {
    type: 'paragraph',
    text: [
      'Open an archetype and choose Analysis → to see how that archetype is built and how it performs. The Analysis tab always covers the format\'s last 2 weeks and every event: the sidebar\'s time frame, event, event size, and tier filters don\'t change it.',
    ],
  },
  {
    type: 'list',
    items: [
      'Stock list — an average list for the archetype. Cards are ranked by how many of its decks play them, weighted so decks that finished deeper at bigger events count more. Each card is placed at the copy count those decks play most often, and the land count and deck size follow the typical deck.',
      'Power Score — the 0–100 performance score the Tier is based on. It grows the deeper the archetype\'s decks finish, counts bigger events more, and stays cautious when an archetype has only a few results.',
      'Share, Tier, Top 8 rate, Wins, Decks — the archetype\'s metagame share and tier over the 2 weeks, how often its decks reach the Top 8, how many events it won, and how many decks it has. Top 8 rate only counts events that publish a final ranking.',
      'Card types — the stock list\'s mainboard split into lands, creatures, planeswalkers, battles, artifacts, enchantments, instants, and sorceries. A card with two types, like an Artifact Creature, counts once, under the type listed first in that order.',
      'Arena wildcards — Standard and Pioneer only: how many mythic, rare, uncommon, and common wildcards it takes to build the stock list on MTG Arena, sideboard included and basic lands free. It\'s an approximation, based on each card\'s printed rarity, which can differ from its rarity on Arena.',
      'Small sample — shown when the archetype has fewer than 5 decks. The numbers still appear, but read them loosely.',
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
