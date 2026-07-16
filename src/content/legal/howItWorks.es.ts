import type { Section } from './types'

export const howItWorksEs: Section[] = [
  {
    type: 'paragraph',
    text: [
      'Netdeckr muestra qué mazos de Magic: The Gathering está jugando la gente en torneos reales, y qué tan bien le va a cada uno. Así es como funciona.',
    ],
  },
  { type: 'heading', text: 'De dónde viene la información' },
  {
    type: 'paragraph',
    text: [
      'Dos veces al día visitamos MTGTop8, un sitio que publica resultados de torneos de Magic de todo el mundo, y leemos esos resultados públicos — cosas como qué mazo usó un jugador y en qué lugar quedó.',
    ],
  },
  {
    type: 'paragraph',
    text: [
      'También buscamos cada carta mencionada en esos mazos en Scryfall, una base de datos pública de información e imágenes de cartas de Magic, para poder mostrarte los nombres, el arte y los colores de maná.',
    ],
  },
  { type: 'heading', text: 'Qué hace Netdeckr con esa información' },
  {
    type: 'paragraph',
    text: [
      'Netdeckr convierte esos resultados en una imagen del metajuego en tiempo real — qué arquetipos se están jugando y qué tan bien les está yendo. Esto es lo que significa cada parte del dashboard:',
    ],
  },
  {
    type: 'list',
    items: [
      'Eventos, Arquetipos, Decks — cuántos torneos, tipos de mazo distintos y listas totales están incluidos para el formato y periodo seleccionados.',
      'Cuota de metajuego — el porcentaje de mazos en pantalla que pertenecen a ese arquetipo. Mide popularidad, no fuerza.',
      'Variación de cuota — cómo cambió esa cuota respecto al periodo anterior de la misma duración (por ejemplo, esta semana contra la semana pasada).',
      'Tier (T1, T2, T3 u Otros) — qué tan bien le va realmente a un arquetipo, según qué tan lejos suelen llegar sus mazos en los torneos, dando más peso a los resultados logrados en eventos más grandes. Esto mide rendimiento, no popularidad, así que un arquetipo muy jugado pero con bajo rendimiento puede quedar por debajo de uno más pequeño que sigue ganando.',
      'La flecha junto al tier — si el rendimiento reciente de ese arquetipo va en subida, en baja, o se mantiene estable respecto al periodo anterior.',
      'Top Criaturas, Top Hechizos y Top Cartas de Sideboard — las cartas individuales más jugadas entre los mazos en pantalla, ordenadas por copias totales, con un promedio de copias por mazo en las dos tablas de mainboard.',
    ],
  },
  { type: 'heading', text: 'Qué sabemos sobre ti' },
  {
    type: 'paragraph',
    text: [
      'No recopilamos nada sobre ti para operar Netdeckr. No hay cuentas, inicios de sesión ni perfiles — no escribes nada, y nunca te pedimos tu nombre, correo ni ningún otro dato personal solo para usar el sitio. Consulta nuestra ',
      { text: 'Política de Privacidad', internal: 'privacy' },
      ' para todos los detalles, incluyendo las analíticas.',
    ],
  },
  { type: 'heading', text: 'Quién hizo esto' },
  {
    type: 'paragraph',
    text: [
      'Hecho por ',
      { text: 'DMM Studios', href: 'https://studiosdmm.com.mx/' },
      ' para ',
      { text: 'Stackeados', href: 'https://www.youtube.com/@stackeados' },
      ', un podcast mexicano sobre Magic: The Gathering en español.',
    ],
  },
  { type: 'heading', text: 'Créditos' },
  {
    type: 'paragraph',
    text: [
      'Imágenes y datos de cartas vía Scryfall. Netdeckr es un proyecto de fans no oficial y no está producido ni respaldado por Wizards of the Coast.',
    ],
  },
]
