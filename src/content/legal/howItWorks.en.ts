import type { Section } from './types'

export const howItWorksEn: Section[] = [
  {
    type: 'paragraph',
    text: 'MetaStack shows what Magic: The Gathering decks people are actually playing in real tournaments, and how often each one wins. Here is how it works, in plain terms.',
  },
  { type: 'heading', text: 'Where the information comes from' },
  {
    type: 'paragraph',
    text: 'Every day, a small program (we call it "the scraper") visits MTGTop8, a website that publishes results from Magic tournaments all over the world — things anyone can already see, like "this deck came in 3rd place at this event." The scraper reads those public results and saves them.',
  },
  {
    type: 'paragraph',
    text: 'The scraper also looks up each card mentioned in those decks on Scryfall, a public database of Magic card information and images, so we can show you card names, art, and mana colors.',
  },
  { type: 'heading', text: 'What MetaStack does with it' },
  {
    type: 'paragraph',
    text: 'MetaStack takes all of those tournament results and counts things: how many decks of each type showed up, how often each one won, which cards appear the most. That counting is what you see on the dashboard — it is just math done on public tournament data, nothing more mysterious than that.',
  },
  { type: 'heading', text: 'What we know about you' },
  {
    type: 'paragraph',
    text: 'Nothing, really. MetaStack does not have accounts, logins, or profiles. You do not type anything in, and we do not ask for your name, email, or any personal information just to use the site. (See our Privacy Policy for the full details, including things like site analytics.)',
  },
  { type: 'heading', text: 'Who made this' },
  { type: 'link', text: 'Built by DMM Studios', href: 'https://studiosdmm.com.mx/' },
  { type: 'heading', text: 'Credits' },
  {
    type: 'paragraph',
    text: 'Card images and data via Scryfall. MetaStack is an unofficial fan project and is not produced or endorsed by Wizards of the Coast — see the notice in the footer for details.',
  },
]
