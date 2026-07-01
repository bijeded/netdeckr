# MTG Standard Metagame Dashboard — Contexto del proyecto

## Objetivo general

Dashboard web para seguimiento del metagame de Magic: The Gathering Standard, con datos
de torneos reales. El proyecto se construye en fases, comenzando por un PoC en artifact.

---

## Fuentes de datos confirmadas

### MTGTop8 (fuente principal)

- Sin Cloudflare ni protección antibot — accesible con requests + BeautifulSoup
- URL base: `http://mtgtop8.com`


| Página              | URL pattern                      | Datos                                           |
| ------------------- | -------------------------------- | ----------------------------------------------- |
| Meta snapshot       | `/format?f=ST&meta=50`           | Archetypes + % de representación (Last 2 Weeks) |
| Meta anterior       | `/format?f=ST&meta=326`          | Snapshot Last 5 Days (para trending)            |
| Últimos eventos     | `/format?f=ST`                   | Lista de últimos 20 eventos                     |
| Detalle de evento   | `/event?e={id}&f=ST`             | Top 16 con jugador, archetype, lugar            |
| Decklist individual | `/event?e={id}&d={did}&f=ST`     | Main deck + sideboard                           |
| Archetype           | `/archetype?a={id}&meta=50&f=ST` | Todos los mazos del archetype                   |
| Top cards           | `/topcards?f=ST&meta=50`         | Cartas más jugadas con %                        |


Parámetro `meta` controla ventana temporal:

- `meta=50` → Last 2 Weeks
- `meta=326` → Last 5 Days
- `meta=52` → Last 2 Months
- `meta=46` → Large Events Only (Last 2 Months)
- `meta=285` → MTGO Only (Last 2 Months)



### Scryfall (imágenes y datos de cartas)

- API gratuita, sin autenticación, excelente documentación
- Bulk data: `https://api.scryfall.com/bulk-data` → descarga daily de todas las cartas (~50MB JSON)
- Card image endpoint: `https://api.scryfall.com/cards/named?exact={card_name}`
- Usar bulk data para producción, API individual solo para fallback



### Descartadas

- MTGO.com/decklists: páginas individuales requieren JS. Redundante, MTGTop8 ya agrega estos datos.
- MTGGoldfish: Cloudflare
- MTG Melee: Cloudflare
- MetaMages (metamages.com): excelente plataforma con matchup data y winrates reales,
pero sin API pública. No integrable.

---



## Features del producto final


| Feature                            | Fuente de datos      | Notas                                          |
| ---------------------------------- | -------------------- | ---------------------------------------------- |
| Snapshot del meta (archetypes + %) | MTGTop8 `/format`    | Dato directo en HTML                           |
| Clasificación Tier automática      | Calculado            | T1 ≥10%, T2 5-9.9%, T3 1-4.9%, Otros <1%       |
| Top 8/16 de torneos recientes      | MTGTop8 `/event`     | Con fecha, jugador, lugar, archetype           |
| Filtro por tipo de torneo          | MTGTop8              | MTGO Challenge, Regional, Showdown, etc.       |
| Vista de decklist con imágenes     | MTGTop8 + Scryfall   | Cartas de scraping, imágenes de Scryfall       |
| Trending cards semana a semana     | MTGTop8 `/topcards`  | Comparar `meta=326` vs `meta=50`               |
| Comparador de listas               | MTGTop8 decklists    | Diff de dos mazos del mismo archetype          |
| Alertas de archetype emergente     | Calculado            | Aparece en snapshot actual pero no en anterior |
| Matchup matrix                     | ❌ Descartado del MVP | No hay fuente confiable sin API privada        |


---



## Stack técnico


| Capa            | Tech                                 | Notas                                               |
| --------------- | ------------------------------------ | --------------------------------------------------- |
| Frontend        | React + Vite                         | Desplegado en Vercel                                |
| Visualizaciones | Recharts                             | Charts de representación y trending                 |
| Scraper         | Python + BeautifulSoup4 + requests   | Sin necesidad de Playwright                         |
| Pipeline        | GitHub Actions (cron diario 8am UTC) |                                                     |
| Base de datos   | Supabase (PostgreSQL)                | Row Level Security solo lectura para datos públicos |
| Card data       | Scryfall bulk download               | Una vez al día                                      |
| Hosting         | Vercel                               | Ya configurado con CNAME en Ionos                   |


---



## Esquema de base de datos (Supabase)

```sql
events        (id, mtgtop8_id, name, type, date, player_count, source_url)
archetypes    (id, mtgtop8_id, name, category, thumbnail_url)
decks         (id, event_id, archetype_id, player, result, main_deck jsonb, sideboard jsonb)
meta_snapshots(id, archetype_id, window, pct, deck_count, tier, snapshot_date)
card_presence (id, card_name, archetype_id, window, avg_copies, pct_of_decks, snapshot_date)
cards         (scryfall_id, name, image_uris jsonb, prices jsonb, mana_cost, type_line, set_code)
alerts        (id, type, message, archetype_id, card_name, delta, detected_at)
```

---



## Fases del proyecto



### Fase 1 — Scraper + Supabase (post-PoC, semana 1-2)

Script Python que extrae MTGTop8 + Scryfall bulk data y popula Supabase.

### Fase 2 — GitHub Actions pipeline (semana 2-3)

Cron job diario. Detección automática de alertas (archetype emergente, trending cards).

### Fase 3 — Frontend en Vercel (semana 3-5)

React + Vite consumiendo Supabase directamente.

Rutas:

- `/` → Dashboard: meta snapshot + alertas + trending
- `/tournaments` → Lista con filtros (tipo, fecha)
- `/tournaments/:id` → Detalle del torneo con Top 16
- `/archetypes/:id` → Archetype detail: mazos, cartas más jugadas
- `/deck/:id` → Decklist visual con imágenes Scryfall
- `/compare` → Comparador de listas del mismo archetype
- `/cards` → Trending cards con delta entre ventanas

Componentes clave:

- `MetaChart` — Pie/bar chart de representación por categoría (Recharts)
- `TierList` — Grid de archetypes ordenado por tier con % y flecha de tendencia
- `DecklistViewer` — Lista de cartas con imagen Scryfall en hover
- `DeckDiff` — Diff visual entre dos decklists del mismo archetype
- `TrendingCards` — Tabla de cartas con delta de % entre ventanas
- `AlertBanner` — Notificación de archetype emergente o cambio de meta



### Fase 4 — Post-MVP (a definir)

- Price tracker (Scryfall USD/EUR por carta)
- Historial visual: evolución del meta semana a semana
- Soporte de otros formatos (Pioneer, Modern) — mismo scraper, distinto parámetro `f=`

