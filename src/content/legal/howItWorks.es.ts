import type { Section } from './types'

export const howItWorksEs: Section[] = [
  {
    type: 'paragraph',
    text: 'MetaStack muestra qué mazos de Magic: The Gathering está jugando la gente en torneos reales, y qué tan seguido gana cada uno. Así es como funciona, en palabras simples.',
  },
  { type: 'heading', text: 'De dónde viene la información' },
  {
    type: 'paragraph',
    text: 'Todos los días, un pequeño programa (le decimos "el scraper") visita MTGTop8, un sitio que publica los resultados de torneos de Magic de todo el mundo — cosas que cualquiera ya puede ver, como "este mazo quedó en 3er lugar en este evento". El scraper lee esos resultados públicos y los guarda.',
  },
  {
    type: 'paragraph',
    text: 'El scraper también busca cada carta mencionada en esos mazos en Scryfall, una base de datos pública de información e imágenes de cartas de Magic, para poder mostrarte los nombres, el arte y los colores de maná.',
  },
  { type: 'heading', text: 'Qué hace MetaStack con esa información' },
  {
    type: 'paragraph',
    text: 'MetaStack toma todos esos resultados de torneos y cuenta cosas: cuántos mazos de cada tipo aparecieron, qué tan seguido ganó cada uno, qué cartas aparecen más. Ese conteo es lo que ves en el dashboard — es solo matemáticas hechas sobre datos públicos de torneos, nada más misterioso que eso.',
  },
  { type: 'heading', text: 'Qué sabemos sobre ti' },
  {
    type: 'paragraph',
    text: 'Nada, en realidad. MetaStack no tiene cuentas, inicios de sesión ni perfiles. No escribes nada, y no te pedimos tu nombre, correo ni ningún dato personal solo para usar el sitio. (Consulta nuestra Política de Privacidad para más detalles, incluyendo cosas como las analíticas del sitio.)',
  },
  { type: 'heading', text: 'Quién hizo esto' },
  { type: 'link', text: 'Hecho por DMM Studios', href: 'https://studiosdmm.com.mx/' },
  { type: 'heading', text: 'Créditos' },
  {
    type: 'paragraph',
    text: 'Imágenes y datos de cartas vía Scryfall. MetaStack es un proyecto de fans no oficial y no está producido ni respaldado por Wizards of the Coast — consulta el aviso en el pie de página para más detalles.',
  },
]
