## 1. Improve archetype card indicator legibility

- [x] 1.1 Add the non-interactive elliptical vignette overlay to `ArchetypeCard`, positioned above the art `<img>` and below the mana pips / tier badge / trend arrow (`inset: 0`, `pointerEvents: 'none'`, `radial-gradient(ellipse at center, transparent 0 45%, rgba(0,0,0,.5) 100%)`).
- [x] 1.2 Add a hue-matched glow (`box-shadow`) to `TierBadge` — violet T1, cyan T2, faint neutral T3/Otros — preserving the existing backdrop-blur and tint.
- [x] 1.3 Add the matching glow to `TrendIndicator` in its up/down/flat color.
- [x] 1.4 Cover with component tests: overlay is present, non-interactive, and rendered below the badge layer; tier badge and trend arrow carry a box-shadow. Assert structure/presence, not exact pixel values.
