import type { Section } from './types'

export const privacyEs: Section[] = [
  {
    type: 'paragraph',
    text: 'Esta página explica qué información recopila MetaStack cuando visitas el sitio, y qué hacemos (y planeamos hacer) con ella.',
  },
  { type: 'heading', text: 'Sin cuentas, sin datos personales' },
  {
    type: 'paragraph',
    text: 'MetaStack no tiene cuentas de usuario, inicios de sesión ni perfiles. No recopilamos tu nombre, correo electrónico ni ningún otro dato personal solo para mostrarte el dashboard. La lectura de datos desde nuestra base de datos ocurre de forma anónima y es de solo lectura desde tu navegador — nunca se escribe nada en ella.',
  },
  { type: 'heading', text: 'Analíticas' },
  {
    type: 'paragraph',
    text: 'Usamos Vercel Analytics para entender, de forma agregada, cuánta gente visita MetaStack y qué páginas ve. No usa cookies y no te rastrea individualmente entre sitios — reporta conteos de uso anónimos y agregados, no un perfil ligado a ti.',
  },
  { type: 'heading', text: 'Registro de errores' },
  {
    type: 'paragraph',
    text: 'Usamos herramientas de registro de errores para notar y corregir fallas cuando algo se rompe en el sitio. Estas herramientas pueden registrar detalles técnicos sobre lo que falló (como en qué página y qué error ocurrió), pero no se usan para construir un perfil sobre quién eres.',
  },
  { type: 'heading', text: 'Publicidad' },
  {
    type: 'paragraph',
    text: 'MetaStack actualmente no muestra anuncios. Es posible que en el futuro agreguemos publicidad para ayudar a mantener el sitio; el proveedor de publicidad todavía no se ha decidido. Si eso llega a pasar, esta política se actualizará para explicar qué recopila ese proveedor y cómo puedes optar por no participar.',
  },
  { type: 'heading', text: 'Datos de torneos y cartas' },
  {
    type: 'paragraph',
    text: 'Los resultados de torneos de Magic: The Gathering y los datos de cartas que se muestran en MetaStack vienen de MTGTop8 y Scryfall. Esos datos son sobre torneos y cartas, no sobre ti — no son datos personales recopilados de quienes visitan el sitio.',
  },
  { type: 'heading', text: 'Enlaces externos' },
  {
    type: 'paragraph',
    text: 'MetaStack enlaza a sitios externos, como MTGTop8, Scryfall y DMM Studios. No somos responsables de las prácticas de privacidad de esos sitios una vez que sales de MetaStack.',
  },
  { type: 'heading', text: 'Cambios a esta política' },
  {
    type: 'paragraph',
    text: 'Si nuestras prácticas de datos cambian — por ejemplo, cuando elijamos un proveedor de registro de errores o de publicidad — actualizaremos esta página para reflejarlo.',
  },
]
