# MetaStack Dashboard — UI Kit

A high-fidelity recreation of the MetaStack metagame dashboard, composed from the design-system
components (`Pill`, `IconButton`, `StatCard`, `ArchetypeCard`, `ManaPips`, `ChangeIndicator`).

## Screens
- **index.html** — the full dashboard: topbar with format switcher, filter sidebar,
  archetype grid (click a card to select/expand-ring it), and the "En Tendencia" trending table.

## Anatomy
- **Topbar**: rotated-diamond logo mark + wordmark, format `Pill`s aligned right.
- **Sidebar** (280px): filter groups (Fecha, Tamaño de eventos, Arquetipo) as selectable rows.
- **Header**: large format title with a baseline-aligned "Últimos 5 días" neon pill; date range in mono; `StatCard` strip on the right.
- **Grid**: `ArchetypeCard`s in `repeat(auto-fill,minmax(248px,1fr))`.
- **Trending**: 5-column grid table with mono numerics and `ChangeIndicator` deltas.

Source of truth: `MetaStack.dc.html` at the project root (the original interactive prototype,
which also includes the expanded deck-list state and the deck modal with MTG Arena export).
